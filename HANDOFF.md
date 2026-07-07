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

> **Bijgewerkt**: er is inmiddels wél een backend (Cloudflare Worker + R2), zie
> de sectie "Deployment" hieronder. De regel hierboven over "geen backend" in
> een eerdere versie van dit document klopt niet meer.

## Deployment (Cloudflare Worker + R2)

De site draait als een **Cloudflare Worker met static assets** (niet Cloudflare
Pages) op `https://vintage-camera-inkoop2.f-p-yousfi.workers.dev/`. Formulier-
inzendingen (incl. foto's) worden opgeslagen in de R2-bucket `camera-uploads`.

**Bug gevonden en gefixt (2026-07-08)**: `functions/api/*.js` gebruikt de
Cloudflare **Pages Functions**-conventie (bestandsnaam-gebaseerde routing,
`onRequestPost`/`onRequestGet`). Die conventie werkt alléén op Cloudflare
Pages — een Worker-met-assets leest die map niet automatisch, dus
`/api/submit`, `/api/inzendingen-7kq4m9` en `/api/foto-7kq4m9` gaven 404 op de
live URL, terwijl de homepage (static assets) wél werkte.

**Fix**: [src/worker.js](src/worker.js) is de nieuwe Worker-entrypoint
(`main` in [wrangler.toml](wrangler.toml)). Hij routeert handmatig naar de
bestaande handlers in `functions/api/*.js` (die blijven ongewijzigd en zijn nu
gewoon geïmporteerde functies, geen framework-magie meer) en valt voor al het
overige terug op `env.ASSETS.fetch(request)` om de gebouwde site te serveren.
`wrangler.toml` kreeg een `binding = "ASSETS"` zodat de Worker die fallback
kan aanroepen.

Getest lokaal met `wrangler dev` (Miniflare, gesimuleerde R2 — raakt de echte
bucket niet aan): formulier-submit, dashboard-lijst en foto-proxy werken alle
drie end-to-end. Zie `npm run wrangler:dev` (draait op poort 8788).

### Dashboard-beveiliging (HTTP Basic Auth)

`/api/inzendingen-7kq4m9` en `/api/foto-7kq4m9` waren alleen verborgen via een
niet-geraden URL — geen echte beveiliging, terwijl ze namen, telefoonnummers,
e-mailadressen en foto's van aanvragers tonen. **Gefixt**: beide routes
vereisen nu HTTP Basic Auth (browser toont automatisch een wachtwoordprompt),
gecheckt in [src/worker.js](src/worker.js) tegen de Worker-secret
`DASHBOARD_PASSWORD`. `/api/submit` (het publieke formulier) blijft open.
**Fail-closed**: ontbreekt de secret, dan geeft elk verzoek 401 — er is geen
manier om per ongeluk zonder wachtwoord live te gaan.

Lokaal: kopieer [.dev.vars.example](.dev.vars.example) naar `.dev.vars`
(gitignored) en vul een wachtwoord in; `wrangler dev` leest dat automatisch.

**Nog te doen door jou (ik kan dit niet vanaf hier uitvoeren):**

1. **Zet het wachtwoord als Worker secret** (één keer, vóór de eerste deploy
   met deze fix):
   ```
   cd vintage-camera-inkoop
   npx wrangler login          # eenmalig, opent browser
   npx wrangler secret put DASHBOARD_PASSWORD
   ```
   Kies een sterk wachtwoord — dit beschermt echte klantgegevens.
2. **Deployen**:
   ```
   npm run build
   npx wrangler deploy
   ```
   Daarna zou `/api/inzendingen-7kq4m9` een wachtwoordprompt moeten tonen en
   `/api/submit` gewoon moeten werken op de live URL.
3. **⚠️ Beveiligingsissue — GitHub-token in git remote**: `git remote -v` toont
   een Personal Access Token in platte tekst in de origin-URL
   (`https://ghp_...@github.com/...`). Dat token staat lokaal in `.git/config`
   op deze machine. Aanbevolen: vervang de remote door een SSH-URL of een
   credential helper, en **roteer dit token** in GitHub (Settings → Developer
   settings → Personal access tokens) aangezien het nu in leesbare vorm heeft
   rondgezworven. Ik heb het zelf niet aangepast omdat een remote-wijziging
   je push-toegang kan beïnvloeden.
4. `.wrangler/` (lokale Miniflare-state van `wrangler dev`) en `.dev.vars`
   (lokaal wachtwoord) staan nu in `.gitignore` — waren dat nog niet.

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

- Verkoopwaarde wordt nergens getoond, alleen inkoop — bewuste business-keuze.
- Waarschuwingen/defect-meldingen zijn amber, niet roze — roze is uitsluitend
  voor positieve/actie-elementen, amber voor "let op".
- Persoonlijke intro-sectie ("Hoi, ik ben...") is expres informeel — vervangt
  generieke trust-badges door een echt gezicht/naam zodra jij die invult.
