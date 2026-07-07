// Pages Function: GET /api/photo?file={path}
// Proxy om foto's uit R2 naar de browser te serveren

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const filePath = url.searchParams.get('file');

  if (!filePath || filePath.includes('..')) {
    return new Response('Ongeldig pad', { status: 400 });
  }

  try {
    const obj = await env.camera_uploads.get(filePath);
    if (!obj) {
      return new Response('Niet gevonden', { status: 404 });
    }

    return new Response(obj.body, {
      headers: {
        'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (e) {
    return new Response('Fout bij ophalen', { status: 500 });
  }
}