// lib/rfpWorkflow.ts
//
// The staged RFP workflow overlaid on top of a project: each project
// moves through a fixed sequence of macro-stages, each "owned" by a role
// (i.e. the role expected to act next), independent of the fine-grained
// component/process/machine-selection detail work that already happens
// inside a project. This is what powers the sales monitoring dashboard
// (Phase 2) and the notification emails sent on handoff.

import { Role } from "./types";

export type RfpStage =
  | "intake"
  | "spec_and_process"
  | "production_capacity"
  | "machine_selection"
  | "costing_and_report"
  | "sales_review"
  | "won"
  | "lost";

export const RFP_STAGE_ORDER: RfpStage[] = [
  "intake",
  "spec_and_process",
  "production_capacity",
  "machine_selection",
  "costing_and_report",
  "sales_review",
  "won",
];

export const RFP_STAGE_LABELS: Record<RfpStage, string> = {
  intake: "Intake",
  spec_and_process: "Spec & Process",
  production_capacity: "Production Capacity",
  machine_selection: "Machine Selection",
  costing_and_report: "Costing & Report",
  sales_review: "Sales Review",
  won: "Won",
  lost: "Lost",
};

/** Which role is expected to act while an RFP sits in this stage. */
export const RFP_STAGE_OWNER: Record<RfpStage, Role | null> = {
  intake: "sales",
  spec_and_process: "rfp_prep",
  production_capacity: "production",
  machine_selection: "rfp_prep",
  costing_and_report: "rfp_prep",
  sales_review: "sales",
  won: null,
  lost: null,
};

export function nextStage(current: RfpStage): RfpStage | null {
  const idx = RFP_STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx === RFP_STAGE_ORDER.length - 1) return null;
  return RFP_STAGE_ORDER[idx + 1];
}

/**
 * Who may move an RFP OUT of a given stage: an admin always can (as an
 * override), otherwise only the role that owns the current stage — the
 * idea being the team currently holding the ball is the one who marks it
 * done and hands it off, not an unrelated role jumping the queue.
 */
export function canAdvanceFromStage(role: Role | null, stage: RfpStage): boolean {
  if (role === "admin") return true;
  const owner = RFP_STAGE_OWNER[stage];
  return owner !== null && role === owner;
}
