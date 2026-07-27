"use client";

// Collapsible "How this works" guide in the sidebar, built from the same
// WORKFLOW_STEPS array that drives the marketing page and the in-app
// stepper, so all three surfaces describe the same journey and stay in
// sync if the workflow ever changes.

import { useState } from "react";
import { WORKFLOW_STEPS } from "./WorkflowSteps";

export default function SidebarGuide() {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t border-slate-200 px-3 py-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
      >
        How this works
        <span className="text-slate-400">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <ol className="mt-1 space-y-2 px-2 pb-1">
          {WORKFLOW_STEPS.map((step, i) => (
            <li key={step.key} className="flex gap-2 text-xs">
              <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700">
                {i + 1}
              </span>
              <div>
                <div className="font-medium text-slate-700">{step.title}</div>
                <div className="text-slate-400">{step.description}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
