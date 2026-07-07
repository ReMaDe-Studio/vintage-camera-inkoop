# Vintage Camera Inkoop — hand-off

Landingspagina voor een service die oude digitale compactcamera's (2000–2012,
Canon IXUS / Sony Cyber-shot / Fujifilm FinePix / Casio Exilim e.d.) inkoopt.
Astro, statisch, mobile-first, Y2K Summer Vibes-kleurenpalet.

## Draaien

```
cd vintage-camera-inkoop
npm install
npm run dev      # http://localhost:4321
npm run build    # productie-build → dist/
npm run preview  # build lokaal bekijken
```

## Let op: Astro scoped CSS + dynamische innerHTML

De `<style>`-block in [index.astro](src/pages/index.astro) wordt door Astro
gescoped met een `data-astro-cid-...`-attribuut, dat op elementen wordt gezet
op basis van de **statische** template. Klassen die pas na page-load via
`innerHTML` worden ingespoten door het `<script>` (bv. `.est-price`,
`.est-headline`, `.est-note`, `.est-reasons`, `.thanks`, `.thanks-ico`, de
`<b>` in de mobiele prijsbalk) krijgen dat attribuut nooit — zonder
`:global()` matchen die CSS-regels dan stilzwijgend niets (geen foutmelding,
gewoon browser-default styling). Dit gebeurde al met de prijsindicatie.

**Regel**: elke class die alleen via `innerHTML`/`appendChild` in JS wordt
toegevoegd (niet als literal class in de `.astro`-template), moet in het
`<style>`-block gewrapt worden in `:global(.klasse)`, of `.parent :global(tag)`
voor een dynamisch tag zoals `<b>` binnen een statisch element.

## Wat nog moet gebeuren voor livegang (placeholders)

Zoek op `[jouw naam]`, `31600000000` en "placeholder" in de code — dit staat er nog in:

| Wat | Waar | Bestand |
|---|---|---|
| WhatsApp-nummer | `const WHATSAPP = 'https://wa.me/31600000000'` | [src/pages/index.astro](src/pages/index.astro) (bovenaan) |
| Jouw naam + avatar | "Hoi, ik ben [jouw naam]" | zoek `intro-card` in index.astro |
| Instagram-link | footer | zoek `instagram.com` in index.astro |
| Bedrijfs-/privacygegevens | footer-legal + privacy-link (`#privacy`) | onderaan index.astro |
| Echte productfoto's | fotostrip toont nu illustratieve SVG-camera's | `stripCams` array in index.astro, zie hieronder |

Er is geen backend: het formulier logt de aanvraag naar de browserconsole en
toont een bedankt-scherm, maar verstuurt niets. Voordat dit live gaat moet er
een manier komen om aanvragen (incl. foto's) echt bij jou te krijgen — opties:
een formulierdienst (Formspree, Web3Forms), of e-mail/webhook via een simpele
serverless functie.

## Architectuur

- **Eén pagina**: alles staat in [src/pages/index.astro](src/pages/index.astro)
  (secties, styling, client-script). Bewust niet opgesplitst in components —
  het is één landingspagina, geen multi-page site.
- **Design tokens**: [src/styles/global.css](src/styles/global.css) — kleuren,
  radius, schaduwen, fonts staan als CSS-variabelen bovenin. Wijzig hier om de
  hele site te herstijlen.
- **Prijslogica**: [src/scripts/estimator.js](src/scripts/estimator.js) +
  [src/data/models.js](src/data/models.js). Draait client-side (zie
  waarschuwing hieronder).

## Kleurenpalet (Y2K Summer Vibes)

Hoofdaccent is **hot pink** (`--accent`). De overige vier kleuren uit de
briefing zijn "pop"-kleuren voor kleine details (stickers, stapnummers,
model-iconen) — spaarzaam gebruikt zodat het vrolijk blijft zonder druk te
worden. Alles staat in `:root` in [global.css](src/styles/global.css):

```
--accent            hot pink   #ff6bb5   knoppen, links, focus, eyebrow-badges
--pop-pastel-pink    #ffb8c2   kleine accenten
--pop-coral          #ff8052   stap 2, model-iconen
--pop-yellow         #ffd900   Y2K-sticker
--pop-cerulean       #00bfff   stap 3, model-iconen, hero-lensring
```

Wil je de hoofdkleur later weer veranderen: pas alleen `--accent`,
`--accent-soft` en `--accent-ink` aan, de rest van de site volgt automatisch.

## Prijs-indicatie: hoe het werkt en waarom

- Toont bewust alleen een **"vanaf €X"**-bedrag, geen volledige range en geen
  verkoopwaarde ernaast — zie de business-overwegingen die hiertoe leidden
  (marge niet weggeven aan de leverancier, geen onderhandelingsanker tegen
  onszelf). Dit is een principiële keuze, niet een omissie — verander dit niet
  terug zonder de reden te heroverwegen.
- Berekening: percentageband (afhankelijk van vraagniveau high/medium/low) op
  het **midpunt** van de doorverkoopwaarde, met aftrek voor gebruikssporen/
  ongetest/geen lader/geen batterij en een kleine plus voor doos/opvallende
  kleur. Zie `estimate()` in [estimator.js](src/scripts/estimator.js) voor de
  exacte regels en code-comments.
- **Draait client-side** — de hele modeldatabase en pricing-logica staat
  uitleesbaar in de browser-JS. Prima voor nu (geen backend), maar zodra dit
  serieus geld verdient: verplaats de berekening naar een server/API zodat
  concurrenten of slimme verkopers 'm niet kunnen uitlezen.
- Model-matching (`findModel` in [models.js](src/data/models.js)) weegt
  modelnummers zwaar zodat "Sony DSC-T90" niet per ongeluk op de T200 matcht.
  Nieuwe modellen toevoegen: voeg een item toe aan de `MODELS`-array met
  `merk`, `model`, `demand` (`high`/`medium`/`low`) en een realistische
  `resaleMin`/`resaleMax`.

## Formulier: opzet

Twee stappen in één `<form>` (geen page-reload): stap 1 (model, staat,
batterij/lader/doos) toont meteen de live indicatie; pas als dat bedrag
bevalt, klapt stap 2 open (foto's, accessoires, contactgegevens). Op mobiel
verschijnt daarnaast een sticky prijsbalk onderaan het scherm zodra er een
indicatie is.

- **Merk** = `<select>` dropdown (voorkomt tikfouten / verkeerde matches).
  Kiest iemand "Overig", dan verschijnt een vrij tekstveld (`#merkOverig`).
- **Modelnaam** = tekstveld met `<datalist>` die live filtert op het gekozen
  merk (browser-autocomplete). Vrije tekst blijft mogelijk voor onbekende
  modellen.
- Nieuw merk toevoegen aan de dropdown: voeg het toe aan de `BRANDS`-array in
  [models.js](src/data/models.js) (staat vóór `'Overig'`, die moet altijd
  laatste blijven).

## Bekende, bewuste keuzes (niet per ongeluk zo)

- Geen backend/opslag — frontend-only, zie boven.
- Verkoopwaarde wordt nergens getoond, alleen inkoop — bewuste business-keuze.
- Waarschuwingen/defect-meldingen zijn amber, niet roze — roze is uitsluitend
  voor positieve/actie-elementen, amber voor "let op".
- Persoonlijke intro-sectie ("Hoi, ik ben...") is expres informeel — vervangt
  generieke trust-badges door een echt gezicht/naam zodra jij die invult.
