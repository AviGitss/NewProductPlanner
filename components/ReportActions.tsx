"use client";

import { jsPDF } from "jspdf";

export interface ReportData {
  projectName: string;
  componentName: string;
  iterationName: string;
  material: Record<string, string | number>;
  mechanical: Record<string, string | number>;
  processText: string;
  stages: { sequence: number; name: string; type: string; machine: string; score: number }[];
  avgScore: number;
  estCycleTimeMin: number;
  estCostUsd: number;
  recommendation: string;
}

function downloadPdf(report: ReportData) {
  const doc = new jsPDF({ unit: "pt" });
  let y = 48;
  const lineGap = 16;
  const left = 48;

  function line(text: string, opts: { bold?: boolean; size?: number; gap?: number } = {}) {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size ?? 10);
    const wrapped = doc.splitTextToSize(text, 500);
    doc.text(wrapped, left, y);
    y += (opts.gap ?? lineGap) * (Array.isArray(wrapped) ? wrapped.length : 1);
    if (y > 760) {
      doc.addPage();
      y = 48;
    }
  }

  line("MfgPlan — Manufacturing Line Plan Report", { bold: true, size: 16, gap: 24 });
  line(`Project: ${report.projectName}`, { bold: true, size: 12 });
  line(`Component: ${report.componentName}`);
  line(`Iteration: ${report.iterationName}`, { gap: 24 });

  line("Material Parameters", { bold: true, size: 12, gap: 18 });
  Object.entries(report.material).forEach(([k, v]) => line(`  ${k}: ${v}`));
  y += 8;

  line("Mechanical Parameters", { bold: true, size: 12, gap: 18 });
  Object.entries(report.mechanical).forEach(([k, v]) => line(`  ${k}: ${v}`));
  y += 8;

  line("Process Definition", { bold: true, size: 12, gap: 18 });
  line(report.processText);
  y += 8;

  line("Process Stages & Selected Machines", { bold: true, size: 12, gap: 18 });
  report.stages.forEach((s) => line(`  ${s.sequence}. ${s.name} (${s.type}) -> ${s.machine} — ${s.score}% match`));
  y += 8;

  line("Summary", { bold: true, size: 12, gap: 18 });
  line(`  Average applicability score: ${report.avgScore}%`);
  line(`  Estimated total cycle time: ${report.estCycleTimeMin} min`);
  line(`  Estimated total cost per part: $${report.estCostUsd}`);
  y += 8;

  line("Recommendation", { bold: true, size: 12, gap: 18 });
  line(report.recommendation);

  doc.save(`mfgplan-report-${report.iterationName.replace(/\s+/g, "_")}.pdf`);
}

export default function ReportActions({ report }: { report: ReportData }) {
  return (
    <div className="no-print flex gap-2">
      <button type="button" className="btn-secondary" onClick={() => window.print()}>
        Print / Save as PDF
      </button>
      <button type="button" className="btn-primary" onClick={() => downloadPdf(report)}>
        Download PDF (jsPDF)
      </button>
    </div>
  );
}
