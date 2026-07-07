// Pages Function: GET /api/inzendingen-7kq4m9
// Dashboard om inzendingen uit R2 te bekijken.
// Simpel verborgen pad, niet linken op de site.

export async function onRequestGet({ request, env }) {
  // Haal alle inzendingen op uit R2
  const submissions = [];

  try {
    // Lijst alle "mappen" (prefixes) in de bucket
    const objects = await env.camera_uploads.list({ prefix: '', delimiter: '/' });

    for (const prefix of objects.delimitedPrefixes) {
      const folder = prefix.replace('/', '');
      if (!folder) continue;

      try {
        const metaObj = await env.camera_uploads.get(`${folder}/metadata.json`);
        if (!metaObj) continue;

        const text = await metaObj.text();
        const meta = JSON.parse(text);

        // Tel foto's
        const photoKeys = [];
        if (meta.files) {
          for (const f of meta.files) {
            // Genereer een signed URL of directe URL
            // Voor nu: gebruik een proxy-endpoint
            photoKeys.push(f.storedAs);
          }
        }

        submissions.push({
          id: meta.id,
          timestamp: meta.timestamp,
          naam: meta.naam,
          telefoon: meta.telefoon,
          email: meta.email,
          woonplaats: meta.woonplaats,
          merk: meta.merk,
          modelnaam: meta.modelnaam,
          kleur: meta.kleur,
          staat: meta.staat,
          batterij: meta.batterij,
          lader: meta.lader,
          doos: meta.doos,
          accessoires: meta.accessoires || [],
          photoKeys,
          folder
        });
      } catch (e) {
        // skip corrupt entries
      }
    }
  } catch (e) {
    return new Response(`Fout bij ophalen: ${e.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // Sorteer nieuwste eerst
  submissions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Bouw HTML
  const html = buildDashboard(submissions);

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function buildDashboard(submissions) {
  const rows = submissions.map((s) => {
    const date = new Date(s.timestamp);
    const dateStr = date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

    const photosHtml = s.photoKeys.length
      ? s.photoKeys.map((k) => `<a href="/api/foto-7kq4m9?file=${encodeURIComponent(k)}" target="_blank" class="thumb-link">Foto ${s.photoKeys.indexOf(k) + 1}</a>`).join(' ')
      : '<span class="no-photos">Geen foto’s</span>';

    return `<tr>
      <td class="date">${dateStr}<br><small>${timeStr}</small></td>
      <td><strong>${esc(s.naam) || '-'}</strong><br><small>${esc(s.woonplaats) || ''}</small></td>
      <td>${esc(s.telefoon) || '-'}<br><small>${esc(s.email) || ''}</small></td>
      <td>${esc(s.merk)} ${esc(s.modelnaam)}<br><small>${esc(s.kleur)} · ${esc(s.staat)}</small></td>
      <td class="acc">${esc(s.batterij)} / ${esc(s.lader)} / ${esc(s.doos)}</td>
      <td>${photosHtml}</td>
    </tr>`;
  }).join('\n');

  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard | Inzendingen</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; background: #f5f5f0; color: #1a1a1a; padding: 24px; }
  h1 { font-size: 1.5rem; margin-bottom: 4px; }
  .count { color: #666; font-size: 0.9rem; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th { text-align: left; padding: 10px 12px; background: #e8e8e0; border-bottom: 2px solid #ccc; font-weight: 600; white-space: nowrap; }
  td { padding: 10px 12px; border-bottom: 1px solid #ddd; vertical-align: top; }
  tr:hover td { background: #fafaf5; }
  .date { white-space: nowrap; }
  .date small { color: #888; }
  small { color: #888; }
  .acc { white-space: nowrap; }
  .thumb-link { color: #2563eb; text-decoration: none; margin-right: 4px; }
  .thumb-link:hover { text-decoration: underline; }
  .no-photos { color: #999; }
  .empty { padding: 40px; text-align: center; color: #888; }
  .nav { margin-bottom: 16px; }
  .nav a { color: #2563eb; text-decoration: none; font-size: 0.85rem; }
  .nav a:hover { text-decoration: underline; }
  @media (max-width: 800px) {
    table, thead, tbody, th, td, tr { display: block; }
    thead { display: none; }
    td { padding: 8px 12px; border-bottom: none; }
    tr { border-bottom: 2px solid #ccc; margin-bottom: 12px; }
    td::before { content: attr(data-label); display: block; font-weight: 600; font-size: 0.75rem; color: #888; text-transform: uppercase; margin-bottom: 2px; }
  }
</style>
</head>
<body>
<h1>Inzendingen</h1>
<p class="count">${submissions.length} inzendingen</p>

<table>
<thead>
<tr>
  <th>Datum</th>
  <th>Naam / Plaats</th>
  <th>Contact</th>
  <th>Camera / Staat</th>
  <th>Acc.</th>
  <th>Foto’s</th>
</tr>
</thead>
<tbody>
${submissions.length ? rows : '<tr><td colspan="6" class="empty">Nog geen inzendingen</td></tr>'}
</tbody>
</table>
<script>
// Maak mobiel vriendelijk met data-labels
document.querySelectorAll('tbody td').forEach(td => {
  const ths = document.querySelectorAll('thead th');
  const idx = Array.from(td.parentNode.children).indexOf(td);
  if (ths[idx]) td.setAttribute('data-label', ths[idx].textContent);
});
</script>
</body>
</html>`;
}

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}