"use client";

import { useState } from "react";
import { deleteProjectAction } from "@/app/actions";

/**
 * Two-step delete control: a plain link-styled button that, once clicked,
 * swaps in an inline confirmation with an explicit "Yes, delete" submit and
 * a "Cancel" bail-out. Used both on the project detail page header and on
 * each dashboard project card (where it must not trigger the card's own
 * navigation link — see the stacking approach in app/dashboard/page.tsx).
 */
export default function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs font-medium text-red-600 hover:text-red-700"
      >
        Delete project
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-slate-500">Delete &quot;{projectName}&quot; and all its data permanently?</span>
      <form action={() => deleteProjectAction(projectId)}>
        <button type="submit" className="font-medium text-red-600 hover:text-red-700">
          Yes, delete
        </button>
      </form>
      <button type="button" onClick={() => setConfirming(false)} className="text-slate-400 hover:text-slate-600">
        Cancel
      </button>
    </div>
  );
}
