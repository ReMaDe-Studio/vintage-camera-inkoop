// Pages Function: POST /api/submit
// Ontvangt formulier + foto's, slaat op in R2, max 10MB totaal per aanvraag

export async function onRequestPost({ request, env }) {
  try {
    const formData = await request.formData();
    
    // Valideer totale grootte
    const files = formData.getAll('fotos');
    let totalSize = 0;
    for (const file of files) {
      if (file instanceof File) {
        totalSize += file.size;
        if (file.size > 10 * 1024 * 1024) {
          return new Response(JSON.stringify({ 
            ok: false, 
            message: 'Eén bestand is groter dan 10MB' 
          }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
      }
    }
    
    if (totalSize > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ 
        ok: false, 
        message: 'Totale upload is groter dan 10MB' 
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Genereer unieke ID voor deze aanvraag
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    // Verzamel metadata
    const metadata = {
      id: requestId,
      timestamp,
      naam: formData.get('naam') || '',
      telefoon: formData.get('telefoon') || '',
      email: formData.get('email') || '',
      woonplaats: formData.get('woonplaats') || '',
      merk: formData.get('merk') || '',
      modelnaam: formData.get('modelnaam') || '',
      kleur: formData.get('kleur') || '',
      staat: formData.get('staat') || '',
      batterij: formData.get('batterij') || '',
      lader: formData.get('lader') || '',
      doos: formData.get('doos') || '',
      accessoires: formData.getAll('accessoires'),
      files: []
    };

    // Upload foto's naar R2
    const uploadPromises = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file instanceof File) {
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${requestId}/${i}.${ext}`;
        
        metadata.files.push({
          originalName: file.name,
          storedAs: fileName,
          size: file.size,
          type: file.type
        });

        uploadPromises.push(
          env.camera_uploads.put(fileName, file.stream(), {
            httpMetadata: { contentType: file.type }
          })
        );
      }
    }

    await Promise.all(uploadPromises);

    // Sla metadata op
    await env.camera_uploads.put(
      `${requestId}/metadata.json`,
      JSON.stringify(metadata, null, 2),
      { httpMetadata: { contentType: 'application/json' } }
    );

    return new Response(JSON.stringify({ 
      ok: true, 
      message: 'Aanvraag ontvangen!',
      requestId 
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (err) {
    console.error('Submit error:', err);
    return new Response(JSON.stringify({ 
      ok: false, 
      message: 'Er ging iets mis bij het verwerken' 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
