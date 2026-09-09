"use server";

// Server actions: the single place where forms mutate data. Keeping all
// mutations here (rather than scattering fetch calls through client
// components) keeps the data layer swap (mock <-> Supabase) transparent to
// the UI, and lets every form work with plain HTML <form action={...}>.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUserId, getCurrentUserContext } from "@/lib/auth";
import { requireRole, canManageCompany } from "@/lib/rbac";
import { inviteEmail, rfpStageHandoffEmail, sendEmail } from "@/lib/email";
import { RfpStage, RFP_STAGE_LABELS, RFP_STAGE_OWNER, canAdvanceFromStage, nextStage } from "@/lib/rfpWorkflow";
import {
  addRfpDocument,
  advanceProjectStage,
  bulkCreateMasterEquipment,
  bulkCreateMasterMaterials,
  createCompanyWithAdmin,
  createComponent,
  createIteration,
  createLead,
  createProcessDefinition,
  createProcurementSuggestion,
  createProject,
  createReport,
  deleteProject,
  generateTwinSnapshots,
  getComponent,
  getIteration,
  getProject,
  inviteCompanyMember,
  listCompanyMembers,
  listIterationSelections,
  listMachines,
  listMachinesByProcessType,
  removeCompanyMember,
  saveIterationSelections,
  saveProcessStages,
  saveStageRecommendations,
  updateIterationLineConfig,
  updateMemberRole,
  upsertProductionCapacity,
  uploadCadFile,
} from "@/lib/data";
import { RfpDocumentKind } from "@/lib/types";
import { parseProcessText, ParsedStage } from "@/lib/processParser";
import { parseCadFile, CadExtractionResult } from "@/lib/cadParser";
import { rankMachines } from "@/lib/scoring";
import { PROCESS_TYPE_LABELS } from "@/lib/types";
import { estimateStage, sumEstimates } from "@/lib/estimate";
import { MaterialParams, MechanicalParams, ProcessType } from "@/lib/types";

export async function createProjectAction(formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) redirect("/register-company");
  requireRole(ctx, ["admin", "sales", "rfp_prep"], "start a new RFP/project");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) throw new Error("Project name is required");
  const project = await createProject(ctx.userId, ctx.companyId, name, description || null);
  revalidatePath("/dashboard");
  redirect(`/projects/${project.id}`);
}

/** Registers a brand-new company for a signed-in user who doesn't belong to one yet. */
export async function registerCompanyAction(formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (ctx.companyId) redirect("/dashboard"); // already belongs to a company
  const name = String(formData.get("company_name") ?? "").trim();
  if (!name) throw new Error("Company name is required");
  await createCompanyWithAdmin(ctx.userId, ctx.email, name);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/** Admin-only: invite a teammate by email with a starting role (see lib/rbac.ts for what each role can do). */
export async function inviteCompanyMemberAction(formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) throw new Error("You don't belong to a company yet.");
  requireRole(ctx, ["admin"], "invite teammates");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "viewer") as Parameters<typeof inviteCompanyMember>[2];
  if (!email) throw new Error("Email is required");
  await inviteCompanyMember(ctx.companyId, email, role);

  const { ROLE_LABELS } = await import("@/lib/rbac");
  const { getCompany } = await import("@/lib/data");
  const companyRecord = await getCompany(ctx.companyId);
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://newline.opennetrikkan.com"}/login`;
  const { subject, html } = inviteEmail({ companyName: companyRecord?.name ?? "your team", roleLabel: ROLE_LABELS[role], loginUrl });
  await sendEmail({ to: email, subject, html });

  revalidatePath("/company/team");
}

/** Moves an RFP to its next workflow stage, logs the transition, and emails whichever role now owns the new stage. */
export async function advanceRfpStageAction(projectId: string, formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) throw new Error("You don't belong to a company yet.");
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");
  if (!canAdvanceFromStage(ctx.role, project.rfp_stage)) {
    throw new Error(`Only ${RFP_STAGE_OWNER[project.rfp_stage] ?? "an admin"} (or an admin) can move this RFP out of ${RFP_STAGE_LABELS[project.rfp_stage]}.`);
  }
  const explicitTarget = formData.get("to_stage");
  const toStage = (explicitTarget ? String(explicitTarget) : nextStage(project.rfp_stage)) as RfpStage | null;
  if (!toStage) throw new Error("This RFP has no further stage to advance to.");
  const note = String(formData.get("note") ?? "").trim() || undefined;

  await advanceProjectStage(projectId, ctx.userId, toStage, note);

  // Notify whichever role now owns the new stage.
  const owner = RFP_STAGE_OWNER[toStage];
  if (owner) {
    const members = await listCompanyMembers(ctx.companyId);
    const targets = members.filter((m) => m.role === owner && m.status === "active" && m.invited_email);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://newline.opennetrikkan.com";
    const { subject, html } = rfpStageHandoffEmail({
      projectName: project.name,
      stageLabel: RFP_STAGE_LABELS[toStage],
      actionUrl: `${appUrl}/projects/${projectId}`,
      note,
    });
    await Promise.all(targets.map((m) => sendEmail({ to: m.invited_email as string, subject, html })));
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/sales/dashboard");
}

/** Production role fills this in as their contribution to the RFP workflow. */
export async function submitProductionCapacityAction(projectId: string, formData: FormData) {
  const ctx = await getCurrentUserContext();
  requireRole(ctx, ["admin", "production"], "submit production capacity data");
  await upsertProductionCapacity({
    project_id: projectId,
    available_lines: formData.get("available_lines") ? Number(formData.get("available_lines")) : null,
    shifts_per_day: formData.get("shifts_per_day") ? Number(formData.get("shifts_per_day")) : null,
    hours_per_shift: formData.get("hours_per_shift") ? Number(formData.get("hours_per_shift")) : null,
    oee_pct: formData.get("oee_pct") ? Number(formData.get("oee_pct")) : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    submitted_by: ctx.userId,
  });
  revalidatePath(`/projects/${projectId}`);
}

/** Manual upload path for CAD files, RFP paperwork, historical-proposal references, and AutoForm result exports — configured per-RFP by whoever preps it. */
export async function uploadRfpDocumentAction(projectId: string, formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) throw new Error("You don't belong to a company yet.");
  const file = formData.get("file");
  if (!file || !(file instanceof File) || file.size === 0) throw new Error("Choose a file first.");
  const kind = String(formData.get("kind") ?? "other") as RfpDocumentKind;
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  await addRfpDocument(projectId, ctx.userId, kind, file, notes);
  revalidatePath(`/projects/${projectId}`);
}

/** Admin/rfp_prep-only: bulk-loads the company's master equipment list from a parsed CSV (see components/MasterDataUpload.tsx for the client-side parse). */
export async function uploadMasterEquipmentAction(rows: { name: string; process_type: string; specs: Record<string, unknown> }[]) {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) throw new Error("You don't belong to a company yet.");
  requireRole(ctx, ["admin", "rfp_prep"], "upload the master equipment list");
  await bulkCreateMasterEquipment(ctx.companyId, rows);
  revalidatePath("/company/master-data");
}

export async function uploadMasterMaterialsAction(
  rows: { grade_name: string; family: string | null; tensile_strength_mpa: number | null; yield_strength_mpa: number | null; hardness_hb: number | null; density_g_cm3: number | null; typical_lead_time_days: number | null; notes: string | null }[]
) {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) throw new Error("You don't belong to a company yet.");
  requireRole(ctx, ["admin", "rfp_prep"], "upload the master material list");
  await bulkCreateMasterMaterials(ctx.companyId, rows);
  revalidatePath("/company/master-data");
}

export async function updateMemberRoleAction(memberId: string, role: string) {
  const ctx = await getCurrentUserContext();
  requireRole(ctx, ["admin"], "change a teammate's role");
  await updateMemberRole(memberId, role as Parameters<typeof updateMemberRole>[1]);
  revalidatePath("/company/team");
}

export async function removeCompanyMemberAction(memberId: string) {
  const ctx = await getCurrentUserContext();
  requireRole(ctx, ["admin"], "remove a teammate");
  await removeCompanyMember(memberId);
  revalidatePath("/company/team");
}

/** Permanently deletes a project (and, via DB cascade / mock-store filtering, all data derived from it). */
export async function deleteProjectAction(projectId: string) {
  await deleteProject(projectId);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function createComponentAction(projectId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Component name is required");

  const material: MaterialParams = {
    material_name: String(formData.get("material_name") ?? ""),
    tensile_strength_mpa: Number(formData.get("tensile_strength_mpa") ?? 0),
    yield_strength_mpa: Number(formData.get("yield_strength_mpa") ?? 0),
    hardness_hb: Number(formData.get("hardness_hb") ?? 0),
    density_g_cm3: Number(formData.get("density_g_cm3") ?? 0),
  };
  const mechanical: MechanicalParams = {
    length_mm: Number(formData.get("length_mm") ?? 0),
    width_mm: Number(formData.get("width_mm") ?? 0),
    height_mm: Number(formData.get("height_mm") ?? 0),
    weight_kg: Number(formData.get("weight_kg") ?? 0),
    tolerance_mm: Number(formData.get("tolerance_mm") ?? 0.1),
    surface_finish_ra_um: Number(formData.get("surface_finish_ra_um") ?? 3.2),
  };

  let cad_file_path: string | null = null;
  let cad_file_name: string | null = null;
  const file = formData.get("cad_file");
  if (file && file instanceof File && file.size > 0) {
    const result = await uploadCadFile(userId, file);
    cad_file_path = result.path;
    cad_file_name = result.name;
  }

  // Carried over from the (optional) client-side CAD extraction preview —
  // see extractCadSpecsAction below. Empty string is normalized to null so
  // the process page can cleanly check "is there a suggestion or not".
  const suggestedProcessTextRaw = String(formData.get("suggested_process_text") ?? "").trim();

  const component = await createComponent({
    project_id: projectId,
    name,
    cad_file_path,
    cad_file_name,
    material,
    mechanical,
    suggested_process_text: suggestedProcessTextRaw || null,
  });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}/components/${component.id}/process`);
}

/**
 * Runs the NL parser server-side so the client form can preview detected
 * stages before committing. Because this whole file is a "use server"
 * module, this function is directly callable from client components as a
 * Next.js Server Action (no separate API route needed).
 */
export async function parseProcessTextAction(text: string): Promise<ParsedStage[]> {
  return parseProcessText(text);
}

/**
 * Reads an uploaded .dwg/.dxf file and extracts whatever technical
 * specifications (material, tolerance, surface finish, overall
 * dimensions) and process/operation hints it can find — see
 * lib/cadParser.ts for the extraction approach and its honest limits.
 * Called directly from ComponentForm as soon as a file is chosen, so the
 * form can offer to pre-fill itself before the component is even saved.
 * Every other CAD/reference format (step, iges, stl, pdf, images) returns
 * `supported: false` and the form falls back to today's manual-entry-only
 * behavior for those.
 */
export async function extractCadSpecsAction(formData: FormData): Promise<CadExtractionResult> {
  const file = formData.get("cad_file");
  if (!file || !(file instanceof File) || file.size === 0) {
    return {
      supported: false,
      format: "unsupported",
      confidence: "none",
      notes: [],
      suggestedMaterialGradeId: null,
      suggestedToleranceMm: null,
      suggestedSurfaceFinishRaUm: null,
      suggestedDimensions: null,
      suggestedProcessText: null,
      matchedProcessLabels: [],
      rawTextSample: [],
    };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return parseCadFile(buffer, file.name);
}

/**
 * Commits a (possibly user-edited) list of stages: creates the process
 * definition + stages, scores machines per stage, saves recommendations,
 * creates a new draft iteration pre-populated with the top-scoring machine
 * per stage, and redirects to the recommendations view for that iteration.
 */
export async function commitProcessAction(componentId: string, projectId: string, formData: FormData) {
  const rawText = String(formData.get("raw_text") ?? "");
  const stagesJson = String(formData.get("stages_json") ?? "[]");
  const stages: ParsedStage[] = JSON.parse(stagesJson);

  const component = await getComponent(componentId);
  if (!component) throw new Error("Component not found");

  const definition = await createProcessDefinition(componentId, rawText);
  const savedStages = await saveProcessStages(
    definition.id,
    stages.map((s) => ({
      sequence: s.sequence,
      stage_type: s.stage_type,
      name: s.name,
      description: s.description,
      matched_keywords: s.matched_keywords,
    }))
  );

  const selections: { process_stage_id: string; machine_id: string; sequence: number; score: number }[] = [];
  const scores: number[] = [];

  // Below this score, the best-available machine is treated as not really
  // able to do the job — a gap worth flagging for procurement rather than
  // silently picking the "least bad" option (Phase 4 of the platform
  // redesign; see lib/data/index.ts's createProcurementSuggestion).
  const PROCUREMENT_GAP_THRESHOLD = 50;

  for (const stage of savedStages) {
    const candidates = await listMachinesByProcessType(stage.stage_type as ProcessType);
    const ranked = rankMachines(component, candidates);
    await saveStageRecommendations(
      stage.id,
      ranked.map((r) => ({ machine_id: r.machine.id, score: r.score, breakdown: r.breakdown }))
    );
    if (ranked.length > 0) {
      const top = ranked[0];
      selections.push({
        process_stage_id: stage.id,
        machine_id: top.machine.id,
        sequence: stage.sequence,
        score: top.score,
      });
      scores.push(top.score);

      if (top.score < PROCUREMENT_GAP_THRESHOLD) {
        const weakest = [...top.breakdown].sort((a, b) => a.score - b.score)[0];
        await createProcurementSuggestion({
          project_id: projectId,
          process_stage_id: stage.id,
          process_type: stage.stage_type,
          required_specs: {
            tolerance_mm: component.mechanical.tolerance_mm,
            surface_finish_ra_um: component.mechanical.surface_finish_ra_um,
            hardness_hb: component.material.hardness_hb,
            envelope_mm: [component.mechanical.length_mm, component.mechanical.width_mm, component.mechanical.height_mm],
          },
          rationale: `Best available machine for ${PROCESS_TYPE_LABELS[stage.stage_type as ProcessType]} ("${top.machine.name}") only scores ${top.score}% against this part's requirements${weakest ? ` — weakest factor: ${weakest.label} (${weakest.detail})` : ""}. Consider procuring equipment better suited to tolerance ±${component.mechanical.tolerance_mm}mm, Ra ${component.mechanical.surface_finish_ra_um}µm${component.material.hardness_hb ? `, hardness ${component.material.hardness_hb}HB` : ""}.`,
        });
      }
    } else {
      await createProcurementSuggestion({
        project_id: projectId,
        process_stage_id: stage.id,
        process_type: stage.stage_type,
        required_specs: {
          tolerance_mm: component.mechanical.tolerance_mm,
          surface_finish_ra_um: component.mechanical.surface_finish_ra_um,
          hardness_hb: component.material.hardness_hb,
          envelope_mm: [component.mechanical.length_mm, component.mechanical.width_mm, component.mechanical.height_mm],
        },
        rationale: `No machine in the catalog is set up for ${PROCESS_TYPE_LABELS[stage.stage_type as ProcessType]} at all. This stage needs new equipment procured before this RFP's line can be built as planned.`,
      });
    }
  }

  const avgScore = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;

  // Rough cost/time estimate for the auto-selected (top-scoring) config.
  const estimates = [];
  for (const sel of selections) {
    const stage = savedStages.find((s) => s.id === sel.process_stage_id)!;
    const machine = (await listMachines()).find((m) => m.id === sel.machine_id)!;
    estimates.push(estimateStage(machine, stage.stage_type as ProcessType));
  }
  const totals = sumEstimates(estimates);

  const iteration = await createIteration({
    project_id: projectId,
    component_id: componentId,
    process_definition_id: definition.id,
    name: `Iteration - ${new Date().toLocaleString()}`,
    status: "draft",
    avg_score: avgScore,
    est_cycle_time_min: totals.totalCycleTimeMin,
    est_cost_usd: totals.totalCostUsd,
  });

  await saveIterationSelections(iteration.id, selections);

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}/iterations/${iteration.id}/recommendations`);
}

/** Swaps the selected machine for one stage within an iteration, then re-totals the iteration. */
export async function updateStageSelectionAction(
  iterationId: string,
  projectId: string,
  formData: FormData
) {
  const stageId = String(formData.get("stage_id"));
  const machineId = String(formData.get("machine_id"));
  const score = Number(formData.get("score"));
  const sequence = Number(formData.get("sequence"));

  const current = await listIterationSelections(iterationId);
  // Strip `id` from the retained rows: these came back from listIterationSelections
  // with their real row id, but the replacement row below has none. Bulk-inserting
  // a mixed-shape array (some objects with `id`, some without) makes PostgREST union
  // the columns and send an explicit `id: null` for the rows missing it — which then
  // violates the NOT NULL constraint instead of falling back to the column default.
  // Keeping every row in this array uniformly shaped (no `id` key at all) avoids that.
  const others = current
    .filter((s) => s.process_stage_id !== stageId)
    .map(({ id, ...rest }) => rest);
  const updated = [...others, { process_stage_id: stageId, machine_id: machineId, sequence, score }];

  await saveIterationSelections(iterationId, updated);

  // Aggregate score/time/cost are recomputed on-the-fly by the view pages
  // (see app/projects/[projectId]/iterations/[iterationId]/*) from the
  // current selections, so no further write is needed here.

  revalidatePath(`/projects/${projectId}/iterations/${iterationId}/recommendations`);
}

/** Updates line-layout config (layout type, buffer minutes, variant count) for an iteration and recalculates the KPIs on the line page. */
export async function updateLineConfigAction(iterationId: string, projectId: string, formData: FormData) {
  const layoutType = String(formData.get("layout_type") ?? "").trim();
  const bufferMinutes = Number(formData.get("buffer_minutes") ?? 5);
  const variantCount = Number(formData.get("variant_count") ?? 1);

  await updateIterationLineConfig(iterationId, {
    layout_type: layoutType || null,
    buffer_minutes: Number.isFinite(bufferMinutes) && bufferMinutes > 0 ? bufferMinutes : 5,
    variant_count: Number.isFinite(variantCount) && variantCount >= 1 ? Math.round(variantCount) : 1,
  });

  revalidatePath(`/projects/${projectId}/iterations/${iterationId}/line`);
}

export async function finalizeIterationAction(iterationId: string, projectId: string) {
  revalidatePath(`/projects/${projectId}/iterations/${iterationId}`);
  redirect(`/projects/${projectId}/iterations/${iterationId}`);
}

export async function refreshTwinAction(iterationId: string, projectId: string) {
  const selections = await listIterationSelections(iterationId);
  await generateTwinSnapshots(iterationId, selections);
  revalidatePath(`/projects/${projectId}/iterations/${iterationId}/twin`);
}

export async function generateReportAction(iterationId: string, projectId: string, content: Record<string, unknown>) {
  await createReport({ iteration_id: iterationId, title: `MfgPlan Report - ${new Date().toLocaleDateString()}`, content });
  revalidatePath(`/projects/${projectId}/iterations/${iterationId}/report`);
}

/**
 * Lead-capture form submission from the public marketing landing page
 * (app/page.tsx). Callable directly from a client component. Validates the
 * required fields server-side (never trust client-side `required` alone)
 * and returns a plain result object rather than throwing, so the form can
 * show an inline success/error state without a full error boundary.
 */
export type SubmitLeadResult = { ok: true } | { ok: false; error: string };

export async function submitLeadAction(formData: FormData): Promise<SubmitLeadResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name) return { ok: false, error: "Name is required." };
  if (!email) return { ok: false, error: "Work email is required." };
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) return { ok: false, error: "Enter a valid email address." };

  try {
    await createLead({
      name,
      email,
      company: company || null,
      role: role || null,
      message: message || null,
    });
    return { ok: true };
  } catch (err) {
    console.error("submitLeadAction failed:", err);
    return { ok: false, error: "Something went wrong submitting the form. Please try again." };
  }
}
