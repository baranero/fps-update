export interface GulajskiVent {
  base: 'PS' | 'P';
  A: number;     // mm — nominal width
  B: number;     // mm — nominal depth (B >= A)
  Av: number;    // m² — geometric opening area
  Aa350: number; // m² — certified effective area at H=350 mm opening height
  Aa500: number; // m² — certified effective area at H=500 mm opening height
  can24V: boolean;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

// PS (prostoskośna): slanted flap; frame reduces light opening by 100 mm on each side.
// Certified Cv ≈ 0.823 applied to (A-100)×(B-100) light area; Aa is height-independent
// (verified: PS 900×900 → Aa = 0.527 m²).
function psEntry(A: number, B: number): GulajskiVent {
  const Av = r3((A / 1000) * (B / 1000));
  const lightArea = ((A - 100) / 1000) * ((B - 100) / 1000);
  const Aa = r3(0.823 * lightArea);
  return { base: 'PS', A, B, Av, Aa350: Aa, Aa500: Aa, can24V: true };
}

// P (prosta): straight-lift flap; full A×B opening.
// Cv(H=350) ≈ 0.670, Cv(H=500) ≈ 0.700 per CNBOP certified data
// (verified: P 800×800 → Aa350=0.429 m², Aa500=0.448 m²).
function pEntry(A: number, B: number): GulajskiVent {
  const Av = r3((A / 1000) * (B / 1000));
  return {
    base: 'P', A, B, Av,
    Aa350: r3(0.670 * Av),
    Aa500: r3(0.700 * Av),
    can24V: true,
  };
}

function build(): GulajskiVent[] {
  const out: GulajskiVent[] = [];
  // PS: A 900–2300 mm, B from A up to 2900 mm, 100 mm steps
  for (let A = 900; A <= 2300; A += 100) {
    for (let B = A; B <= 2900; B += 100) {
      out.push(psEntry(A, B));
    }
  }
  // P: A 800–2200 mm, B from A up to 2800 mm, 100 mm steps
  for (let A = 800; A <= 2200; A += 100) {
    for (let B = A; B <= 2800; B += 100) {
      out.push(pEntry(A, B));
    }
  }
  return out;
}

export const gulajskiVents: GulajskiVent[] = build();
