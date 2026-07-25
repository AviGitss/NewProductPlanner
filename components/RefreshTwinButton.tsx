"use client";

import { useTransition } from "react";
import { refreshTwinAction } from "@/app/actions";

export default function RefreshTwinButton({ iterationId, projectId }: { iterationId: string; projectId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn-primary"
      disabled={pending}
      onClick={() => startTransition(() => refreshTwinAction(iterationId, projectId))}
    >
      {pending ? "Refreshing..." : "Refresh simulated telemetry"}
    </button>
  );
}
