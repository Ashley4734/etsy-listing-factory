const CARD_WIDTH = 2700;
const CARD_HEIGHT = 2700;

function escapeXml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function wrapText(text, maxChars = 38, maxLines = 4) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length === maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  return lines.length ? lines : ['Listing Image'];
}

export function buildListingCardSvg(project, index = 0) {
  const output = project.output || {};
  const cards = Array.isArray(output.listingImagePlan) ? output.listingImagePlan : [];
  const card = cards[index] || cards[0] || {
    name: 'Hero Image',
    headline: output.shortTitle || output.title || 'Digital Product',
    subheadline: 'Instant download listing asset',
    layoutNotes: 'Use your best product preview as the focal point.'
  };

  const productType = project.input?.productType || 'Digital Product';
  const titleLines = wrapText(card.headline || card.name, 32, 3);
  const subLines = wrapText(card.subheadline || card.layoutNotes || output.shortDescription, 46, 4);
  const badge = card.name || `Card ${index + 1}`;
  const footer = output.brandVoice || 'Etsy Digital Listing Kit';

  const titleTspans = titleLines.map((line, i) => `<tspan x="180" dy="${i === 0 ? 0 : 132}">${escapeXml(line)}</tspan>`).join('');
  const subTspans = subLines.map((line, i) => `<tspan x="180" dy="${i === 0 ? 0 : 72}">${escapeXml(line)}</tspan>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f7f1e8"/>
      <stop offset="100%" stop-color="#ddd0bf"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="28" stdDeviation="34" flood-color="#3d2f25" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="2700" height="2700" fill="url(#bg)"/>
  <circle cx="2320" cy="280" r="360" fill="#ffffff" opacity="0.35"/>
  <circle cx="260" cy="2420" r="420" fill="#ffffff" opacity="0.25"/>
  <rect x="150" y="150" width="2400" height="2400" rx="86" fill="#fffaf3" opacity="0.92" filter="url(#shadow)"/>
  <rect x="250" y="250" width="2200" height="1160" rx="68" fill="#e8ddd0"/>
  <rect x="360" y="360" width="1980" height="940" rx="46" fill="#fbf7f0" stroke="#c5aa88" stroke-width="8" stroke-dasharray="28 22"/>
  <text x="1350" y="815" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="84" fill="#7b6248">${escapeXml(productType)}</text>
  <text x="1350" y="950" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="46" fill="#9b8158" letter-spacing="4">PLACE PRODUCT PREVIEW HERE</text>
  <rect x="180" y="1520" width="620" height="86" rx="43" fill="#9b8158"/>
  <text x="490" y="1577" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="38" fill="#ffffff" font-weight="700">${escapeXml(badge)}</text>
  <text x="180" y="1775" font-family="Georgia, 'Times New Roman', serif" font-size="112" font-weight="700" fill="#2f2923">${titleTspans}</text>
  <text x="180" y="2215" font-family="Arial, Helvetica, sans-serif" font-size="58" fill="#615448">${subTspans}</text>
  <line x1="180" y1="2420" x2="2520" y2="2420" stroke="#d7c6b3" stroke-width="4"/>
  <text x="180" y="2515" font-family="Arial, Helvetica, sans-serif" font-size="42" fill="#7d6b5b">${escapeXml(footer)}</text>
  <text x="2520" y="2515" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="42" fill="#7d6b5b">Instant Download</text>
</svg>`;
}

export function listingCardFileName(index) {
  return `listing-card-${String(index + 1).padStart(2, '0')}.svg`;
}
