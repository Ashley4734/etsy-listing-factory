const form = document.getElementById('projectForm');
const output = document.getElementById('output');
const outputMeta = document.getElementById('outputMeta');
const loading = document.getElementById('loading');
const downloadZip = document.getElementById('downloadZip');
const generateButton = document.getElementById('generateButton');
const projectsEl = document.getElementById('projects');
const refreshProjects = document.getElementById('refreshProjects');
const aiMode = document.getElementById('aiMode');

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function copyBlock(title, content) {
  return `<h3>${escapeHtml(title)}</h3><div class="copy-block"><pre>${escapeHtml(content || '')}</pre></div>`;
}

function renderTags(tags = []) {
  return `<div class="badges">${tags.map((tag) => `<span class="badge ${tag.length > 20 ? 'warn' : ''}">${escapeHtml(tag)} <small>${tag.length}</small></span>`).join('')}</div>`;
}

function renderProject(project) {
  const out = project.output || {};
  downloadZip.href = `/api/projects/${project.id}/export.zip`;
  downloadZip.classList.remove('disabled');
  outputMeta.textContent = `Generated ${new Date(project.createdAt).toLocaleString()} • Mode: ${project.generationMode}`;

  const bullets = (out.featureBullets || []).map((item) => `• ${item}`).join('\n');
  const warnings = (out.customerWarnings || []).map((item) => `• ${item}`).join('\n');
  const pins = (out.pinterestPins || []).map((pin, i) => `${i + 1}. ${pin.title}\nBoard: ${pin.board}\n${pin.description}\nTags: ${(pin.tags || []).join(', ')}`).join('\n\n');
  const cards = Array.from({ length: 10 }, (_, i) => `
    <div class="card-preview">
      <img src="/api/projects/${project.id}/cards/${i + 1}.svg" alt="Listing card ${i + 1}">
      <a href="/api/projects/${project.id}/cards/${i + 1}.svg" target="_blank">Open card ${i + 1}</a>
    </div>
  `).join('');

  output.classList.remove('empty');
  output.innerHTML = `
    ${project.generationError ? `<div class="copy-block"><strong>AI fallback:</strong> ${escapeHtml(project.generationError)}</div>` : ''}
    ${copyBlock('Etsy Title', out.title)}
    ${copyBlock('Short Description', out.shortDescription)}
    <h3>Tags</h3>${renderTags(out.tags || [])}
    ${copyBlock('Feature Bullets', bullets)}
    ${copyBlock('Full Description', out.description)}
    ${copyBlock('Suggested Price', `${out.pricing?.suggestedPrice || ''}\n${out.pricing?.rationale || ''}`)}
    ${copyBlock('Alt Text', (out.altTexts || []).map((item, i) => `${i + 1}. ${item}`).join('\n'))}
    ${copyBlock('Pinterest Pins', pins)}
    ${copyBlock('Customer Warnings', warnings)}
    <h3>Listing Card SVGs</h3>
    <div class="card-grid">${cards}</div>
  `;
}

async function loadProjects() {
  const res = await fetch('/api/projects');
  const data = await res.json();
  const projects = data.projects || [];
  projectsEl.innerHTML = projects.length ? projects.map((project) => `
    <article class="project-item">
      <h3>${escapeHtml(project.productName)}</h3>
      <p>${escapeHtml(project.productType)} ${project.theme ? '• ' + escapeHtml(project.theme) : ''}</p>
      <div class="small">${new Date(project.updatedAt || project.createdAt).toLocaleString()}</div>
      <div class="project-actions">
        <button class="secondary" data-load="${project.id}">Open</button>
        <a class="button secondary" href="/api/projects/${project.id}/export.zip">ZIP</a>
      </div>
    </article>
  `).join('') : '<p class="small">No projects yet.</p>';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  loading.classList.remove('hidden');
  generateButton.disabled = true;
  downloadZip.classList.add('disabled');
  output.className = 'output empty';
  output.textContent = 'Working…';

  try {
    const formData = new FormData(form);
    const res = await fetch('/api/projects', { method: 'POST', body: formData });
    if (!res.ok) throw new Error((await res.json()).error || 'Generation failed');
    const project = await res.json();
    renderProject(project);
    await loadProjects();
  } catch (error) {
    output.className = 'output empty';
    output.textContent = error.message;
  } finally {
    loading.classList.add('hidden');
    generateButton.disabled = false;
  }
});

projectsEl.addEventListener('click', async (event) => {
  const id = event.target?.dataset?.load;
  if (!id) return;
  const res = await fetch(`/api/projects/${id}`);
  const project = await res.json();
  renderProject(project);
});

refreshProjects.addEventListener('click', loadProjects);

async function init() {
  try {
    await fetch('/health');
    aiMode.textContent = 'Ready';
  } catch (_) {
    aiMode.textContent = 'Offline';
  }
  await loadProjects();
}

init();
