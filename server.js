import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import { generateListingKit } from './lib/generator.js';
import { ensureDataDirs, listProjects, getProject, saveProject, UPLOADS_DIR } from './lib/storage.js';
import { buildListingCardSvg } from './lib/assets.js';
import { createProjectZip } from './lib/exporter.js';
import { buildEtsyAuthUrl, getEtsyImplementationStatus } from './lib/etsy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const uploadMaxMb = Number(process.env.UPLOAD_MAX_MB || 50);

await ensureDataDirs();

const upload = multer({
  dest: UPLOADS_DIR,
  limits: {
    fileSize: uploadMaxMb * 1024 * 1024,
    files: 20
  }
});

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

function basicAuth(req, res, next) {
  const configuredUser = process.env.APP_USERNAME;
  const configuredPass = process.env.APP_PASSWORD;
  if (!configuredUser || !configuredPass) return next();

  const header = req.headers.authorization || '';
  const [type, encoded] = header.split(' ');
  if (type === 'Basic' && encoded) {
    const [user, pass] = Buffer.from(encoded, 'base64').toString('utf8').split(':');
    if (user === configuredUser && pass === configuredPass) return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Etsy Listing Factory"');
  return res.status(401).send('Authentication required');
}

app.use(basicAuth);
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
  res.json({ ok: true, app: 'etsy-digital-product-listing-factory', version: '0.1.0' });
});

app.get('/api/projects', async (req, res, next) => {
  try {
    res.json({ projects: await listProjects() });
  } catch (error) {
    next(error);
  }
});

app.get('/api/projects/:id', async (req, res, next) => {
  try {
    res.json(await getProject(req.params.id));
  } catch (error) {
    next(error);
  }
});

app.post('/api/projects', upload.array('files'), async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    const input = {
      productName: req.body.productName || '',
      brandName: req.body.brandName || 'Bliss Fox Studio',
      productType: req.body.productType || 'Digital download',
      theme: req.body.theme || '',
      style: req.body.style || '',
      targetBuyer: req.body.targetBuyer || '',
      keywords: req.body.keywords || '',
      includedFiles: req.body.includedFiles || '',
      commercialUse: req.body.commercialUse || 'Personal use only',
      priceTarget: req.body.priceTarget || '',
      tone: req.body.tone || 'warm, clear, buyer-friendly',
      notes: req.body.notes || ''
    };

    const uploads = (req.files || []).map((file) => ({
      fieldName: file.fieldname,
      originalName: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      filename: file.filename
    }));

    const generation = await generateListingKit(input);
    const project = {
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      generationMode: generation.mode,
      generationError: generation.error || null,
      input,
      uploads,
      output: generation.output
    };

    await saveProject(project);
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
});

app.get('/api/projects/:id/cards/:index.svg', async (req, res, next) => {
  try {
    const project = await getProject(req.params.id);
    const index = Math.max(0, Number(req.params.index || 1) - 1);
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.send(buildListingCardSvg(project, index));
  } catch (error) {
    next(error);
  }
});

app.get('/api/projects/:id/export.zip', async (req, res, next) => {
  try {
    const project = await getProject(req.params.id);
    const { zipPath, zipName } = await createProjectZip(project);
    res.download(zipPath, zipName);
  } catch (error) {
    next(error);
  }
});

app.get('/api/etsy/status', (req, res) => {
  res.json(getEtsyImplementationStatus());
});

app.get('/api/etsy/auth-url', (req, res, next) => {
  try {
    const auth = buildEtsyAuthUrl({
      clientId: process.env.ETSY_CLIENT_ID,
      redirectUri: process.env.ETSY_REDIRECT_URI
    });
    res.json({
      ...auth,
      warning: 'Store verifier and state securely before using this in production. This endpoint is a scaffold for the next Etsy integration phase.'
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/etsy/callback', (req, res) => {
  res.status(501).json({
    message: 'Etsy OAuth callback scaffold received the request. Token exchange is intentionally not enabled in this MVP.',
    query: req.query
  });
});

app.delete('/api/projects/:id', async (req, res, next) => {
  try {
    const project = await getProject(req.params.id);
    if (Array.isArray(project.uploads)) {
      for (const uploadFile of project.uploads) {
        if (uploadFile.path) await fs.rm(uploadFile.path, { force: true });
      }
    }
    await fs.rm(path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'projects', `${req.params.id}.json`), { force: true });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    error: error.message || 'Unexpected server error'
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Etsy Digital Product Listing Factory running on port ${port}`);
});
