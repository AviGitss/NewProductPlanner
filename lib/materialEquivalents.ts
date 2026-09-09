// lib/materialEquivalents.ts
//
// Phase 5 of the platform redesign: when an imported/specialty grade has a
// long lead time from Indian suppliers, suggest domestically-available
// equivalent grades.
//
// HONESTY NOTE: this is a curated, static cross-reference of commonly
// published standard equivalences (IS/ASTM/EN/DIN/JIS), not a live
// internet search — the deployed app has no web-search API configured,
// so it cannot look anything up at request time. These are well-known,
// widely-published equivalences (the kind found in any materials
// handbook), not live pricing/lead-time/availability data — always verify
// the actual composition and mechanical properties against the supplier's
// mill certificate before substituting, and treat "lead time" notes here
// as general/typical, not a quote for your specific order right now.
// Wiring up a live web-search API (for real-time price/lead-time/supplier
// data) is a natural next step once a search API key is available.

export interface MaterialEquivalent {
  standard: string; // e.g. "IS 2062"
  grade: string;
  note: string;
}

const EQUIVALENTS: Record<string, MaterialEquivalent[]> = {
  "steel-a36": [
    { standard: "IS 2062", grade: "E250 (Gr A)", note: "Widely stocked structural steel in India; broadly comparable strength to A36." },
    { standard: "EN 10025", grade: "S275JR", note: "European structural equivalent, sometimes more readily available than A36 imports." },
  ],
  "steel-aisi-1018": [
    { standard: "IS 1570", grade: "C15/C20", note: "Common Indian low-carbon steel bar stock; check carbon range against your tolerance for weldability/hardenability." },
    { standard: "EN", grade: "C15E / 1.1141", note: "European low-carbon equivalent." },
  ],
  "steel-aisi-4140": [
    { standard: "IS 1570", grade: "40Cr1Mo28 (similar to EN19)", note: "Commonly stocked Indian alloy steel bar, close analogue to 4140/EN19." },
    { standard: "DIN", grade: "42CrMo4 / 1.7225", note: "European equivalent, also widely available." },
  ],
  "ss-304": [
    { standard: "IS 6911", grade: "04Cr18Ni10 (304 equivalent)", note: "Domestically produced (Jindal, etc.) — often faster lead time than imported 304 coil/bar." },
  ],
  "ss-316l": [
    { standard: "IS 6911", grade: "015Cr17Ni12Mo2 (316L equivalent)", note: "Domestic 316L-equivalent stainless, check Mo content matches your corrosion requirement." },
  ],
  "al-6061-t6": [
    { standard: "IS 733", grade: "64430 (WP)", note: "Indian wrought-aluminum designation close to 6061; confirm temper (T6) availability with the mill." },
  ],
  "al-7075-t6": [
    { standard: "—", grade: "No common domestic equivalent", note: "7075 is a specialty aerospace-grade alloy — Indian mills rarely stock it; imported lead time is typically unavoidable. Consider 2014A-T6 (also imported) or re-evaluate whether 6061-T6/7075 strength is truly required." },
  ],
  "ti-6al-4v": [
    { standard: "—", grade: "No domestic equivalent", note: "Titanium alloys are not commonly produced domestically in India — imported lead time typically applies regardless of grade." },
  ],
  "brass-c360": [
    { standard: "IS 319", grade: "FSTB (free-cutting brass)", note: "Common Indian free-cutting brass bar, broadly comparable machinability to C360." },
  ],
};

export function getMaterialEquivalents(materialGradeId: string): MaterialEquivalent[] {
  return EQUIVALENTS[materialGradeId] ?? [];
}
