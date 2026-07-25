// lib/estimate.ts
//
// Simple, transparent cycle-time and cost estimation helpers used by the
// iteration summary, comparison, and "recommended flow" views. These are
// intentionally lightweight heuristics (not a scheduling/costing engine):
//
//   cycle time (per stage) = a base minutes-per-part figure derived from the
//     machine's `throughput_parts_per_hour` spec when available, otherwise a
//     flat fallback per process type.
//
//   cost (per stage) = cycle time (hours) * machine `est_hourly_rate_usd`.
//
// Totals are simple sums across the stage sequence (i.e. assumes a single
// serial line, no parallelization) — a reasonable first-order estimate for
// planning purposes.

import { Machine, ProcessType } from "./types";

const FALLBACK_MINUTES_PER_PART: Record<ProcessType, number> = {
  cutting: 8,
  turning: 12,
  milling: 20,
  drilling: 6,
  grinding: 15,
  forming_stamping: 2,
  welding_joining: 10,
  casting: 25,
  injection_molding: 3,
  additive_3d_printing: 90,
  heat_treatment: 45,
  surface_finishing_coating: 15,
  inspection_qa: 10,
  assembly: 12,
  packaging: 5,
};

export function estimateStageCycleTimeMin(machine: Machine, stageType: ProcessType): number {
  if (machine.specs.throughput_parts_per_hour && machine.specs.throughput_parts_per_hour > 0) {
    return Math.round((60 / machine.specs.throughput_parts_per_hour) * 10) / 10;
  }
  return FALLBACK_MINUTES_PER_PART[stageType] ?? 15;
}

export function estimateStageCostUsd(machine: Machine, cycleTimeMin: number): number {
  const hours = cycleTimeMin / 60;
  return Math.round(hours * machine.est_hourly_rate_usd * 100) / 100;
}

export interface StageEstimate {
  cycleTimeMin: number;
  costUsd: number;
}

export function estimateStage(machine: Machine, stageType: ProcessType): StageEstimate {
  const cycleTimeMin = estimateStageCycleTimeMin(machine, stageType);
  const costUsd = estimateStageCostUsd(machine, cycleTimeMin);
  return { cycleTimeMin, costUsd };
}

export function sumEstimates(estimates: StageEstimate[]): { totalCycleTimeMin: number; totalCostUsd: number } {
  const totalCycleTimeMin = Math.round(estimates.reduce((s, e) => s + e.cycleTimeMin, 0) * 10) / 10;
  const totalCostUsd = Math.round(estimates.reduce((s, e) => s + e.costUsd, 0) * 100) / 100;
  return { totalCycleTimeMin, totalCostUsd };
}
