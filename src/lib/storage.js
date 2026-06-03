import fs from 'node:fs/promises';
import path from 'node:path';

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
export const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const EXPORTS_DIR = path.join(DATA_DIR, 'exports');

export async function ensureDataDirs() {
  await fs.mkdir(PROJECTS_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.mkdir(EXPORTS_DIR, { recursive: true });
}

export function projectPath(projectId) {
  return path.join(PROJECTS_DIR, `${projectId}.json`);
}

export async function saveProject(project) {
  await ensureDataDirs();
  const payload = JSON.stringify(project, null, 2);
  await fs.writeFile(projectPath(project.id), payload, 'utf8');
  return project;
}

export async function getProject(projectId) {
  const file = projectPath(projectId);
  const raw = await fs.readFile(file, 'utf8');
  return JSON.parse(raw);
}

export async function listProjects() {
  await ensureDataDirs();
  const files = await fs.readdir(PROJECTS_DIR);
  const projects = [];

  for (const file of files.filter((name) => name.endsWith('.json'))) {
    try {
      const raw = await fs.readFile(path.join(PROJECTS_DIR, file), 'utf8');
      const project = JSON.parse(raw);
      projects.push({
        id: project.id,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        productName: project.input?.productName || project.output?.shortTitle || 'Untitled project',
        productType: project.input?.productType || 'Digital product',
        theme: project.input?.theme || '',
        price: project.output?.pricing?.suggestedPrice || '',
        tags: project.output?.tags || []
      });
    } catch (error) {
      console.warn(`Skipping unreadable project file ${file}:`, error.message);
    }
  }

  return projects.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
}

export async function deleteProject(projectId) {
  await fs.unlink(projectPath(projectId));
}
