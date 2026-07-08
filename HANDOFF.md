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

## Backend & dashboard (Cloudflare Worker + Airtable)

De site draait als een **Cloudflare Worker met static assets** (niet Cloudflare
Pages) op `https://vintage-camera-inkoop2.f-p-yousfi.workers.dev/`.

**Waar aanvragen heen gaan (bewuste keuze, first principles):** we bouwen zélf
géén dashboard en géén login meer. Een aanvraag komt binnen bij `/api/submit`
en wordt als record in **Airtable** gezet. Airtable ís het dashboard: je
bekijkt aanvragen door in te loggen op airtable.com (of de Airtable-app).
Beveiliging = Airtable's eigen login (e-mail + wachtwoord + 2FA). Geen
wachtwoord in code, geen zelfgebouwde auth om te onderhouden.

**Flow** (in [functions/api/submit.js](functions/api/submit.js)):
1. Foto's → opgeslagen in R2-bucket `camera-uploads`.
2. Backup van alle gegevens → `{{id}}/metadata.json` in R2 (recovery-vangnet:
   als Airtable faalt, is de aanvraag niet verloren).
3. Record → Airtable, met de foto's als attachments (via publieke foto-URL's).
   Als Airtable faalt, krijgt de bezoeker een nette melding om te WhatsappEN;
   de data staat dan nog veilig in R2.

**Routes** (handmatig gerouteerd in [src/worker.js](src/worker.js), want de
Pages-Functions bestandsrouting werkt niet in een Worker-met-assets):
- `POST /api/submit` — formulier ontvangen (publiek).
- `GET /api/foto?file={key}` — serveert een foto uit R2 (publiek; nodig zodat
  Airtable de foto via URL kan ophalen). Sleutel is een niet-te-raden UUID-pad
  en de foto's zelf bevatten geen persoonsgegevens.
- Al het overige → `env.ASSETS.fetch()` (de gebouwde site).

### Eenmalige setup die JIJ moet doen (kan ik niet vanaf hier)

**A. Airtable klaarzetten**
1. Maak een gratis account op airtable.com en een nieuwe **base**, bv.
   "Camera Inkoop", met een **tabel** genaamd `Aanmeldingen`.
2. Geef de tabel exact deze velden (hoofdletters/spelling moeten kloppen — de
   code stuurt deze namen):
   `Datum` (Date, met tijd), `Naam` (Single line text), `Telefoon` (Single line
   text), `E-mail` (Email), `Woonplaats` (Single line text), `Merk` (Single line
   text), `Model` (Single line text), `Kleur` (Single line text), `Staat`
   (Single line text of Single select), `Batterij`, `Lader`, `Doos` (elk Single
   line text), `Accessoires` (Long text), `Foto's` (**Attachment**).
3. Maak een **Personal Access Token**: airtable.com/create/tokens → scope
   `data.records:write` → toegang tot jouw base. Kopieer het token (begint met
   `pat...`).
4. Noteer je **Base ID**: staat in de URL van je base (`https://airtable.com/appXXXXXXXX/...`)
   of via airtable.com/developers/web/api → kies je base.

**B. De 3 waarden in Cloudflare zetten (via klikken, geen command-line)**
   Cloudflare-dashboard → Workers & Pages → `vintage-camera-inkoop` → Settings →
   Variables and Secrets → voeg toe:
   - `AIRTABLE_TOKEN` = je `pat...`-token → zet op **Encrypt** (Secret).
   - `AIRTABLE_BASE_ID` = je `app...`-id (gewone variabele mag).
   - `AIRTABLE_TABLE` = `Aanmeldingen` (gewone variabele).
   Klik **Deploy** / Save.

**C. De nieuwe code live zetten**
   De codewijziging (Airtable i.p.v. het oude dashboard) moet nog gedeployed
   worden. Zoals je de site eerder live zette:
   ```
   cd vintage-camera-inkoop
   npx wrangler login       # eenmalig
   npm run build
   npx wrangler deploy
   ```
   (Of, als de worker aan GitHub gekoppeld is voor auto-deploy: een `git push`
   is genoeg — de commit staat al klaar.)

**Testen na deploy:** vul het formulier op de live site in en verstuur. Er
zou binnen enkele seconden een nieuwe rij in je Airtable-tabel moeten
verschijnen, met de foto's erbij. (Lokaal testen tegen Airtable kan niet
volledig: Airtable kan `localhost` niet bereiken om de foto's op te halen —
dat werkt pas op de publieke live-URL.)

### Nog een openstaand beveiligingspunt (los van bovenstaande)

**⚠️ GitHub-token in git remote**: `git remote -v` toont een Personal Access
Token in platte tekst in de origin-URL (`https://ghp_...@github.com/...`),
lokaal in `.git/config`. Aanbevolen: vervang de remote door SSH of een
credential helper, en **roteer dit token** in GitHub. Niet zelf aangepast omdat
een remote-wijziging je push-toegang kan raken.

### Lokaal ontwikkelen met de backend

Kopieer [.dev.vars.example](.dev.vars.example) → `.dev.vars` (staat in
`.gitignore`) en vul je Airtable-gegevens in. Dan:
```
npm run wrangler:dev     # draait de Worker lokaal op poort 8788
```
`.wrangler/` (lokale Miniflare-state) en `.dev.vars` staan in `.gitignore`.

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
