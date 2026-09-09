// Core domain types shared by the mock data layer and the Supabase-backed
// data layer. Keeping these in one place lets lib/data/* swap backends
// without changing any UI code.

export type ProcessType =
  | "cutting"
  | "turning"
  | "milling"
  | "drilling"
  | "grinding"
  | "forming_stamping"
  | "welding_joining"
  | "casting"
  | "injection_molding"
  | "additive_3d_printing"
  | "heat_treatment"
  | "surface_finishing_coating"
  | "inspection_qa"
  | "assembly"
  | "packaging";

export const PROCESS_TYPE_LABELS: Record<ProcessType, string> = {
  cutting: "Cutting / Sawing",
  turning: "Turning",
  milling: "CNC Milling",
  drilling: "Drilling",
  grinding: "Grinding",
  forming_stamping: "Forming / Stamping",
  welding_joining: "Welding / Joining",
  casting: "Casting",
  injection_molding: "Injection Molding",
  additive_3d_printing: "Additive / 3D Printing",
  heat_treatment: "Heat Treatment",
  surface_finishing_coating: "Surface Finishing / Coating",
  inspection_qa: "Inspection / QA",
  assembly: "Assembly",
  packaging: "Packaging",
};

export const PROCESS_TYPE_ORDER: ProcessType[] = [
  "cutting",
  "turning",
  "milling",
  "drilling",
  "grinding",
  "forming_stamping",
  "welding_joining",
  "casting",
  "injection_molding",
  "additive_3d_printing",
  "heat_treatment",
  "surface_finishing_coating",
  "inspection_qa",
  "assembly",
  "packaging",
];

export type CostTier = "low" | "medium" | "high" | "premium";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaterialParams {
  material_name: string;
  tensile_strength_mpa: number;
  yield_strength_mpa: number;
  hardness_hb: number; // Brinell hardness
  density_g_cm3: number;
}

export interface MechanicalParams {
  length_mm: number;
  width_mm: number;
  height_mm: number;
  weight_kg: number;
  tolerance_mm: number; // tightest required tolerance
  surface_finish_ra_um: number; // Ra roughness in micrometers
}

export interface Component {
  id: string;
  project_id: string;
  name: string;
  cad_file_path: string | null;
  cad_file_name: string | null;
  material: MaterialParams;
  mechanical: MechanicalParams;
  // Auto-suggested process description from lib/cadParser.ts, pre-filled
  // (but always editable/clearable) on the process-definition step. Null
  // when no CAD file was parsed, parsing found nothing usable, or the
  // user is entering the process manually from scratch.
  suggested_process_text: string | null;
  created_at: string;
}

export interface ProcessDefinition {
  id: string;
  component_id: string;
  raw_text: string;
  created_at: string;
}

export interface ProcessStage {
  id: string;
  process_definition_id: string;
  sequence: number;
  stage_type: ProcessType;
  name: string;
  description: string;
  matched_keywords: string[];
}

export interface MachineSpecs {
  // Common
  power_kw?: number;
  work_envelope_mm?: { x: number; y: number; z: number };
  tolerance_capability_mm?: number;
  max_part_weight_kg?: number;
  throughput_parts_per_hour?: number;
  // Material capability range this machine is suited for
  material_hardness_range_hb?: [number, number];
  material_tensile_range_mpa?: [number, number];
  surface_finish_capability_ra_um?: number;
  // Machining specific
  spindle_speed_rpm?: number;
  axes?: number;
  // Additive specific
  build_volume_mm?: { x: number; y: number; z: number };
  layer_resolution_um?: number;
  // Notes
  notes?: string;
}

export interface Machine {
  id: string;
  name: string;
  manufacturer: string;
  process_type: ProcessType;
  specs: MachineSpecs;
  cost_tier: CostTier;
  est_hourly_rate_usd: number;
  created_at: string;
}

export interface ScoreBreakdown {
  label: string;
  weight: number;
  score: number; // 0-100 sub-score
  detail: string;
}

export interface StageRecommendation {
  id: string;
  process_stage_id: string;
  machine_id: string;
  score: number; // 0-100
  breakdown: ScoreBreakdown[];
  created_at: string;
}

export type IterationStatus = "draft" | "final";

export interface Iteration {
  id: string;
  project_id: string;
  component_id: string;
  process_definition_id: string;
  name: string;
  status: IterationStatus;
  avg_score: number;
  est_cycle_time_min: number;
  est_cost_usd: number;
  created_at: string;
  // Line layout / capacity-planning configuration (see lib/lineCapacity.ts
  // and app/projects/[projectId]/iterations/[iterationId]/line/page.tsx).
  layout_type: string | null;
  buffer_minutes: number;
  variant_count: number;
}

export interface IterationStageSelection {
  id: string;
  iteration_id: string;
  process_stage_id: string;
  machine_id: string;
  sequence: number;
  score: number;
}

export type TwinStatus = "running" | "idle" | "maintenance" | "fault";

export interface DigitalTwinSnapshot {
  id: string;
  machine_id: string;
  iteration_id: string;
  process_stage_id: string;
  utilization_pct: number;
  cycle_time_min: number;
  status: TwinStatus;
  last_maintenance: string;
  captured_at: string;
}

export interface Report {
  id: string;
  iteration_id: string;
  title: string;
  content: Record<string, unknown>;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  role: string | null;
  message: string | null;
  source: string;
  created_at: string;
}
