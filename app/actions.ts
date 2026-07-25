"use server";

// Server actions: the single place where forms mutate data. Keeping all
// mutations here (rather than scattering fetch calls through client
// components) keeps the data layer swap (mock <-> Supabase) transparent to
// the UI, and lets every form work with plain HTML <form action={...}>.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth";
import {
  createComponent,
  createIteration,
  createLead,
  createProcessDefinition,
  createProject,
  createReport,
  generateTwinSnapshots,
  getComponent,
  getIteration,
  listIterationSelections,
  listMachines,
  listMachinesByProcessType,
  saveIterationSelections,
  saveProcessStages,
  saveStageRecommendations,
  uploadCadFile,
} from "@/lib/data";
import { parseProcessText, ParsedStage } from "@/lib/processParser";
import { rankMachines } from "@/lib/scoring";
import { estimateStage, sumEstimates } from "@/lib/estimate";
import { MaterialParams, MechanicalParams, ProcessType } from "@/lib/types";

export async function createProjectAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) throw new Error("Project name is required");
  const project = await createProject(userId, name, description || null);
  revalidatePath("/dashboard");
  redirect(`/projects/${project.id}`);
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

  const component = await createComponent({
    project_id: projectId,
    name,
    cad_file_path,
    cad_file_name,
    material,
    mechanical,
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
  const others = current.filter((s) => s.process_stage_id !== stageId);
  const updated = [...others, { process_stage_id: stageId, machine_id: machineId, sequence, score }];

  await saveIterationSelections(iterationId, updated);

  // Aggregate score/time/cost are recomputed on-the-fly by the view pages
  // (see app/projects/[projectId]/iterations/[iterationId]/*) from the
  // current selections, so no further write is needed here.

  revalidatePath(`/projects/${projectId}/iterations/${iterationId}/recommendations`);
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
