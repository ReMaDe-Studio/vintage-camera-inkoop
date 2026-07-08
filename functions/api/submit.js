// POST /api/submit
// Ontvangt het formulier + foto's, slaat de foto's op in R2 (zodat Airtable ze
// via een URL kan ophalen) en maakt een record aan in Airtable. Airtable is het
// beveiligde "dashboard": jij bekijkt aanvragen door in te loggen op airtable.com.
//
// Als backup schrijven we ook een metadata.json in R2, zodat een aanvraag nooit
// verloren gaat als Airtable even niet bereikbaar is.

const STAAT_LABELS = {
  netjes: 'Werkend, zeer netjes',
  gebruikt: 'Werkend, gebruikssporen',
  ongetest: 'Ongetest / weet ik niet',
  defect: 'Defect of schade',
};

const MAX_TOTAL = 10 * 1024 * 1024; // 10MB

export async function onRequestPost({ request, env }) {
  try {
    const form = await request.formData();

    // --- Foto's + groottecheck ---
    const files = form.getAll('fotos').filter((f) => f instanceof File && f.size > 0);
    let total = 0;
    for (const f of files) {
      total += f.size;
      if (f.size > MAX_TOTAL) return json({ ok: false, message: 'Eén bestand is groter dan 10MB' }, 400);
    }
    if (total > MAX_TOTAL) return json({ ok: false, message: 'Totale upload is groter dan 10MB' }, 400);

    const requestId = crypto.randomUUID();
    const origin = new URL(request.url).origin;

    // --- 1) Foto's naar R2 + publieke URL bouwen (voor Airtable) ---
    const photos = [];
    await Promise.all(
      files.map(async (file, i) => {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const key = `${requestId}/${i}.${ext}`;
        await env.camera_uploads.put(key, file.stream(), {
          httpMetadata: { contentType: file.type || 'image/jpeg' },
        });
        photos[i] = { key, url: `${origin}/api/foto?file=${encodeURIComponent(key)}`, name: file.name };
      })
    );

    // --- 2) Backup van de gegevens in R2 (recovery als Airtable faalt) ---
    const metadata = {
      id: requestId,
      timestamp: new Date().toISOString(),
      naam: form.get('naam') || '',
      telefoon: form.get('telefoon') || '',
      email: form.get('email') || '',
      woonplaats: form.get('woonplaats') || '',
      merk: form.get('merk') || '',
      modelnaam: form.get('modelnaam') || '',
      kleur: form.get('kleur') || '',
      staat: form.get('staat') || '',
      batterij: form.get('batterij') || '',
      lader: form.get('lader') || '',
      doos: form.get('doos') || '',
      accessoires: form.getAll('accessoires'),
      photos: photos.map((p) => p.key),
    };
    await env.camera_uploads.put(`${requestId}/metadata.json`, JSON.stringify(metadata, null, 2), {
      httpMetadata: { contentType: 'application/json' },
    });

    // --- 3) Record in Airtable ---
    if (!env.AIRTABLE_TOKEN || !env.AIRTABLE_BASE_ID || !env.AIRTABLE_TABLE) {
      console.error('Airtable niet geconfigureerd (AIRTABLE_TOKEN/BASE_ID/TABLE ontbreekt)');
      return json(
        { ok: false, message: 'Aanmelden lukt nu even niet. Neem contact op via WhatsApp, dan helpen we je direct.' },
        503
      );
    }

    const fields = {
      Datum: metadata.timestamp,
      Naam: metadata.naam,
      Telefoon: metadata.telefoon,
      'E-mail': metadata.email,
      Woonplaats: metadata.woonplaats,
      Merk: metadata.merk,
      Model: metadata.modelnaam,
      Kleur: metadata.kleur,
      Staat: STAAT_LABELS[metadata.staat] || metadata.staat,
      Batterij: metadata.batterij,
      Lader: metadata.lader,
      Doos: metadata.doos,
      Accessoires: metadata.accessoires.join(', '),
      "Foto's": photos.map((p) => ({ url: p.url })),
    };

    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(env.AIRTABLE_TABLE)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: [{ fields }], typecast: true }),
      }
    );

    if (!airtableRes.ok) {
      const detail = await airtableRes.text();
      console.error('Airtable error', airtableRes.status, detail);
      // De gegevens staan veilig in R2 (metadata.json) — geen lead verloren.
      return json(
        { ok: false, message: 'Aanmelden lukt nu even niet. Neem contact op via WhatsApp, dan helpen we je direct.' },
        502
      );
    }

    return json({ ok: true, message: 'Aanvraag ontvangen!', requestId }, 200);
  } catch (err) {
    console.error('Submit error:', err);
    return json({ ok: false, message: 'Er ging iets mis bij het verwerken' }, 500);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
