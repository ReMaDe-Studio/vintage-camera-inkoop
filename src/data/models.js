// Curated modeldatabase voor de prijsindicatie.
// resaleMin/resaleMax = realistische doorverkoopwaarde in euro's.
// demand bepaalt welk inkoop-percentage we hanteren.
export const MODELS = [
  { merk: 'Canon', model: 'IXUS 70', demand: 'high', resaleMin: 100, resaleMax: 150 },
  { merk: 'Canon', model: 'IXUS 75', demand: 'high', resaleMin: 90, resaleMax: 140 },
  { merk: 'Canon', model: 'IXUS 80', demand: 'high', resaleMin: 90, resaleMax: 140 },
  { merk: 'Canon', model: 'IXUS 100', demand: 'high', resaleMin: 100, resaleMax: 150 },
  { merk: 'Sony', model: 'Cyber-shot DSC-T77', demand: 'high', resaleMin: 100, resaleMax: 160 },
  { merk: 'Sony', model: 'Cyber-shot DSC-T90', demand: 'high', resaleMin: 120, resaleMax: 180 },
  { merk: 'Sony', model: 'Cyber-shot DSC-T200', demand: 'high', resaleMin: 110, resaleMax: 170 },
  { merk: 'Fujifilm', model: 'FinePix Z10fd', demand: 'high', resaleMin: 70, resaleMax: 120 },
  { merk: 'Fujifilm', model: 'FinePix Z5fd', demand: 'high', resaleMin: 70, resaleMax: 120 },
  { merk: 'Casio', model: 'Exilim EX-Z', demand: 'high', resaleMin: 75, resaleMax: 130 },
  { merk: 'Olympus', model: 'mju Digital', demand: 'high', resaleMin: 80, resaleMax: 140 },
  { merk: 'Panasonic', model: 'Lumix FX', demand: 'medium', resaleMin: 50, resaleMax: 95 },
  { merk: 'Nikon', model: 'Coolpix', demand: 'low', resaleMin: 25, resaleMax: 60 },
];

// Fallback voor onbekende modellen: voorzichtig en laag.
export const FALLBACK = { demand: 'low', resaleMin: 30, resaleMax: 80 };

// Merken voor de merk-dropdown/autofill. "Overig" laat vrije tekst toe.
export const BRANDS = [
  'Canon', 'Sony', 'Fujifilm', 'Casio', 'Olympus', 'Panasonic', 'Nikon', 'Overig',
];

// Kleuren voor de kleur-dropdown. "Overig" laat vrije tekst toe.
// Moet in lijn blijven met STRIKING_COLORS in scripts/estimator.js.
export const COLORS = [
  'Zilver', 'Zwart', 'Roze', 'Wit', 'Rood', 'Blauw', 'Goud', 'Paars', 'Overig',
];

// Modellen die bij een gekozen merk horen, voor de model-autofill.
export function modelsForBrand(merk) {
  return MODELS.filter((m) => m.merk.toLowerCase() === (merk ?? '').toLowerCase()).map((m) => m.model);
}

// Inkoop als percentage van de doorverkoopwaarde, per vraag-niveau.
export const DEMAND_PCT = {
  high: { min: 0.45, max: 0.6 },
  medium: { min: 0.35, max: 0.5 },
  low: { min: 0.2, max: 0.35 },
};

// Zoek een model op basis van vrije tekst (merk + modelnaam).
// Scoresysteem: merk is vereist; modelnummers (tokens met een cijfer) wegen
// zwaar zodat "DSC-T90" niet per ongeluk op de T200 matcht.
export function findModel(merk, modelnaam) {
  const q = `${merk ?? ''} ${modelnaam ?? ''}`.toLowerCase();
  if (!q.trim()) return null;

  let best = null;
  let bestScore = 0;
  for (const m of MODELS) {
    if (!q.includes(m.merk.toLowerCase())) continue; // merk vereist
    let score = 1; // merk-match
    const tokens = m.model.toLowerCase().split(/[\s-]+/).filter((w) => w.length > 1);
    for (const t of tokens) {
      if (!q.includes(t)) continue;
      score += /\d/.test(t) ? 10 : 1; // modelnummer weegt zwaar
    }
    // vereis minstens één model-token naast het merk
    if (score < 2) continue;
    const shorter = best && `${m.merk} ${m.model}`.length < `${best.merk} ${best.model}`.length;
    if (score > bestScore || (score === bestScore && shorter)) {
      best = m;
      bestScore = score;
    }
  }
  return best;
}
