// lib/data/index.ts
//
// Unified data access layer. Every function here first checks whether
// Supabase is configured (env vars present); if so it talks to Supabase,
// otherwise it transparently falls back to the in-memory mock store
// (lib/data/mockStore.ts). All UI code should import from this module only
// — never import mockStore or supabaseClient directly from components/pages.

import { isSupabaseConfigured, CAD_BUCKET } from "../supabaseClient";
import { getServerSupabaseClient } from "../supabase/server";
import {
  mockComponents,
  mockIterations,
  mockLeads,
  mockMachines,
  mockProcess,
  mockProjects,
  mockRecommendations,
  mockReports,
  mockTwin,
  MOCK_USER,
} from "./mockStore";
import {
  Component,
  DigitalTwinSnapshot,
  Iteration,
  IterationStageSelection,
  Lead,
  Machine,
  MechanicalParams,
  MaterialParams,
  ProcessDefinition,
  ProcessStage,
  ProcessType,
  Project,
  Report,
  StageRecommendation,
} from "../types";

export { isSupabaseConfigured };

// ---------------------------------------------------------------------------
// Current user (simplified auth: Supabase email/password or magic link when
// configured, a fixed demo user otherwise).
// ---------------------------------------------------------------------------
export async function getCurrentUser(): Promise<{ id: string; email: string } | null> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return MOCK_USER;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export async function listProjects(userId: string): Promise<Project[]> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockProjects.list(userId);
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Project[];
}

export async function getProject(id: string): Promise<Project | undefined> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockProjects.get(id);
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ?? undefined;
}

export async function createProject(userId: string, name: string, description: string | null): Promise<Project> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockProjects.create(userId, name, description);
  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: userId, name, description })
    .select("*")
    .single();
  if (error) throw error;
  return data as Project;
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
export async function listComponents(projectId: string): Promise<Component[]> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockComponents.listByProject(projectId);
  const { data, error } = await supabase
    .from("components")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Component[];
}

export async function getComponent(id: string): Promise<Component | undefined> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockComponents.get(id);
  const { data, error } = await supabase.from("components").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ?? undefined;
}

export async function createComponent(input: {
  project_id: string;
  name: string;
  cad_file_path: string | null;
  cad_file_name: string | null;
  material: MaterialParams;
  mechanical: MechanicalParams;
}): Promise<Component> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockComponents.create(input);
  const { data, error } = await supabase.from("components").insert(input).select("*").single();
  if (error) throw error;
  return data as Component;
}

/** Uploads a CAD reference file to Supabase Storage; returns the storage path. No-op stub in mock mode. */
export async function uploadCadFile(userId: string, file: File): Promise<{ path: string | null; name: string }> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) {
    // Mock mode: nothing is actually persisted; we just remember the file name.
    return { path: null, name: file.name };
  }
  const path = `${userId}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from(CAD_BUCKET).upload(path, file);
  if (error) throw error;
  return { path, name: file.name };
}

// ---------------------------------------------------------------------------
// Process definitions & stages
// ---------------------------------------------------------------------------
export async function createProcessDefinition(componentId: string, rawText: string): Promise<ProcessDefinition> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockProcess.createDefinition(componentId, rawText);
  const { data, error } = await supabase
    .from("process_definitions")
    .insert({ component_id: componentId, raw_text: rawText })
    .select("*")
    .single();
  if (error) throw error;
  return data as ProcessDefinition;
}

export async function getProcessDefinition(id: string): Promise<ProcessDefinition | undefined> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockProcess.getDefinition(id);
  const { data, error } = await supabase.from("process_definitions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ?? undefined;
}

export async function latestDefinitionForComponent(componentId: string): Promise<ProcessDefinition | undefined> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockProcess.latestDefinitionForComponent(componentId);
  const { data, error } = await supabase
    .from("process_definitions")
    .select("*")
    .eq("component_id", componentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? undefined;
}

export async function saveProcessStages(
  definitionId: string,
  stages: { sequence: number; stage_type: ProcessType; name: string; description: string; matched_keywords: string[] }[]
): Promise<ProcessStage[]> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockProcess.saveStages(definitionId, stages);
  await supabase.from("process_stages").delete().eq("process_definition_id", definitionId);
  const { data, error } = await supabase
    .from("process_stages")
    .insert(stages.map((s) => ({ ...s, process_definition_id: definitionId })))
    .select("*");
  if (error) throw error;
  return (data as ProcessStage[]).sort((a, b) => a.sequence - b.sequence);
}

export async function listProcessStages(definitionId: string): Promise<ProcessStage[]> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockProcess.listStages(definitionId);
  const { data, error } = await supabase
    .from("process_stages")
    .select("*")
    .eq("process_definition_id", definitionId)
    .order("sequence", { ascending: true });
  if (error) throw error;
  return data as ProcessStage[];
}

export async function getProcessStage(id: string): Promise<ProcessStage | undefined> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockProcess.getStage(id);
  const { data, error } = await supabase.from("process_stages").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ?? undefined;
}

// ---------------------------------------------------------------------------
// Machines
// ---------------------------------------------------------------------------
export async function listMachines(): Promise<Machine[]> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockMachines.list();
  const { data, error } = await supabase.from("machines").select("*");
  if (error) throw error;
  return data as Machine[];
}

export async function listMachinesByProcessType(type: ProcessType): Promise<Machine[]> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockMachines.listByProcessType(type);
  const { data, error } = await supabase.from("machines").select("*").eq("process_type", type);
  if (error) throw error;
  return data as Machine[];
}

export async function getMachine(id: string): Promise<Machine | undefined> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockMachines.get(id);
  const { data, error } = await supabase.from("machines").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ?? undefined;
}

// ---------------------------------------------------------------------------
// Stage recommendations
// ---------------------------------------------------------------------------
export async function saveStageRecommendations(
  stageId: string,
  recs: { machine_id: string; score: number; breakdown: StageRecommendation["breakdown"] }[]
): Promise<StageRecommendation[]> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockRecommendations.save(stageId, recs);
  await supabase.from("stage_recommendations").delete().eq("process_stage_id", stageId);
  const { data, error } = await supabase
    .from("stage_recommendations")
    .insert(recs.map((r) => ({ process_stage_id: stageId, ...r })))
    .select("*");
  if (error) throw error;
  return data as StageRecommendation[];
}

export async function listStageRecommendations(stageId: string): Promise<StageRecommendation[]> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockRecommendations.listByStage(stageId);
  const { data, error } = await supabase
    .from("stage_recommendations")
    .select("*")
    .eq("process_stage_id", stageId)
    .order("score", { ascending: false });
  if (error) throw error;
  return data as StageRecommendation[];
}

// ---------------------------------------------------------------------------
// Iterations
// ---------------------------------------------------------------------------
export async function createIteration(input: {
  project_id: string;
  component_id: string;
  process_definition_id: string;
  name: string;
  status: "draft" | "final";
  avg_score: number;
  est_cycle_time_min: number;
  est_cost_usd: number;
}): Promise<Iteration> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockIterations.create(input);
  const { data, error } = await supabase.from("iterations").insert(input).select("*").single();
  if (error) throw error;
  return data as Iteration;
}

export async function listIterations(projectId: string): Promise<Iteration[]> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockIterations.listByProject(projectId);
  const { data, error } = await supabase
    .from("iterations")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Iteration[];
}

export async function getIteration(id: string): Promise<Iteration | undefined> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockIterations.get(id);
  const { data, error } = await supabase.from("iterations").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ?? undefined;
}

export async function saveIterationSelections(
  iterationId: string,
  selections: { process_stage_id: string; machine_id: string; sequence: number; score: number }[]
): Promise<IterationStageSelection[]> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockIterations.saveSelections(iterationId, selections);
  await supabase.from("iteration_stage_selections").delete().eq("iteration_id", iterationId);
  const { data, error } = await supabase
    .from("iteration_stage_selections")
    .insert(selections.map((s) => ({ ...s, iteration_id: iterationId })))
    .select("*");
  if (error) throw error;
  return (data as IterationStageSelection[]).sort((a, b) => a.sequence - b.sequence);
}

export async function listIterationSelections(iterationId: string): Promise<IterationStageSelection[]> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockIterations.listSelections(iterationId);
  const { data, error } = await supabase
    .from("iteration_stage_selections")
    .select("*")
    .eq("iteration_id", iterationId)
    .order("sequence", { ascending: true });
  if (error) throw error;
  return data as IterationStageSelection[];
}

// ---------------------------------------------------------------------------
// Digital twin (simulated telemetry)
// ---------------------------------------------------------------------------
export async function generateTwinSnapshots(
  iterationId: string,
  selections: IterationStageSelection[]
): Promise<DigitalTwinSnapshot[]> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockTwin.generateSnapshots(iterationId, selections);
  const statuses = ["running", "running", "running", "idle", "maintenance", "fault"];
  const rows = selections.map((sel) => {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    return {
      machine_id: sel.machine_id,
      iteration_id: iterationId,
      process_stage_id: sel.process_stage_id,
      utilization_pct: Math.round((status === "idle" ? Math.random() * 20 : 40 + Math.random() * 58) * 10) / 10,
      cycle_time_min: Math.round((5 + Math.random() * 55) * 10) / 10,
      status,
      last_maintenance: new Date(Date.now() - Math.floor(Math.random() * 60) * 86400000).toISOString(),
    };
  });
  const { data, error } = await supabase.from("digital_twin_snapshots").insert(rows).select("*");
  if (error) throw error;
  return data as DigitalTwinSnapshot[];
}

export async function listTwinSnapshots(iterationId: string): Promise<DigitalTwinSnapshot[]> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockTwin.listByIteration(iterationId);
  const { data, error } = await supabase
    .from("digital_twin_snapshots")
    .select("*")
    .eq("iteration_id", iterationId)
    .order("captured_at", { ascending: false });
  if (error) throw error;
  return data as DigitalTwinSnapshot[];
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export async function createReport(input: {
  iteration_id: string;
  title: string;
  content: Record<string, unknown>;
}): Promise<Report> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockReports.create(input);
  const { data, error } = await supabase.from("reports").insert(input).select("*").single();
  if (error) throw error;
  return data as Report;
}

export async function getReportByIteration(iterationId: string): Promise<Report | undefined> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockReports.getByIteration(iterationId);
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("iteration_id", iterationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? undefined;
}

// ---------------------------------------------------------------------------
// Leads (public marketing landing page submissions). Unlike everything
// else in this module, this is a write-only path from the app's
// perspective: the anon INSERT RLS policy allows it, but there is
// intentionally no SELECT policy, so leads are never read back here.
// ---------------------------------------------------------------------------
export async function createLead(input: {
  name: string;
  email: string;
  company: string | null;
  role: string | null;
  message: string | null;
}): Promise<Lead> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockLeads.create({ ...input, source: "landing_page" });
  // Deliberately no `.select()` here: the leads table has an INSERT-only
  // RLS policy for the anon/authenticated roles and no SELECT policy, so a
  // `RETURNING`/select-after-insert would come back empty (or error) under
  // RLS. We just insert and synthesize the return value client-side.
  const { error } = await supabase.from("leads").insert({ ...input, source: "landing_page" });
  if (error) throw error;
  return {
    id: "",
    created_at: new Date().toISOString(),
    source: "landing_page",
    ...input,
  };
}
