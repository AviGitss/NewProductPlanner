// lib/processSuggestion.ts
//
// PURPOSE
// Always give the user a starting-point process description on the
// process-definition step — not only when a CAD file happened to contain
// parseable text (see lib/cadParser.ts). This is the fallback the process
// page falls back to when there is no CAD-derived suggestion: a
// deterministic, rule-based recommendation built purely from the
// component's material family and its mechanical parameters (tolerance,
// surface finish). Same philosophy as the rest of the app (see
// lib/processParser.ts, lib/cadParser.ts): no LLM call, fully offline,
// and always editable/replaceable — this is a sensible default, not a
// guarantee of the "right" process for every part.

import { Component } from "./types";

type MaterialFamily = "aluminum" | "steel" | "stainless" | "titanium" | "brass" | "plastic" | "unknown";

function detectFamily(materialName: string): MaterialFamily {
  const n = materialName.toLowerCase();
  if (n.includes("aluminum") || n.includes("aluminium")) return "aluminum";
  if (n.includes("stainless")) return "stainless";
  if (n.includes("titanium")) return "titanium";
  if (n.includes("brass")) return "brass";
  if (n.includes("abs") || n.includes("nylon") || n.includes("plastic") || n.includes("polyamide")) return "plastic";
  if (n.includes("steel") || n.includes("aisi") || n.includes("astm")) return "steel";
  return "unknown";
}

/**
 * Builds a plain-English process description from the component's own
 * parameters, suitable for feeding straight into parseProcessText() the
 * same way a user-typed description would be. Always returns a non-empty
 * string (falls back to a generic subtractive-machining process for
 * unrecognized materials) so the process step never starts on a blank
 * textarea unless the user explicitly clears the suggestion.
 */
export function suggestProcessFromComponent(component: Component): string {
  const family = detectFamily(component.material.material_name);
  const { tolerance_mm, surface_finish_ra_um } = component.mechanical;
  const precision = tolerance_mm <= 0.05 || surface_finish_ra_um <= 0.8;

  const steps: string[] = [];

  if (family === "plastic") {
    steps.push("Injection mold the part");
    steps.push("trim the flash");
    if (precision) steps.push("machine critical features to tolerance");
  } else {
    steps.push("Cut the blank to size");
    steps.push("CNC mill the part features");
    steps.push("drill and tap the mounting holes");
    if (precision) steps.push("grind critical surfaces to final tolerance");
  }

  steps.push("deburr");

  switch (family) {
    case "aluminum":
      steps.push("anodize");
      break;
    case "steel":
      steps.push("heat treat");
      steps.push("apply a protective plating or powder coat");
      break;
    case "stainless":
      steps.push("passivate");
      break;
    case "titanium":
      steps.push("heat treat");
      break;
    case "brass":
      steps.push("plate");
      break;
    case "plastic":
      // Plastics typically skip a separate coating stage.
      break;
    default:
      steps.push("apply the required surface finish");
  }

  steps.push("inspect");
  steps.push("assemble");
  steps.push("package");

  // Returned as a plain, directly-parseable sentence (no descriptive
  // preamble) so it feeds straight into parseProcessText() the same way a
  // user-typed description would; the "why" (material, tolerance, finish)
  // is shown separately in the UI banner, not embedded in the text itself.
  return steps.join(", ").replace(/^./, (c) => c.toUpperCase()) + ".";
}
