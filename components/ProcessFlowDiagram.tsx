"use client";

import { useMemo } from "react";
import ReactFlow, { Background, Controls, Edge, MarkerType, Node, Position } from "reactflow";
import "reactflow/dist/style.css";
import { PROCESS_TYPE_LABELS, ProcessType } from "@/lib/types";

export interface FlowStage {
  id: string;
  sequence: number;
  name: string;
  stage_type: ProcessType;
  machineName: string | null;
  score: number | null;
}

const COLUMN_WIDTH = 260;
const ROW_HEIGHT = 150;

export default function ProcessFlowDiagram({ stages }: { stages: FlowStage[] }) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    stages.forEach((stage, i) => {
      const x = i * COLUMN_WIDTH;
      nodes.push({
        id: `stage-${stage.id}`,
        position: { x, y: 0 },
        data: {
          label: (
            <div className="text-left">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-brand-100">
                Stage {stage.sequence}
              </div>
              <div className="text-sm font-semibold">{stage.name}</div>
              <div className="text-[11px] text-brand-100">{PROCESS_TYPE_LABELS[stage.stage_type]}</div>
            </div>
          ),
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        style: {
          background: "#233ecf",
          color: "white",
          borderRadius: 8,
          padding: 10,
          width: 210,
          border: "1px solid #1a2b84",
        },
      });

      nodes.push({
        id: `machine-${stage.id}`,
        position: { x, y: ROW_HEIGHT },
        data: {
          label: (
            <div className="text-left">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Machine</div>
              <div className="text-sm font-semibold text-slate-800">{stage.machineName ?? "Unassigned"}</div>
              {stage.score !== null && <div className="text-[11px] text-emerald-600">{stage.score}% match</div>}
            </div>
          ),
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Top,
        style: {
          background: "white",
          borderRadius: 8,
          padding: 10,
          width: 210,
          border: "1px solid #cbd5e1",
        },
      });

      edges.push({
        id: `e-stage-machine-${stage.id}`,
        source: `stage-${stage.id}`,
        target: `machine-${stage.id}`,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "#94a3b8" },
      });

      if (i > 0) {
        const prev = stages[i - 1];
        edges.push({
          id: `e-flow-${prev.id}-${stage.id}`,
          source: `stage-${prev.id}`,
          target: `stage-${stage.id}`,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: "#3357f7", strokeWidth: 2 },
          label: "next",
        });
      }
    });

    return { nodes, edges };
  }, [stages]);

  return (
    <div style={{ height: 420 }} className="card">
      <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
        <Background gap={16} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
