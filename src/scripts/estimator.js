// Prijs-indicatie engine (hybride, inkoop centraal).
// Toont bewust alleen een "vanaf"-bedrag: elke afwijking naar boven is dan
// een meevaller i.p.v. een teleurstelling. De doorverkoopwaarde tonen we
// nergens — dat is interne rekendata, geen marketing.
// NB: deze logica draait client-side en is dus uitleesbaar; verplaats de
// berekening naar een backend zodra de site serieus geld verdient.
import { MODELS, FALLBACK, DEMAND_PCT, findModel } from '../data/models.js';

const round5 = (n) => Math.max(0, Math.round(n / 5) * 5);

const STRIKING_COLORS = ['roze', 'wit', 'rood', 'goud', 'zilver-roze', 'pink', 'white', 'red'];

// input = {
//   merk, modelnaam, kleur,
//   staat: 'netjes' | 'gebruikt' | 'ongetest' | 'defect',
//   batterij: 'ja' | 'nee' | 'onbekend',
//   lader: 'ja' | 'nee' | 'onbekend',
//   doos: 'ja' | 'nee',
// }
export function estimate(input) {
  const model = findModel(input.merk, input.modelnaam) || null;
  const base = model ?? FALLBACK;
  const reasons = [];

  // 1. Defect -> geen bedrag als dead-end, maar een warme doorverwijzing.
  if (input.staat === 'defect') {
    return {
      status: 'defect',
      headline: 'Eerlijk gezegd: waarschijnlijk niet veel waard',
      buyFrom: 0,
      note:
        'Lens errors, kapotte schermen en batterijcorrosie maken een camera meestal niet interessant (€0–€10). Maar stuur gerust foto’s via WhatsApp — soms zoeken we onderdelen. En check die la nog even: ligt er misschien nóg een camera?',
      reasons: ['Camera is opgegeven als defect'],
      modelName: model ? `${model.merk} ${model.model}` : null,
      demand: base.demand,
    };
  }

  // Basis: percentageband op het midpunt van de doorverkoopwaarde.
  const pct = DEMAND_PCT[base.demand];
  const mid = (base.resaleMin + base.resaleMax) / 2;
  let buyMin = mid * pct.min;

  // 2. Staat rekent nu écht mee.
  let untested = false;
  if (input.staat === 'gebruikt') {
    buyMin *= 0.88;
    reasons.push('Gebruikssporen (kleine aftrek)');
  } else if (input.staat === 'ongetest') {
    buyMin -= 35;
    untested = true;
    reasons.push('Camera is ongetest (−€20 tot −€50)');
  } else if (input.staat === 'netjes') {
    reasons.push('Nette, werkende staat (beste uitgangspositie)');
  }

  // 3. Geen lader.
  if (input.lader === 'nee') {
    buyMin -= 20;
    reasons.push('Geen lader (−€15 tot −€25)');
  }

  // 4. Geen batterij.
  if (input.batterij === 'nee') {
    buyMin -= 15;
    reasons.push('Geen batterij (−€10 tot −€20)');
  }

  // 5. Originele doos (kleine plus, blijf kritisch).
  if (input.doos === 'ja') {
    buyMin += 5;
    reasons.push('Originele doos aanwezig (+)');
  }

  // 6. Opvallende kleur bij een populair (high demand) model.
  const kleur = (input.kleur || '').toLowerCase();
  const striking = STRIKING_COLORS.some((c) => kleur.includes(c));
  if (striking && base.demand === 'high') {
    buyMin += 8;
    reasons.push('Opvallende kleur bij populair model (+)');
  }

  // Ondergrens: een werkende/ongeteste camera toont nooit minder dan €10.
  const buyFrom = round5(Math.max(buyMin, 10));

  const unknownModel = !model;
  let status = 'ok';
  let headline = null;
  let note =
    'Vaak meer bij nette staat en complete set. De definitieve prijs bepalen we na onze check, meestal binnen 24 uur.';

  if (unknownModel && untested) {
    status = 'uncertain';
    headline = 'Onzeker — we bekijken je foto’s';
    note =
      'We herkennen dit model niet direct en de camera is ongetest. Stuur duidelijke foto’s, dan geven we een gerichte prijs.';
  } else if (unknownModel) {
    status = 'uncertain';
    note =
      'We herkennen dit model niet in onze lijst, dus deze indicatie is voorzichtig. Foto’s helpen ons een gerichte prijs te geven — vaak valt het mee.';
  }

  return {
    status,
    headline,
    buyFrom,
    note,
    reasons,
    modelName: model ? `${model.merk} ${model.model}` : null,
    demand: base.demand,
  };
}

export { MODELS };
