"use client";

import { useState } from "react";
import { commitProcessAction, parseProcessTextAction } from "@/app/actions";
import { ParsedStage } from "@/lib/processParser";
import { PROCESS_TYPE_LABELS, PROCESS_TYPE_ORDER } from "@/lib/types";

const PLACEHOLDER =
  "e.g. Cut the blank, then CNC mill the pockets, drill and tap the mounting holes, deburr, then anodize, inspect, assemble, and package.";

export default function ProcessForm({ componentId, projectId }: { componentId: string; projectId: string }) {
  const [rawText, setRawText] = useState("");
  const [stages, setStages] = useState<ParsedStage[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleParse() {
    if (!rawText.trim()) return;
    setParsing(true);
    try {
      const parsed = await parseProcessTextAction(rawText);
      setStages(parsed);
    } finally {
      setParsing(false);
    }
  }

  function updateStage(index: number, patch: Partial<ParsedStage>) {
    if (!stages) return;
    const next = stages.slice();
    next[index] = { ...next[index], ...patch };
    setStages(next);
  }

  function removeStage(index: number) {
    if (!stages) return;
    const next = stages.filter((_, i) => i !== index).map((s, i) => ({ ...s, sequence: i + 1 }));
    setStages(next);
  }

  function moveStage(index: number, dir: -1 | 1) {
    if (!stages) return;
    const target = index + dir;
    if (target < 0 || target >= stages.length) return;
    const next = stages.slice();
    [next[index], next[target]] = [next[target], next[index]];
    setStages(next.map((s, i) => ({ ...s, sequence: i + 1 })));
  }

  function addStage() {
    const next = stages ? stages.slice() : [];
    next.push({
      sequence: next.length + 1,
      stage_type: "inspection_qa",
      name: "New Stage",
      description: "",
      matched_keywords: [],
    });
    setStages(next);
  }

  return (
    <div className="space-y-6">
      <section className="card card-pad space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">1. Describe the process in plain language</h2>
        <textarea
          className="textarea"
          placeholder={PLACEHOLDER}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Rule-based keyword parsing (see <code>lib/processParser.ts</code>) — not an LLM call. Review and edit the
            detected stages below before generating recommendations.
          </p>
          <button type="button" className="btn-secondary" disabled={parsing || !rawText.trim()} onClick={handleParse}>
            {parsing ? "Parsing..." : "Parse into stages"}
          </button>
        </div>
      </section>

      {stages && (
        <section className="card card-pad space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">2. Review &amp; edit detected stages</h2>
            <button type="button" className="btn-secondary" onClick={addStage}>
              + Add stage
            </button>
          </div>

          <div className="space-y-2">
            {stages.map((stage, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border border-slate-200 p-3">
                <div className="flex flex-col gap-1 pt-1">
                  <button type="button" className="text-xs text-slate-400 hover:text-slate-700" onClick={() => moveStage(i, -1)}>
                    ▲
                  </button>
                  <button type="button" className="text-xs text-slate-400 hover:text-slate-700" onClick={() => moveStage(i, 1)}>
                    ▼
                  </button>
                </div>
                <div className="flex-1 grid grid-cols-12 gap-3">
                  <div className="col-span-1 flex items-center justify-center text-sm font-semibold text-slate-400">
                    {i + 1}
                  </div>
                  <div className="col-span-4">
                    <label className="label">Stage name</label>
                    <input
                      className="input"
                      value={stage.name}
                      onChange={(e) => updateStage(i, { name: e.target.value })}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="label">Process type</label>
                    <select
                      className="input"
                      value={stage.stage_type}
                      onChange={(e) => updateStage(i, { stage_type: e.target.value as ParsedStage["stage_type"] })}
                    >
                      {PROCESS_TYPE_ORDER.map((t) => (
                        <option key={t} value={t}>
                          {PROCESS_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="label">Description</label>
                    <input
                      className="input"
                      value={stage.description}
                      onChange={(e) => updateStage(i, { description: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1 flex items-end justify-center pb-1">
                    <button
                      type="button"
                      className="text-xs font-medium text-red-500 hover:text-red-700"
                      onClick={() => removeStage(i)}
                    >
                      Remove
                    </button>
                  </div>
                  {stage.matched_keywords.length === 0 && (
                    <div className="col-span-12 -mt-2">
                      <span className="badge bg-amber-100 text-amber-800">
                        Low confidence match — please verify process type
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {stages.length === 0 && <p className="text-sm text-slate-400">No stages yet. Add one manually.</p>}
          </div>

          <form
            action={async (formData) => {
              setSubmitting(true);
              formData.set("raw_text", rawText);
              formData.set("stages_json", JSON.stringify(stages));
              await commitProcessAction(componentId, projectId, formData);
            }}
            className="flex justify-end pt-2"
          >
            <button type="submit" disabled={submitting || stages.length === 0} className="btn-primary">
              {submitting ? "Generating recommendations..." : "Generate machine recommendations"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
