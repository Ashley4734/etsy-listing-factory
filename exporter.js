import fs from 'node:fs/promises';
import path from 'node:path';
import archiver from 'archiver';
import { createWriteStream } from 'node:fs';
import { buildListingCardSvg, listingCardFileName } from './assets.js';
import { EXPORTS_DIR, ensureDataDirs } from './storage.js';

function csvEscape(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function tagsCsv(project) {
  const tags = project.output?.tags || [];
  return ['tag,character_count', ...tags.map((tag) => `${csvEscape(tag)},${String(tag).length}`)].join('\n');
}

function altTextCsv(project) {
  const altTexts = project.output?.altTexts || [];
  return ['image_number,alt_text', ...altTexts.map((text, index) => `${index + 1},${csvEscape(text)}`)].join('\n');
}

function pinterestCsv(project) {
  const pins = project.output?.pinterestPins || [];
  const header = 'pin_number,title,description,board,tags';
  const rows = pins.map((pin, index) => [
    index + 1,
    csvEscape(pin.title),
    csvEscape(pin.description),
    csvEscape(pin.board),
    csvEscape((pin.tags || []).join(', '))
  ].join(','));
  return [header, ...rows].join('\n');
}

function markdown(project) {
  const out = project.output || {};
  const bullets = (out.featureBullets || []).map((item) => `- ${item}`).join('\n');
  const tags = (out.tags || []).join(', ');
  const alt = (out.altTexts || []).map((item, i) => `${i + 1}. ${item}`).join('\n');
  const imagePlan = (out.listingImagePlan || []).map((item, i) => `### ${i + 1}. ${item.name}\nHeadline: ${item.headline}\nSubheadline: ${item.subheadline}\nNotes: ${item.layoutNotes}`).join('\n\n');

  return `# ${out.shortTitle || out.title || 'Etsy Listing Kit'}

## Etsy Title
${out.title || ''}

## Short Title
${out.shortTitle || ''}

## Slug
${out.slug || ''}

## SEO Angle
${out.seoAngle || ''}

## Short Description
${out.shortDescription || ''}

## Feature Bullets
${bullets}

## Full Description
${out.description || ''}

## Tags
${tags}

## Suggested Price
${out.pricing?.suggestedPrice || ''}

${out.pricing?.rationale || ''}

## Alt Text
${alt}

## Listing Image Plan
${imagePlan}

## Customer Warnings / Notes
${(out.customerWarnings || []).map((item) => `- ${item}`).join('\n')}
`;
}

function readme(project) {
  return `Etsy Digital Product Listing Factory Export

Project: ${project.output?.shortTitle || project.input?.productName || project.id}
Created: ${project.createdAt}
Generated mode: ${project.generationMode}

Files in this ZIP:
- etsy-listing.md: Copy/paste-ready Etsy listing copy.
- listing.json: Full structured output.
- tags.csv: Etsy tags and character counts.
- alt-text.csv: Listing image alt text.
- pinterest.csv: Pinterest pin content.
- listing-image-plan.json: The 10-image visual plan.
- listing-cards/*.svg: Editable square SVG listing cards.

SVG card note:
The cards are clean placeholder designs. Replace the preview area with your actual product screenshots/mockups in Canva, Photopea, Figma, or Inkscape.
`;
}

export async function createProjectZip(project) {
  await ensureDataDirs();
  const zipName = `${project.output?.slug || project.id}-listing-kit.zip`;
  const zipPath = path.join(EXPORTS_DIR, zipName);

  await new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);

    archive.append(markdown(project), { name: 'etsy-listing.md' });
    archive.append(JSON.stringify(project.output || {}, null, 2), { name: 'listing.json' });
    archive.append(tagsCsv(project), { name: 'tags.csv' });
    archive.append(altTextCsv(project), { name: 'alt-text.csv' });
    archive.append(pinterestCsv(project), { name: 'pinterest.csv' });
    archive.append(JSON.stringify(project.output?.listingImagePlan || [], null, 2), { name: 'listing-image-plan.json' });
    archive.append(readme(project), { name: 'README.txt' });

    const plan = project.output?.listingImagePlan || [];
    for (let i = 0; i < Math.max(10, plan.length); i++) {
      archive.append(buildListingCardSvg(project, i), { name: `listing-cards/${listingCardFileName(i)}` });
    }

    if (Array.isArray(project.uploads)) {
      for (const upload of project.uploads) {
        if (upload?.path) {
          archive.file(upload.path, { name: `uploaded-reference-files/${upload.originalName || path.basename(upload.path)}` });
        }
      }
    }

    archive.finalize();
  });

  await fs.access(zipPath);
  return { zipPath, zipName };
}
