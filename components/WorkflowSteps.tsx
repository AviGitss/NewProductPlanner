// components/WorkflowSteps.tsx
//
// Shared step-sequence visual for the MfgPlan planning workflow. Used in two
// places:
//   1. Marketing landing page (`app/page.tsx`) — a wide, illustrated section
//      explaining the product journey to prospective users.
//   2. In-app planning flow (`components/PlanningStepper.tsx`) — a compact
//      horizontal progress indicator showing the current step within an
//      active project.
//
// Kept in one place so both surfaces describe the same six steps and stay
// in sync if the workflow ever changes.

export interface WorkflowStep {
  key: string;
  title: string;
  description: string;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    key: "component",
    title: "Upload CAD & parameters",
    description: "Attach a CAD reference and enter material and mechanical parameters for the part.",
  },
  {
    key: "process",
    title: "Describe process in plain English",
    description: "Type how you intend to manufacture it; the parser turns it into ordered process stages.",
  },
  {
    key: "recommendations",
    title: "Get scored machine recommendations",
    description: "Every stage is matched against a seeded equipment catalog with a weighted 0-100% applicability score.",
  },
  {
    key: "flow",
    title: "Visualize the line",
    description: "See the end-to-end process flow as a connected diagram of stages and selected machines.",
  },
  {
    key: "twin",
    title: "Save & compare iterations",
    description: "Watch simulated digital-twin telemetry, then save, iterate, and compare planning runs.",
  },
  {
    key: "report",
    title: "Export reports",
    description: "Generate a printable / PDF report summarizing the recommended line configuration.",
  },
];

/**
 * Wide marketing rendition: numbered cards connected by a horizontal line,
 * for use on the landing page.
 */
export function WorkflowStepsMarketing({ steps = WORKFLOW_STEPS }: { steps?: WorkflowStep[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-6">
      {steps.map((step, i) => (
        <div key={step.key} className="relative">
          <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-slate-950 lg:mb-3">
              {i + 1}
            </div>
            <h3 className="text-sm font-semibold text-white lg:mt-0">{step.title}</h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.description}</p>
          {i < steps.length - 1 && (
            <div className="absolute right-[-12px] top-5 hidden h-px w-6 bg-slate-700 lg:block" aria-hidden />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Compact in-app horizontal stepper. `currentKey` is the step in progress
 * (shown highlighted); steps before it are marked complete, steps after it
 * are upcoming.
 */
export function WorkflowStepsCompact({
  currentKey,
  steps = WORKFLOW_STEPS,
}: {
  currentKey: string;
  steps?: WorkflowStep[];
}) {
  const currentIdx = steps.findIndex((s) => s.key === currentKey);

  return (
    <ol className="no-print flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white px-8 py-3 text-xs">
      {steps.map((step, i) => {
        const state = i < currentIdx ? "done" : i === currentIdx ? "current" : "upcoming";
        return (
          <li key={step.key} className="flex flex-shrink-0 items-center gap-1">
            <span
              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                state === "done"
                  ? "bg-brand-600 text-white"
                  : state === "current"
                    ? "bg-brand-100 text-brand-700 ring-2 ring-brand-500"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            <span
              className={`whitespace-nowrap font-medium ${
                state === "current" ? "text-slate-900" : state === "done" ? "text-slate-500" : "text-slate-400"
              }`}
            >
              {step.title}
            </span>
            {i < steps.length - 1 && <span className="mx-2 h-px w-4 flex-shrink-0 bg-slate-200" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
