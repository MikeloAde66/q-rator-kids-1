// Vercel serverless function (runs server-side only).
//
// Keeps the FAL_KEY secret on the server and proxies a request to
// Fal.ai's flux-lora endpoint, steered by a coloring-book-specific LoRA
// (renderartist/coloringbookflux) so the output is clean black-and-white
// line art instead of a generic illustration.
//
// Called by the "Something else?" custom-character option in
// Create & Color — this is the only part of the feature that costs
// money per use; the 9 preset characters stay on the free, pre-made
// library in src/app/data/coloringSketches.ts.

const FAL_ENDPOINT = 'https://fal.run/fal-ai/flux-lora';
const COLORING_BOOK_LORA =
  'https://huggingface.co/renderartist/coloringbookflux/resolve/main/c0l0ringb00k_Flux_v1_renderartist.safetensors';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    res.status(500).json({ error: "Drawing isn't set up on the server yet." });
    return;
  }

  const subjectRaw = typeof req.body?.subject === 'string' ? req.body.subject : '';
  const subject = subjectRaw.trim().slice(0, 60);
  if (!subject) {
    res.status(400).json({ error: 'Tell me what to draw first!' });
    return;
  }

  const prompt = `c0l0ringb00k, coloring book page, simple cute cartoon ${subject}, thick bold black outlines only, no shading, no gray, no color, white background, large simple open areas easy for a small child to color in, centered, full body visible, kid-friendly, no scary or violent elements`;

  try {
    const falRes = await fetch(FAL_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_size: 'square_hd',
        num_images: 1,
        enable_safety_checker: true,
        loras: [{ path: COLORING_BOOK_LORA, scale: 0.85 }],
      }),
    });

    if (!falRes.ok) {
      const detail = await falRes.text();
      res.status(502).json({ error: 'The drawing robot had trouble with that one.', detail: detail.slice(0, 500) });
      return;
    }

    const data: any = await falRes.json();
    const imageUrl = data?.images?.[0]?.url;
    if (!imageUrl) {
      res.status(502).json({ error: 'No picture came back — try a different idea!' });
      return;
    }

    res.status(200).json({ imageUrl, subject });
  } catch (err: any) {
    res.status(500).json({ error: 'Something went wrong drawing that.', detail: String(err?.message || err) });
  }
}
