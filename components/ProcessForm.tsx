"use client";

import { useEffect, useState } from "react";
import { commitProcessAction, parseProcessTextAction } from "@/app/actions";
import { ParsedStage } from "@/lib/processParser";
import { PROCESS_TYPE_LABELS, PROCESS_TYPE_ORDER } from "@/lib/types";

const PLACEHOLDER =
  "e.g. Cut the blank, then CNC mill the pockets, drill and tap the mounting holes, deburr, then anodize, inspect, assemble, and package.";

export default function ProcessForm({
  componentId,
  projectId,
  initialSuggestedText,
}: {
  componentId: string;
  projectId: string;
  /** Auto-suggested process description from an uploaded CAD file (see lib/cadParser.ts), if any. */
  initialSuggestedText?: string | null;
}) {
  const hasSuggestion = Boolean(initialSuggestedText && initialSuggestedText.trim());
  const [rawText, setRawText] = useState(initialSuggestedText ?? "");
  const [stages, setStages] = useState<ParsedStage[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [usingSuggestion, setUsingSuggestion] = useState(hasSuggestion);

  async function handleParse(text: string = rawText) {
    if (!text.trim()) return;
    setParsing(true);
    try {
      const parsed = await parseProcessTextAction(text);
      setStages(parsed);
    } finally {
      setParsing(false);
    }
  }

  // If a CAD-derived suggestion came in from the component step, show its
  // stages immediately rather than making the user click "Parse" for text
  // they didn't type themselves — they can still edit or clear it below.
  useEffect(() => {
    if (hasSuggestion) handleParse(initialSuggestedText ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearSuggestionAndWriteManually() {
    setUsingSuggestion(false);
    setRawText("");
    setStages(null);
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
      {usingSuggestion && (
        <div className="rounded-md border border-brand-200 bg-brand-50 p-3 text-xs text-brand-900">
          <p className="font-semibold text-brand-800">Suggested process from your CAD drawing</p>
          <p className="mt-1">
            Review and edit the description and stages below, or start over and write the process yourself.
          </p>
          <button type="button" className="btn-secondary mt-2" onClick={clearSuggestionAndWriteManually}>
            Clear suggestion &amp; enter process manually
          </button>
        </div>
      )}

      <section className="card card-pad space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">
          1. {usingSuggestion ? "Suggested process — edit as needed" : "Describe the process in plain language"}
        </h2>
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
          <button
            type="button"
            className="btn-secondary"
            disabled={parsing || !rawText.trim()}
            onClick={() => {
              setUsingSuggestion(false);
              handleParse();
            }}
          >
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
