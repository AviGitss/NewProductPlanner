// lib/data/materialCatalog.ts
//
// Client-side lookup table of common manufacturing material grades and
// their typical published engineering properties, used by
// components/ComponentForm.tsx to auto-fill the material parameter fields
// when a grade is selected from the dropdown. Auto-fill is a starting
// point only — the numeric fields remain editable afterwards, since real
// parts can deviate from nominal spec values.
//
// Values are typical/nominal figures drawn from widely published
// engineering references (ASM Handbook, MatWeb, SAE/AISI/ASTM standard
// datasheets, and manufacturer datasheets for the two plastics). They are
// representative "typical" values for the grade/temper shown, not
// guaranteed minimums for any specific certified batch.
//
// Hardness: reported in Brinell (HB) where that's the standard way the
// grade is characterized. For the two plastics (ABS, Nylon 6/6), Brinell
// hardness isn't a meaningful/standard measure — hardness_hb is left
// `null` and the form hides the hardness field for those grades rather
// than showing a misleading number.

export interface MaterialGrade {
  id: string;
  family: "Aluminum" | "Steel" | "Stainless Steel" | "Titanium" | "Brass" | "Plastic";
  label: string;
  tensile_strength_mpa: number;
  yield_strength_mpa: number;
  hardness_hb: number | null;
  hardness_note?: string; // shown when hardness_hb is null (e.g. Shore D / HRB equivalent)
  density_g_cm3: number;
}

export const MATERIAL_CATALOG: MaterialGrade[] = [
  // ---------------- Aluminum ----------------
  {
    id: "al-6061-t6",
    family: "Aluminum",
    label: "Aluminum 6061-T6",
    tensile_strength_mpa: 310,
    yield_strength_mpa: 276,
    hardness_hb: 95,
    density_g_cm3: 2.70,
  },
  {
    id: "al-7075-t6",
    family: "Aluminum",
    label: "Aluminum 7075-T6",
    tensile_strength_mpa: 572,
    yield_strength_mpa: 503,
    hardness_hb: 150,
    density_g_cm3: 2.81,
  },
  {
    id: "al-5052-h32",
    family: "Aluminum",
    label: "Aluminum 5052-H32",
    tensile_strength_mpa: 228,
    yield_strength_mpa: 193,
    hardness_hb: 60,
    density_g_cm3: 2.68,
  },
  // ---------------- Steel ----------------
  {
    id: "steel-aisi-1018",
    family: "Steel",
    label: "AISI 1018 (cold-drawn)",
    tensile_strength_mpa: 440,
    yield_strength_mpa: 370,
    hardness_hb: 126,
    density_g_cm3: 7.87,
  },
  {
    id: "steel-aisi-4140",
    family: "Steel",
    label: "AISI 4140 (annealed)",
    tensile_strength_mpa: 655,
    yield_strength_mpa: 415,
    hardness_hb: 197,
    density_g_cm3: 7.85,
  },
  {
    id: "steel-a36",
    family: "Steel",
    label: "ASTM A36 structural steel",
    tensile_strength_mpa: 400,
    yield_strength_mpa: 250,
    hardness_hb: 119,
    density_g_cm3: 7.85,
  },
  // ---------------- Stainless Steel ----------------
  {
    id: "ss-304",
    family: "Stainless Steel",
    label: "Stainless Steel 304 (annealed)",
    tensile_strength_mpa: 505,
    yield_strength_mpa: 215,
    hardness_hb: 201,
    density_g_cm3: 8.00,
  },
  {
    id: "ss-316l",
    family: "Stainless Steel",
    label: "Stainless Steel 316L (annealed)",
    tensile_strength_mpa: 485,
    yield_strength_mpa: 170,
    hardness_hb: 217,
    density_g_cm3: 8.00,
  },
  {
    id: "ss-17-4ph",
    family: "Stainless Steel",
    label: "Stainless Steel 17-4PH (H900)",
    tensile_strength_mpa: 1310,
    yield_strength_mpa: 1170,
    hardness_hb: 388,
    density_g_cm3: 7.75,
  },
  // ---------------- Titanium ----------------
  {
    id: "ti-6al-4v",
    family: "Titanium",
    label: "Titanium Ti-6Al-4V (annealed)",
    tensile_strength_mpa: 950,
    yield_strength_mpa: 880,
    hardness_hb: 334,
    density_g_cm3: 4.43,
  },
  // ---------------- Brass ----------------
  {
    id: "brass-c360",
    family: "Brass",
    label: "Brass C360 (free-cutting)",
    tensile_strength_mpa: 385,
    yield_strength_mpa: 310,
    hardness_hb: 78,
    density_g_cm3: 8.50,
  },
  // ---------------- Plastics (injection molded) ----------------
  {
    id: "plastic-abs",
    family: "Plastic",
    label: "ABS (injection molding grade)",
    tensile_strength_mpa: 40,
    yield_strength_mpa: 40,
    hardness_hb: null,
    hardness_note: "~Shore D 85 (Brinell not applicable to plastics)",
    density_g_cm3: 1.05,
  },
  {
    id: "plastic-nylon66",
    family: "Plastic",
    label: "Nylon 6/6 (injection molding grade)",
    tensile_strength_mpa: 83,
    yield_strength_mpa: 83,
    hardness_hb: null,
    hardness_note: "~Rockwell R120 / Shore D 85 (Brinell not applicable to plastics)",
    density_g_cm3: 1.14,
  },
];

export function getMaterialGrade(id: string): MaterialGrade | undefined {
  return MATERIAL_CATALOG.find((m) => m.id === id);
}

export const MATERIAL_FAMILIES: MaterialGrade["family"][] = [
  "Aluminum",
  "Steel",
  "Stainless Steel",
  "Titanium",
  "Brass",
  "Plastic",
];
