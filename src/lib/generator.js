import OpenAI from 'openai';
import slugify from 'slugify';

function clampText(value, maxLength) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1).trimEnd() + '…';
}

function normalizeTag(tag) {
  return String(tag || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20)
    .trim();
}

function ensureTags(tags, input) {
  const fallback = [
    input.productType,
    input.theme,
    input.style,
    'digital download',
    'printable art',
    'etsy download',
    'wall art',
    'instant download',
    'home decor',
    'gift idea',
    'printable decor',
    'digital print',
    'pdf download'
  ];

  const seen = new Set();
  const cleaned = [...(Array.isArray(tags) ? tags : []), ...fallback]
    .map(normalizeTag)
    .filter(Boolean)
    .filter((tag) => {
      if (seen.has(tag)) return false;
      seen.add(tag);
      return true;
    });

  return cleaned.slice(0, 13);
}

function ensureListingImagePlan(plan, input, title) {
  const defaults = [
    ['Hero Product Preview', title, 'Show the strongest finished preview of the digital product.'],
    ['What Is Included', 'Everything Included', 'Show file types, page count, sizes, and delivery details.'],
    ['Close-Up Detail', 'Detailed Preview', 'Zoom in on texture, linework, colors, or page style.'],
    ['How It Works', 'Download • Print • Enjoy', 'Explain the instant download process in three steps.'],
    ['Size / File Guide', 'File Sizes Included', 'List dimensions, file formats, and usage notes.'],
    ['Lifestyle Mockup', 'Styled In Your Space', 'Show the product in a room, binder, tablet, or printable setting.'],
    ['Collection Preview', 'Preview The Set', 'Show multiple pages or designs in a clean grid.'],
    ['Gift Use Case', 'Great Gift Idea', 'Describe who it is for and when to use it.'],
    ['Important Note', 'Digital Download Only', 'Clarify that no physical item ships.'],
    ['Brand Thank You', 'Thank You For Supporting Small Shops', 'End with a warm brand card and support note.']
  ];

  const combined = Array.isArray(plan) && plan.length ? plan : [];
  const normalized = combined.slice(0, 10).map((item, i) => ({
    name: clampText(item.name || defaults[i]?.[0] || `Listing Image ${i + 1}`, 60),
    headline: clampText(item.headline || defaults[i]?.[1] || title, 80),
    subheadline: clampText(item.subheadline || item.layoutNotes || defaults[i]?.[2] || '', 140),
    layoutNotes: clampText(item.layoutNotes || defaults[i]?.[2] || '', 220)
  }));

  while (normalized.length < 10) {
    const d = defaults[normalized.length];
    normalized.push({ name: d[0], headline: d[1], subheadline: d[2], layoutNotes: d[2] });
  }

  return normalized;
}

function buildFallbackOutput(input) {
  const base = [input.theme, input.style, input.productType].filter(Boolean).join(' ');
  const title = clampText(`${base} Digital Download, Printable Etsy Product, Instant Download, ${input.targetBuyer || 'Gift for Creative Buyers'}`, 138);
  const shortTitle = clampText(`${input.theme || 'Beautiful'} ${input.productType || 'Digital Download'}`, 62);
  const slug = slugify(shortTitle || title, { lower: true, strict: true });
  const description = `Bring a polished, ready-to-use digital product into your shop or personal collection with this ${input.productType || 'digital download'}. This listing is designed around ${input.theme || 'a stylish theme'} with a ${input.style || 'clean'} look and practical files for easy use.\n\nWhat you receive:\n${input.includedFiles || 'Digital files for instant download'}\n\nHow it works:\n1. Purchase the listing.\n2. Download your files from Etsy.\n3. Print, display, color, or use the files according to the included instructions.\n\nPlease note: this is a digital product. No physical item will be shipped.`;

  return {
    title,
    shortTitle,
    slug,
    seoAngle: `Position this as a polished ${input.productType || 'digital product'} for buyers searching around ${input.theme || 'digital downloads'}.`,
    shortDescription: clampText(`${shortTitle} delivered as an instant digital download with clear files and buyer-friendly instructions.`, 250),
    description,
    tags: ensureTags([], input),
    featureBullets: [
      'Instant digital download; no physical item will be shipped.',
      `Designed for ${input.targetBuyer || 'Etsy shoppers looking for useful digital files'}.`,
      `Includes ${input.includedFiles || 'ready-to-use digital files'}.`,
      'Easy to print, save, or use with compatible apps and devices.',
      'Clean listing structure optimized for Etsy buyers.'
    ],
    altTexts: [
      `${shortTitle} digital download preview`,
      `${input.theme || 'Digital'} product included files preview`,
      `${shortTitle} close up detail`,
      `${shortTitle} instant download instructions`,
      `${shortTitle} Etsy listing mockup`
    ],
    pricing: {
      suggestedPrice: input.priceTarget || '$4.99',
      rationale: 'Template-mode pricing; adjust based on page count, file count, niche demand, and competitor quality.'
    },
    listingImagePlan: ensureListingImagePlan([], input, shortTitle),
    pinterestPins: [1, 2, 3, 4, 5].map((num) => ({
      title: clampText(`${shortTitle} - Digital Download Idea ${num}`, 95),
      description: clampText(`Discover this ${input.productType || 'digital product'} with a ${input.style || 'beautiful'} ${input.theme || 'creative'} theme. Great for Etsy shoppers who want instant downloadable files.`, 400),
      board: input.productType?.toLowerCase().includes('color') ? 'Coloring Pages & Books' : 'Printable Digital Products',
      tags: ensureTags([], input).slice(0, 8)
    })),
    customerWarnings: [
      'This is a digital download only.',
      'Colors may vary depending on monitor, printer, paper, and device settings.',
      'For personal use unless your license terms state otherwise.'
    ],
    brandVoice: input.brandName || 'Bliss Fox Studio'
  };
}

function buildPrompt(input) {
  return `You are an expert Etsy SEO copywriter for digital products. Generate a complete Etsy listing kit as strict JSON only. No markdown. No comments.

Product input:
${JSON.stringify(input, null, 2)}

Rules:
- Product is digital unless explicitly stated otherwise.
- Etsy title must be <= 140 characters.
- Return exactly 13 Etsy tags. Each tag must be <= 20 characters.
- Avoid trademarked, celebrity, brand, and copyrighted character terms unless the user explicitly owns the rights.
- Do not claim guaranteed results, bestselling status, or false scarcity.
- Make the listing specific and buyer-focused.
- Full description should include: opening hook, what's included, how it works, usage notes, digital download note, and simple support note.
- Include exactly 10 listingImagePlan items.
- Include exactly 5 pinterestPins.
- Return parseable JSON matching this shape:
{
  "title": "",
  "shortTitle": "",
  "slug": "",
  "seoAngle": "",
  "shortDescription": "",
  "description": "",
  "tags": [""],
  "featureBullets": [""],
  "altTexts": [""],
  "pricing": { "suggestedPrice": "$0.00", "rationale": "" },
  "listingImagePlan": [
    { "name": "", "headline": "", "subheadline": "", "layoutNotes": "" }
  ],
  "pinterestPins": [
    { "title": "", "description": "", "board": "", "tags": [""] }
  ],
  "customerWarnings": [""],
  "brandVoice": ""
}`;
}

function parseJsonFromModel(text) {
  const cleaned = String(text || '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Model did not return JSON.');
    return JSON.parse(match[0]);
  }
}

function normalizeOutput(raw, input) {
  const fallback = buildFallbackOutput(input);
  const output = { ...fallback, ...raw };
  output.title = clampText(output.title, 140);
  output.shortTitle = clampText(output.shortTitle || fallback.shortTitle, 70);
  output.slug = slugify(output.slug || output.shortTitle || output.title, { lower: true, strict: true });
  output.tags = ensureTags(output.tags, input);
  output.featureBullets = Array.isArray(output.featureBullets) ? output.featureBullets.slice(0, 8) : fallback.featureBullets;
  output.altTexts = Array.isArray(output.altTexts) ? output.altTexts.slice(0, 10) : fallback.altTexts;
  output.listingImagePlan = ensureListingImagePlan(output.listingImagePlan, input, output.shortTitle || output.title);
  output.pinterestPins = Array.isArray(output.pinterestPins) && output.pinterestPins.length ? output.pinterestPins.slice(0, 5) : fallback.pinterestPins;
  output.pinterestPins = output.pinterestPins.map((pin) => ({
    title: clampText(pin.title, 100),
    description: clampText(pin.description, 500),
    board: clampText(pin.board, 80),
    tags: ensureTags(pin.tags || output.tags, input).slice(0, 10)
  }));
  output.customerWarnings = Array.isArray(output.customerWarnings) ? output.customerWarnings : fallback.customerWarnings;
  output.description = String(output.description || fallback.description).trim();
  return output;
}

export async function generateListingKit(input) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      mode: 'template',
      output: buildFallbackOutput(input)
    };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0.65,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You generate strict JSON for Etsy digital product listing assets.' },
        { role: 'user', content: buildPrompt(input) }
      ]
    });

    const text = response.choices?.[0]?.message?.content || '';
    const raw = parseJsonFromModel(text);
    return {
      mode: 'ai',
      output: normalizeOutput(raw, input)
    };
  } catch (error) {
    console.error('AI generation failed, falling back to template mode:', error.message);
    return {
      mode: 'template-fallback',
      error: error.message,
      output: buildFallbackOutput(input)
    };
  }
}
