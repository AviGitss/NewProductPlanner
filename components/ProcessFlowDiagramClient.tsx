"use client";

// Thin client wrapper around ProcessFlowDiagram so the server-rendered
// flow page can still get click-to-navigate behavior on diagram nodes:
// clicking a stage or machine node jumps to that stage's card on the
// recommendations page.

import { useRouter } from "next/navigation";
import ProcessFlowDiagram, { FlowStage } from "./ProcessFlowDiagram";

export default function ProcessFlowDiagramClient({
  stages,
  projectId,
  iterationId,
}: {
  stages: FlowStage[];
  projectId: string;
  iterationId: string;
}) {
  const router = useRouter();
  return (
    <ProcessFlowDiagram
      stages={stages}
      onStageClick={(stageId) => router.push(`/projects/${projectId}/iterations/${iterationId}/recommendations#stage-${stageId}`)}
    />
  );
}
