// components/PlanningStepper.tsx
//
// Thin wrapper around the shared WorkflowStepsCompact visual, placed at the
// top of each page in the planning flow (component -> process ->
// recommendations -> flow -> twin -> report) so first-time users always
// know where they are and what's next.

import { WorkflowStepsCompact } from "./WorkflowSteps";

export type PlanningStepKey = "component" | "process" | "recommendations" | "flow" | "line" | "twin" | "report";

export default function PlanningStepper({ currentStep }: { currentStep: PlanningStepKey }) {
  return <WorkflowStepsCompact currentKey={currentStep} />;
}
