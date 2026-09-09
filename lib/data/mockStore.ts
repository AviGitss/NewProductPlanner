// lib/data/mockStore.ts
//
// In-memory mock data layer used whenever Supabase env vars are not
// configured. Implements the same shape of operations as the Supabase
// repository (lib/data/index.ts) so the rest of the app can be written
// against one API regardless of backend. State lives in module-level
// variables, so it persists for the lifetime of the Node process (i.e. for
// a `next dev` session) but resets on server restart — sufficient for a
// fully-browsable offline demo.

import { v4 as uuid } from "uuid";
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
  Project,
  Report,
  StageRecommendation,
  TwinStatus,
} from "../types";
import { MACHINE_CATALOG } from "./machineCatalog";

export const MOCK_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "demo@mfgplan.local",
};

const now = () => new Date().toISOString();

const db = {
  projects: new Map<string, Project>(),
  components: new Map<string, Component>(),
  processDefinitions: new Map<string, ProcessDefinition>(),
  processStages: new Map<string, ProcessStage>(),
  machines: new Map<string, Machine>(),
  stageRecommendations: new Map<string, StageRecommendation>(),
  iterations: new Map<string, Iteration>(),
  iterationSelections: new Map<string, IterationStageSelection>(),
  twinSnapshots: new Map<string, DigitalTwinSnapshot>(),
  reports: new Map<string, Report>(),
  leads: new Map<string, Lead>(),
};

let seeded = false;

function seedMachinesIfNeeded() {
  if (seeded) return;
  seeded = true;
  for (const m of MACHINE_CATALOG) {
    const id = uuid();
    db.machines.set(id, { ...m, id, created_at: now() });
  }
}
seedMachinesIfNeeded();

function seedDemoProjectIfNeeded() {
  if (db.projects.size > 0) return;
  const projectId = uuid();
  db.projects.set(projectId, {
    id: projectId,
    user_id: MOCK_USER.id,
    name: "Bracket Line Rollout",
    description: "Sample project pre-loaded for demo purposes.",
    created_at: now(),
    updated_at: now(),
  });

  const componentId = uuid();
  const material: MaterialParams = {
    material_name: "Aluminum 6061-T6",
    tensile_strength_mpa: 310,
    yield_strength_mpa: 276,
    hardness_hb: 95,
    density_g_cm3: 2.7,
  };
  const mechanical: MechanicalParams = {
    length_mm: 220,
    width_mm: 120,
    height_mm: 40,
    weight_kg: 1.8,
    tolerance_mm: 0.05,
    surface_finish_ra_um: 1.6,
  };
  db.components.set(componentId, {
    id: componentId,
    project_id: projectId,
    name: "Mounting Bracket Rev C",
    cad_file_path: null,
    cad_file_name: "bracket_rev_c.step",
    material,
    mechanical,
    suggested_process_text: null,
    created_at: now(),
  });

  const pdId = uuid();
  const rawText =
    "Cut the aluminum blank to size, then CNC mill the pockets and mounting holes, drill and tap the fastener holes, deburr the edges, then anodize, then inspect critical dimensions, then assemble the hardware, then package for shipment.";
  db.processDefinitions.set(pdId, {
    id: pdId,
    component_id: componentId,
    raw_text: rawText,
    created_at: now(),
  });
}
seedDemoProjectIfNeeded();

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export const mockProjects = {
  list(userId: string): Project[] {
    return Array.from(db.projects.values())
      .filter((p) => p.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  get(id: string): Project | undefined {
    return db.projects.get(id);
  },
  create(userId: string, name: string, description: string | null): Project {
    const id = uuid();
    const project: Project = {
      id,
      user_id: userId,
      name,
      description,
      created_at: now(),
      updated_at: now(),
    };
    db.projects.set(id, project);
    return project;
  },
  remove(id: string) {
    db.projects.delete(id);
  },
};

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
export const mockComponents = {
  listByProject(projectId: string): Component[] {
    return Array.from(db.components.values())
      .filter((c) => c.project_id === projectId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  get(id: string): Component | undefined {
    return db.components.get(id);
  },
  create(input: Omit<Component, "id" | "created_at">): Component {
    const id = uuid();
    const component: Component = { ...input, id, created_at: now() };
    db.components.set(id, component);
    return component;
  },
};

// ---------------------------------------------------------------------------
// Process definitions & stages
// ---------------------------------------------------------------------------
export const mockProcess = {
  createDefinition(componentId: string, rawText: string): ProcessDefinition {
    const id = uuid();
    const def: ProcessDefinition = {
      id,
      component_id: componentId,
      raw_text: rawText,
      created_at: now(),
    };
    db.processDefinitions.set(id, def);
    return def;
  },
  getDefinition(id: string): ProcessDefinition | undefined {
    return db.processDefinitions.get(id);
  },
  latestDefinitionForComponent(componentId: string): ProcessDefinition | undefined {
    return Array.from(db.processDefinitions.values())
      .filter((d) => d.component_id === componentId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  },
  saveStages(definitionId: string, stages: Omit<ProcessStage, "id" | "process_definition_id" | "created_at">[]): ProcessStage[] {
    // Clear existing stages for this definition, then insert fresh ones.
    for (const [key, val] of db.processStages) {
      if (val.process_definition_id === definitionId) db.processStages.delete(key);
    }
    const saved: ProcessStage[] = [];
    for (const s of stages) {
      const id = uuid();
      const stage: ProcessStage = { ...s, id, process_definition_id: definitionId, created_at: now() } as ProcessStage;
      db.processStages.set(id, stage);
      saved.push(stage);
    }
    return saved.sort((a, b) => a.sequence - b.sequence);
  },
  listStages(definitionId: string): ProcessStage[] {
    return Array.from(db.processStages.values())
      .filter((s) => s.process_definition_id === definitionId)
      .sort((a, b) => a.sequence - b.sequence);
  },
  getStage(id: string): ProcessStage | undefined {
    return db.processStages.get(id);
  },
};

// ---------------------------------------------------------------------------
// Machines
// ---------------------------------------------------------------------------
export const mockMachines = {
  list(): Machine[] {
    return Array.from(db.machines.values());
  },
  get(id: string): Machine | undefined {
    return db.machines.get(id);
  },
  listByProcessType(type: string): Machine[] {
    return Array.from(db.machines.values()).filter((m) => m.process_type === type);
  },
};

// ---------------------------------------------------------------------------
// Stage recommendations (cached scoring results)
// ---------------------------------------------------------------------------
export const mockRecommendations = {
  save(stageId: string, recs: { machine_id: string; score: number; breakdown: StageRecommendation["breakdown"] }[]) {
    for (const [key, val] of db.stageRecommendations) {
      if (val.process_stage_id === stageId) db.stageRecommendations.delete(key);
    }
    const saved: StageRecommendation[] = [];
    for (const r of recs) {
      const id = uuid();
      const rec: StageRecommendation = {
        id,
        process_stage_id: stageId,
        machine_id: r.machine_id,
        score: r.score,
        breakdown: r.breakdown,
        created_at: now(),
      };
      db.stageRecommendations.set(id, rec);
      saved.push(rec);
    }
    return saved;
  },
  listByStage(stageId: string): StageRecommendation[] {
    return Array.from(db.stageRecommendations.values())
      .filter((r) => r.process_stage_id === stageId)
      .sort((a, b) => b.score - a.score);
  },
};

// ---------------------------------------------------------------------------
// Iterations
// ---------------------------------------------------------------------------
export const mockIterations = {
  create(input: Omit<Iteration, "id" | "created_at" | "layout_type" | "buffer_minutes" | "variant_count">): Iteration {
    const id = uuid();
    // Line-layout config defaults match the Supabase migration's column
    // defaults (buffer_minutes: 5, variant_count: 1, layout_type: null) so
    // mock mode behaves identically to a fresh real-DB row.
    const iteration: Iteration = {
      ...input,
      id,
      created_at: now(),
      layout_type: null,
      buffer_minutes: 5,
      variant_count: 1,
    };
    db.iterations.set(id, iteration);
    return iteration;
  },
  listByProject(projectId: string): Iteration[] {
    return Array.from(db.iterations.values())
      .filter((i) => i.project_id === projectId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  get(id: string): Iteration | undefined {
    return db.iterations.get(id);
  },
  updateLineConfig(
    id: string,
    config: { layout_type: string | null; buffer_minutes: number; variant_count: number }
  ): Iteration | undefined {
    const existing = db.iterations.get(id);
    if (!existing) return undefined;
    const updated: Iteration = { ...existing, ...config };
    db.iterations.set(id, updated);
    return updated;
  },
  saveSelections(iterationId: string, selections: Omit<IterationStageSelection, "id" | "iteration_id">[]) {
    for (const [key, val] of db.iterationSelections) {
      if (val.iteration_id === iterationId) db.iterationSelections.delete(key);
    }
    const saved: IterationStageSelection[] = [];
    for (const s of selections) {
      const id = uuid();
      const sel: IterationStageSelection = { ...s, id, iteration_id: iterationId };
      db.iterationSelections.set(id, sel);
      saved.push(sel);
    }
    return saved.sort((a, b) => a.sequence - b.sequence);
  },
  listSelections(iterationId: string): IterationStageSelection[] {
    return Array.from(db.iterationSelections.values())
      .filter((s) => s.iteration_id === iterationId)
      .sort((a, b) => a.sequence - b.sequence);
  },
};

// ---------------------------------------------------------------------------
// Digital twin snapshots (simulated telemetry)
// ---------------------------------------------------------------------------
const STATUSES: TwinStatus[] = ["running", "running", "running", "idle", "maintenance", "fault"];

export const mockTwin = {
  generateSnapshots(iterationId: string, selections: IterationStageSelection[]): DigitalTwinSnapshot[] {
    const snapshots: DigitalTwinSnapshot[] = [];
    for (const sel of selections) {
      const id = uuid();
      const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
      const snapshot: DigitalTwinSnapshot = {
        id,
        machine_id: sel.machine_id,
        iteration_id: iterationId,
        process_stage_id: sel.process_stage_id,
        utilization_pct: Math.round((status === "idle" ? Math.random() * 20 : 40 + Math.random() * 58) * 10) / 10,
        cycle_time_min: Math.round((5 + Math.random() * 55) * 10) / 10,
        status,
        last_maintenance: new Date(Date.now() - Math.floor(Math.random() * 60) * 86400000).toISOString(),
        captured_at: now(),
      };
      db.twinSnapshots.set(id, snapshot);
      snapshots.push(snapshot);
    }
    return snapshots;
  },
  listByIteration(iterationId: string): DigitalTwinSnapshot[] {
    return Array.from(db.twinSnapshots.values())
      .filter((s) => s.iteration_id === iterationId)
      .sort((a, b) => b.captured_at.localeCompare(a.captured_at));
  },
};

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export const mockReports = {
  create(input: Omit<Report, "id" | "created_at">): Report {
    const id = uuid();
    const report: Report = { ...input, id, created_at: now() };
    db.reports.set(id, report);
    return report;
  },
  getByIteration(iterationId: string): Report | undefined {
    return Array.from(db.reports.values())
      .filter((r) => r.iteration_id === iterationId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  },
};

// ---------------------------------------------------------------------------
// Leads (public marketing landing page submissions)
// ---------------------------------------------------------------------------
export const mockLeads = {
  create(input: Omit<Lead, "id" | "created_at">): Lead {
    const id = uuid();
    const lead: Lead = { ...input, id, created_at: now() };
    db.leads.set(id, lead);
    // No admin UI for leads in mock mode; log so they're visible in dev.
    console.log("[mock] new lead captured:", lead);
    return lead;
  },
};
