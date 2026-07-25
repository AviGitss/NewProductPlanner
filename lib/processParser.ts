// lib/processParser.ts
//
// Rule-based natural-language process parser.
//
// PURPOSE
// The user types a free-text description of how they intend to manufacture
// a component, e.g. "cut the blank to size, then CNC mill the pockets,
// deburr, and anodize". This module converts that text into an ordered list
// of structured ProcessStage-like objects by matching a taxonomy of
// manufacturing process keywords/synonyms against the text.
//
// This is intentionally NOT an LLM call: it is deterministic, fast, and
// fully offline so the app works with no external API keys. It is a
// heuristic first pass — the UI always lets the user manually add, remove,
// re-order, or re-type each detected stage afterwards.
//
// ALGORITHM
// 1. Split the input into clauses using common separators: commas,
//    "then", "after that", "followed by", periods, semicolons, "and".
// 2. For each clause, scan a keyword table (taxonomy -> list of regex
//    patterns) and pick the process type whose pattern list has the
//    strongest match (longest matched keyword wins ties).
// 3. Clauses that don't match any keyword are kept as an "unclassified"
//    stage of type "inspection_qa" is NOT assumed — instead we default to
//    the closest generic bucket "assembly" only if it looks like a joining
//    action, otherwise we surface it as-is for manual classification by
//    marking matched_keywords = [] so the UI can flag it.
// 4. Stages are numbered sequentially in the order they appear in the text.

import { ProcessType } from "./types";

interface TaxonomyEntry {
  type: ProcessType;
  patterns: RegExp[];
  label: string;
}

// Ordered list matters only for tie-breaking readability; matching itself
// uses longest-keyword-wins across all entries.
export const TAXONOMY: TaxonomyEntry[] = [
  {
    type: "cutting",
    label: "Cutting / Sawing",
    patterns: [/\bcut(ting)?\b/i, /\bsaw(ing)?\b/i, /\bshear(ing)?\b/i, /\bblank(ing)?\b/i, /\btrim(ming)?\b/i, /\blaser cut/i, /\bwaterjet/i, /\bplasma cut/i],
  },
  {
    type: "turning",
    label: "Turning",
    patterns: [/\bturn(ing)?\b/i, /\blathe\b/i, /\bfacing\b/i, /\bboring\b/i],
  },
  {
    type: "milling",
    label: "CNC Milling",
    patterns: [/\bmill(ing)?\b/i, /\bcnc mill/i, /\bpocket(s|ing)?\b/i, /\bcontour(ing)?\b/i, /\bslot(ting)?\b/i, /\bface mill/i],
  },
  {
    type: "drilling",
    label: "Drilling",
    patterns: [/\bdrill(ing)?\b/i, /\btap(ping)?\b/i, /\bream(ing)?\b/i, /\bcounterbore\b/i, /\bcountersink\b/i, /\bhole(s)?\b/i],
  },
  {
    type: "grinding",
    label: "Grinding",
    patterns: [/\bgrind(ing)?\b/i, /\bhone(ing)?\b/i, /\blap(ping)?\b/i, /\bpolish(ing)?\b/i],
  },
  {
    type: "forming_stamping",
    label: "Forming / Stamping",
    patterns: [/\bstamp(ing)?\b/i, /\bform(ing)?\b/i, /\bbend(ing)?\b/i, /\bpress(ing)?\b/i, /\bdraw(ing)?\b/i, /\bforg(e|ing)\b/i, /\bextrud(e|ing|sion)\b/i, /\broll(ing)? form/i],
  },
  {
    type: "welding_joining",
    label: "Welding / Joining",
    patterns: [/\bweld(ing)?\b/i, /\bbraz(e|ing)\b/i, /\bsolder(ing)?\b/i, /\brivet(ing)?\b/i, /\bfasten(ing)?\b/i, /\bjoin(ing)?\b/i, /\badhesive\b|\bbond(ing)?\b/i],
  },
  {
    type: "casting",
    label: "Casting",
    patterns: [/\bcast(ing)?\b/i, /\bdie cast(ing)?\b/i, /\bsand cast(ing)?\b/i, /\binvestment cast(ing)?\b/i, /\bmold(ing)? (metal|pour)/i],
  },
  {
    type: "injection_molding",
    label: "Injection Molding",
    patterns: [/\binjection mold(ing)?\b/i, /\bmold(ing)?\b/i, /\bplastic mold/i],
  },
  {
    type: "additive_3d_printing",
    label: "Additive / 3D Printing",
    patterns: [/\b3d print(ing)?\b/i, /\baddit(ive)?\b/i, /\bsls\b/i, /\bsla\b/i, /\bfdm\b/i, /\bdmls\b/i, /\bpowder bed\b/i],
  },
  {
    type: "heat_treatment",
    label: "Heat Treatment",
    patterns: [/\bheat treat(ment|ing)?\b/i, /\banneal(ing)?\b/i, /\bquench(ing)?\b/i, /\btemper(ing)?\b/i, /\bcase harden(ing)?\b/i, /\bstress reliev(e|ing)\b/i],
  },
  {
    type: "surface_finishing_coating",
    label: "Surface Finishing / Coating",
    patterns: [/\bdeburr(ing)?\b/i, /\banodiz(e|ing)\b/i, /\bplat(e|ing)\b/i, /\bpaint(ing)?\b/i, /\bcoat(ing)?\b/i, /\bpassivat(e|ion|ing)\b/i, /\bblast(ing)?\b/i, /\bpowder coat(ing)?\b/i, /\bplating\b/i],
  },
  {
    type: "inspection_qa",
    label: "Inspection / QA",
    patterns: [/\binspect(ion|ing)?\b/i, /\bqa\b/i, /\bqc\b/i, /\bquality check\b/i, /\bcmm\b/i, /\bmeasur(e|ing|ement)\b/i, /\btest(ing)?\b/i],
  },
  {
    type: "assembly",
    label: "Assembly",
    patterns: [/\bassembl(e|y|ing)\b/i, /\bfit(ting)? (up|together)\b/i, /\bmount(ing)?\b/i, /\bintegrat(e|ing|ion)\b/i],
  },
  {
    type: "packaging",
    label: "Packaging",
    patterns: [/\bpackag(e|ing)\b/i, /\bbox(ing)?\b/i, /\bcrate(ing)?\b/i, /\bship(ping)?\b/i, /\blabel(ing|ling)?\b/i],
  },
];

export interface ParsedStage {
  sequence: number;
  stage_type: ProcessType;
  name: string;
  description: string;
  matched_keywords: string[];
}

const CLAUSE_SPLIT_RE =
  /\bthen\b|\bafter that\b|\bfollowed by\b|\bnext\b|,|;|\.|\band then\b/gi;

function splitClauses(text: string): string[] {
  return text
    .split(CLAUSE_SPLIT_RE)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

function classifyClause(clause: string): { type: ProcessType | null; keywords: string[] } {
  let best: { type: ProcessType | null; keywords: string[]; matchLen: number } = {
    type: null,
    keywords: [],
    matchLen: 0,
  };

  for (const entry of TAXONOMY) {
    const matches: string[] = [];
    for (const pattern of entry.patterns) {
      const m = clause.match(pattern);
      if (m) matches.push(m[0]);
    }
    if (matches.length > 0) {
      const longest = Math.max(...matches.map((m) => m.length));
      if (longest > best.matchLen) {
        best = { type: entry.type, keywords: matches, matchLen: longest };
      }
    }
  }

  return { type: best.type, keywords: best.keywords };
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Parses free-text process description into an ordered array of stages.
 * Clauses that cannot be classified are still returned (stage_type falls
 * back to "inspection_qa" only if the word "check"/"verify" is implied;
 * otherwise it falls back to "assembly" as a generic manual-review bucket)
 * with an empty matched_keywords array so the UI can visually flag them
 * for the user to manually correct.
 */
export function parseProcessText(text: string): ParsedStage[] {
  const clauses = splitClauses(text);
  const stages: ParsedStage[] = [];

  let seq = 1;
  for (const clause of clauses) {
    const { type, keywords } = classifyClause(clause);
    const resolvedType: ProcessType = type ?? "assembly";
    const label = clause.length > 60 ? clause.slice(0, 57) + "..." : clause;

    stages.push({
      sequence: seq,
      stage_type: resolvedType,
      name: titleCase(label),
      description: titleCase(clause),
      matched_keywords: keywords,
    });
    seq += 1;
  }

  return stages;
}

/** True when the parser found zero recognizable keywords across all clauses. */
export function parseHasLowConfidence(stages: ParsedStage[]): boolean {
  return stages.length === 0 || stages.every((s) => s.matched_keywords.length === 0);
}
