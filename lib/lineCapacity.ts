// lib/lineCapacity.ts
//
// Pure, deterministic, rule-based line-layout / station-capacity math for
// the "Line Layout & Station KPIs" planning page
// (app/projects/[projectId]/iterations/[iterationId]/line/page.tsx).
//
// Consistent with the rest of this app's philosophy (see lib/scoring.ts and
// lib/estimate.ts): every formula here is an intentionally simple,
// transparent heuristic — not a queueing-theory or discrete-event
// simulation model. Each simplification is called out in a comment next to
// the formula that makes it.
//
// This module takes an already-assembled ordered list of stations (the page
// component assembles it from listProcessStages + listIterationSelections +
// machine lookups) and is otherwise side-effect free, so it's easy to
// exercise with plain unit tests if any are added later.

import { Machine, ProcessType } from "./types";
import { estimateStageCycleTimeMin } from "./estimate";
import { MACHINE_CATALOG } from "./data/machineCatalog";

/** One station in sequence order: a process stage paired with its selected machine. */
export interface StationInput {
  stageId: string;
  stageName: string;
  stageType: ProcessType;
  machine: Machine;
}

export interface StationCapacity {
  stageId: string;
  stageName: string;
  stageType: ProcessType;
  machineName: string;
  /** Minutes per part, from estimateStageCycleTimeMin. */
  cycleTimeMin: number;
  /** 1 / cycleTimeMin. */
  partsPerMin: number;
  /** Parallel operators/machine-instances needed to match the line's bottleneck rate. */
  hcRequirement: number;
  inboundWipUnits: number;
  outboundWipUnits: number;
  starved: boolean;
  starvationSuggestion: string | null;
}

export interface LineCapacitySummary {
  stations: StationCapacity[];
  /** The bottleneck (minimum) throughput rate across all stations. */
  linePartsPerMin: number;
  bottleneckStageName: string;
  totalHcRequirement: number;
  totalWipUnits: number;
}

/**
 * Searches the full machine catalog for a faster upstream replacement, or
 * falls back to a "run two in parallel" suggestion. Excludes machines
 * already selected anywhere in this iteration (so we don't recommend
 * "upgrading" to a machine that's already doing a different job on the
 * same line).
 */
function suggestUpstreamFix(
  upstreamStageName: string,
  upstreamStageType: ProcessType,
  upstreamMachine: Machine,
  selectedMachineIds: Set<string>
): string {
  const currentThroughput = upstreamMachine.specs.throughput_parts_per_hour ?? 0;

  const betterCandidates = MACHINE_CATALOG.filter((m) => {
    if (m.process_type !== upstreamStageType) return false;
    if (m.name === upstreamMachine.name) return false;
    // Machines don't have stable ids in the static catalog (ids are minted
    // per-seed), so we exclude by name — good enough given catalog names
    // are unique — to avoid recommending a machine that's already selected
    // for a different stage in this iteration.
    if (selectedMachineIds.has(m.name)) return false;
    const throughput = m.specs.throughput_parts_per_hour ?? 0;
    return throughput > currentThroughput;
  }).sort((a, b) => (b.specs.throughput_parts_per_hour ?? 0) - (a.specs.throughput_parts_per_hour ?? 0));

  if (betterCandidates.length > 0) {
    const best = betterCandidates[0];
    return `Upgrade upstream '${upstreamStageName}' to ${best.name} (~${best.specs.throughput_parts_per_hour} pph) to close the gap.`;
  }

  return "Add a second parallel unit of the current upstream machine to roughly double its throughput.";
}

/**
 * Computes per-station capacity KPIs and line-level rollups for an ordered
 * sequence of stations.
 *
 * @param stations   ordered stations (index 0 = first operation in the line)
 * @param bufferMinutes  minutes of buffer stock each station/buffer is sized to absorb
 * @param variantCount   number of part variants/SKUs sharing this line (multipart WIP scaling)
 */
export function computeLineCapacity(
  stations: StationInput[],
  bufferMinutes: number,
  variantCount: number
): LineCapacitySummary {
  if (stations.length === 0) {
    return {
      stations: [],
      linePartsPerMin: 0,
      bottleneckStageName: "—",
      totalHcRequirement: 0,
      totalWipUnits: 0,
    };
  }

  // Per-station cycle time and rate.
  const cycleTimes = stations.map((s) => estimateStageCycleTimeMin(s.machine, s.stageType));
  const partsPerMinList = cycleTimes.map((ct) => 1 / ct);

  // The line's achievable throughput is set by its slowest (bottleneck)
  // station — a standard first-order line-balancing simplification that
  // ignores changeover time, scrap/rework loops, and stochastic downtime.
  const linePartsPerMin = Math.min(...partsPerMinList);
  const bottleneckCycleTimeMin = Math.max(...cycleTimes);
  const bottleneckIdx = cycleTimes.indexOf(bottleneckCycleTimeMin);

  const selectedMachineNames = new Set(stations.map((s) => s.machine.name));

  const stationResults: StationCapacity[] = stations.map((s, i) => {
    const cycleTimeMin = cycleTimes[i];
    const partsPerMin = partsPerMinList[i];

    // How many parallel operators/machine-instances this station would need
    // to keep pace with the line's bottleneck rate; the bottleneck station
    // itself always needs exactly 1 (ceil(bottleneck/bottleneck) = 1).
    // Simplification: assumes each "unit" of capacity is an identical
    // parallel resource and ignores the real labor-content/automation split
    // (e.g. one operator running two machines, or a machine that can't
    // physically be duplicated on the shop floor).
    const hcRequirement = Math.ceil(cycleTimeMin / bottleneckCycleTimeMin);

    // Inbound WIP: sized to what this station will consume during the
    // buffer window if its upstream feed is interrupted, scaled by the
    // number of part variants sharing the line. This is standard "X
    // minutes of buffer stock" sizing — not a stochastic or Little's-Law
    // based calculation, and it ignores lot sizing / container quantities.
    const inboundWipUnits = Math.ceil(bufferMinutes * partsPerMin) * variantCount;

    // Starvation: station i's upstream can't feed it fast enough, so it
    // will periodically run dry. The first station is never flagged
    // starved — we assume raw material/component supply is available,
    // itself a simplification (a real line could still be constrained by
    // incoming material logistics).
    const starved = i > 0 && partsPerMinList[i - 1] < partsPerMin;

    let starvationSuggestion: string | null = null;
    if (starved) {
      const upstream = stations[i - 1];
      starvationSuggestion = suggestUpstreamFix(
        upstream.stageName,
        upstream.stageType,
        upstream.machine,
        selectedMachineNames
      );
    }

    return {
      stageId: s.stageId,
      stageName: s.stageName,
      stageType: s.stageType,
      machineName: s.machine.name,
      cycleTimeMin,
      partsPerMin: Math.round(partsPerMin * 10000) / 10000,
      hcRequirement,
      inboundWipUnits,
      // outboundWipUnits filled in below once every station's inbound is known.
      outboundWipUnits: 0,
      starved,
      starvationSuggestion,
    };
  });

  // Outbound WIP: the buffer between two adjacent stations is the same
  // physical buffer, so outbound-of-A = inbound-of-B. The last station's
  // outbound is treated as a finished-goods buffer, sized the same way as
  // any other buffer (bufferMinutes worth of its own output rate).
  for (let i = 0; i < stationResults.length; i++) {
    if (i < stationResults.length - 1) {
      stationResults[i].outboundWipUnits = stationResults[i + 1].inboundWipUnits;
    } else {
      const last = stationResults[i];
      stationResults[i].outboundWipUnits = Math.ceil(bufferMinutes * last.partsPerMin) * variantCount;
    }
  }

  const totalHcRequirement = stationResults.reduce((sum, s) => sum + s.hcRequirement, 0);

  // Each buffer counted exactly once: the first station's inbound WIP plus
  // every station's outbound WIP (since inbound-of-(i+1) === outbound-of-i,
  // summing all outbound WIPs already covers every buffer after the first).
  const totalWipUnits =
    stationResults[0].inboundWipUnits + stationResults.reduce((sum, s) => sum + s.outboundWipUnits, 0);

  return {
    stations: stationResults,
    linePartsPerMin: Math.round(linePartsPerMin * 10000) / 10000,
    bottleneckStageName: stations[bottleneckIdx].stageName,
    totalHcRequirement,
    totalWipUnits,
  };
}
