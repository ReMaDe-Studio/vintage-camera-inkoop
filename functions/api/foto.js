// GET /api/foto?file={key}
// Serveert een foto uit R2. Publiek, zodat Airtable de foto via URL kan ophalen
// en in het record kan tonen. De sleutel is een niet-te-raden UUID-pad en de
// foto's bevatten geen persoonsgegevens — die staan in Airtable, achter login.

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const filePath = url.searchParams.get('file');

  if (!filePath || filePath.includes('..')) {
    return new Response('Ongeldig pad', { status: 400 });
  }

  const obj = await env.camera_uploads.get(filePath);
  if (!obj) {
    return new Response('Niet gevonden', { status: 404 });
  }

  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
