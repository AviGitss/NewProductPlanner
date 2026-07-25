// lib/scoring.ts
//
// Deterministic, rule-based machine applicability scoring.
//
// GOAL
// Given a process stage (a required manufacturing operation, e.g.
// "CNC Milling") and a component's material + mechanical parameters,
// produce a 0-100% applicability score for every candidate machine whose
// process_type matches the stage. NO LLM CALLS — this is a weighted,
// explainable heuristic so results are reproducible and testable.
//
// SCORING FACTORS (weights sum to 100)
//   1. Process type match          (20%) - binary gate; machine must serve
//                                    the requested process type at all,
//                                    otherwise it is excluded before scoring.
//   2. Material hardness fit       (20%) - is component hardness within the
//                                    machine's rated hardness capability
//                                    range? Partial credit by distance.
//   3. Material tensile fit        (15%) - same idea for tensile strength.
//   4. Tolerance capability        (20%) - can the machine hit the required
//                                    tolerance? Tighter machine capability
//                                    than required is fine (full credit);
//                                    looser capability loses credit fast
//                                    since it's a hard process constraint.
//   5. Work envelope / part fit    (15%) - does the component's bounding
//                                    box and weight fit inside the
//                                    machine's work envelope / max part
//                                    weight?
//   6. Surface finish capability   (10%) - can the machine reach the
//                                    required Ra surface roughness?
//
// Because factor 1 is a hard gate (machines of the wrong process type never
// appear as candidates for a stage), its 20% is folded into the other five
// factors proportionally (i.e. once gated, the remaining 5 factors are
// re-normalized to sum to 100). This keeps scores intuitive: a perfectly
// matched machine scores 100, not 80.
//
// Every sub-score is 0-100 and the final score is the weighted sum, rounded
// to the nearest integer and clamped to [0, 100].

import { Component, Machine, ScoreBreakdown } from "./types";

interface WeightedFactor {
  key: string;
  label: string;
  weight: number; // relative weight, out of the non-gate total (100)
}

const FACTORS: WeightedFactor[] = [
  { key: "hardness", label: "Material hardness fit", weight: 25 },
  { key: "tensile", label: "Material tensile strength fit", weight: 18.75 },
  { key: "tolerance", label: "Tolerance capability", weight: 25 },
  { key: "envelope", label: "Work envelope / part weight fit", weight: 18.75 },
  { key: "finish", label: "Surface finish capability", weight: 12.5 },
];
// Weights above are the original 20/15/20/15/10 renormalized to sum to 100
// after removing the 20-point process-type gate (each divided by 0.8).

/** Score how well `value` fits inside [min, max], with graceful falloff outside the range. */
function rangeFitScore(value: number, range: [number, number] | undefined): { score: number; detail: string } {
  if (!range) return { score: 60, detail: "Machine does not publish a capability range; assumed adequate (default 60%)." };
  const [min, max] = range;
  if (value >= min && value <= max) {
    return { score: 100, detail: `${value} is within machine range [${min}, ${max}].` };
  }
  const span = Math.max(max - min, 1);
  const distance = value < min ? min - value : value - max;
  const penalty = Math.min(100, (distance / span) * 100);
  const score = Math.max(0, 100 - penalty);
  return {
    score,
    detail: `${value} is outside machine range [${min}, ${max}] by ${distance.toFixed(1)}; partial credit applied.`,
  };
}

/** Tolerance: smaller (tighter) machine capability than required is ideal. */
function toleranceScore(requiredMm: number, machineCapabilityMm: number | undefined): { score: number; detail: string } {
  if (!machineCapabilityMm) {
    return { score: 50, detail: "Machine does not publish tolerance capability; assumed moderate (default 50%)." };
  }
  if (machineCapabilityMm <= requiredMm) {
    // Machine is at least as precise as required -> full credit, with a
    // small bonus consideration already folded into the 100 cap.
    return {
      score: 100,
      detail: `Machine capability ±${machineCapabilityMm}mm meets/exceeds required ±${requiredMm}mm.`,
    };
  }
  // Machine is less precise than required: penalize proportionally to how
  // many multiples of the requirement it misses by.
  const ratio = machineCapabilityMm / requiredMm;
  const score = Math.max(0, 100 - (ratio - 1) * 80);
  return {
    score,
    detail: `Machine capability ±${machineCapabilityMm}mm is looser than required ±${requiredMm}mm (ratio ${ratio.toFixed(2)}x).`,
  };
}

function envelopeScore(component: Component, machine: Machine): { score: number; detail: string } {
  const env = machine.specs.work_envelope_mm ?? machine.specs.build_volume_mm;
  const dims = [component.mechanical.length_mm, component.mechanical.width_mm, component.mechanical.height_mm].sort(
    (a, b) => b - a
  );

  let dimScore = 60;
  let dimDetail = "Machine does not publish a work envelope; assumed adequate (default 60%).";
  if (env) {
    const envDims = [env.x, env.y, env.z].sort((a, b) => b - a);
    const fits = dims.every((d, i) => d <= envDims[i]);
    if (fits) {
      // Reward margin, but don't over-reward tiny parts in huge machines
      // (that's often fine but slightly less "purpose built").
      const utilization = dims[0] / envDims[0];
      dimScore = utilization > 0.05 ? 100 : 85;
      dimDetail = `Part bounding box ${dims.join("x")}mm fits within envelope ${envDims.join("x")}mm.`;
    } else {
      const overBy = dims.map((d, i) => Math.max(0, d - envDims[i]));
      const worst = Math.max(...overBy);
      dimScore = Math.max(0, 100 - (worst / Math.max(...envDims)) * 150);
      dimDetail = `Part bounding box ${dims.join("x")}mm exceeds envelope ${envDims.join("x")}mm in at least one axis.`;
    }
  }

  let weightScore = 70;
  let weightDetail = "Machine does not publish max part weight; assumed adequate (default 70%).";
  if (machine.specs.max_part_weight_kg) {
    if (component.mechanical.weight_kg <= machine.specs.max_part_weight_kg) {
      weightScore = 100;
      weightDetail = `Part weight ${component.mechanical.weight_kg}kg is within max ${machine.specs.max_part_weight_kg}kg.`;
    } else {
      const over = component.mechanical.weight_kg - machine.specs.max_part_weight_kg;
      weightScore = Math.max(0, 100 - (over / machine.specs.max_part_weight_kg) * 100);
      weightDetail = `Part weight ${component.mechanical.weight_kg}kg exceeds max ${machine.specs.max_part_weight_kg}kg.`;
    }
  }

  const combined = dimScore * 0.65 + weightScore * 0.35;
  return { score: combined, detail: `${dimDetail} ${weightDetail}` };
}

function finishScore(requiredRa: number, machineRa: number | undefined): { score: number; detail: string } {
  if (!machineRa) {
    return { score: 55, detail: "Machine does not publish surface finish capability; assumed moderate (default 55%)." };
  }
  if (machineRa <= requiredRa) {
    return { score: 100, detail: `Machine finish capability Ra ${machineRa}µm meets/exceeds required Ra ${requiredRa}µm.` };
  }
  const ratio = machineRa / requiredRa;
  const score = Math.max(0, 100 - (ratio - 1) * 70);
  return { score, detail: `Machine finish capability Ra ${machineRa}µm is coarser than required Ra ${requiredRa}µm.` };
}

export interface ScoringResult {
  score: number;
  breakdown: ScoreBreakdown[];
}

/**
 * Computes the applicability score of `machine` for a stage requiring the
 * given `component` parameters. Assumes `machine.process_type` already
 * matches the stage's process type (callers filter candidates first).
 */
export function scoreMachineForComponent(component: Component, machine: Machine): ScoringResult {
  const hardness = rangeFitScore(component.material.hardness_hb, machine.specs.material_hardness_range_hb);
  const tensile = rangeFitScore(component.material.tensile_strength_mpa, machine.specs.material_tensile_range_mpa);
  const tolerance = toleranceScore(component.mechanical.tolerance_mm, machine.specs.tolerance_capability_mm);
  const envelope = envelopeScore(component, machine);
  const finish = finishScore(component.mechanical.surface_finish_ra_um, machine.specs.surface_finish_capability_ra_um);

  const values: Record<string, { score: number; detail: string }> = {
    hardness,
    tensile,
    tolerance,
    envelope,
    finish,
  };

  const breakdown: ScoreBreakdown[] = FACTORS.map((f) => ({
    label: f.label,
    weight: f.weight,
    score: Math.round(values[f.key].score),
    detail: values[f.key].detail,
  }));

  const weighted = FACTORS.reduce((sum, f) => sum + (values[f.key].score * f.weight) / 100, 0);
  const score = Math.max(0, Math.min(100, Math.round(weighted)));

  return { score, breakdown };
}

/** Ranks candidate machines (already filtered to the right process_type) by score, descending. */
export function rankMachines(component: Component, machines: Machine[]): Array<{ machine: Machine } & ScoringResult> {
  return machines
    .map((machine) => ({ machine, ...scoreMachineForComponent(component, machine) }))
    .sort((a, b) => b.score - a.score);
}
