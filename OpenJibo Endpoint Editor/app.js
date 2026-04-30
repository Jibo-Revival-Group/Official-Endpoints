// OpenJiboOS Mirror Editor - Main Application Module

// Constants
const RELEASE_TYPES = {
  NT: {label: "Nightly", color: "#9333ea", bg: "#f3e8ff"},
  BF: {label: "Bug Fix", color: "#065f46", bg: "#d1fae5"},
  RC: {label: "Recommended", color: "#0369a1", bg: "#e0f2fe"},
  RT: {label: "Remote", color: "#92400e", bg: "#fef3c7"},
  NW: {label: "New Features", color: "#065f46", bg: "#d1fae5"},
  IP: {label: "Improvements", color: "#1e40af", bg: "#dbeafe"},
  RF: {label: "Refactored", color: "#5b21b6", bg: "#ede9fe"},
  BC: {label: "Breaking Change", color: "#991b1b", bg: "#fee2e2"}
};

const FLAGS = {US: "🇺🇸", GR: "🇬🇷", DE: "🇩🇪", UK: "🇬🇧", FR: "🇫🇷", JP: "🇯🇵"};

// Application state
let data = null;
let view = "empty"; // empty | countries | hosts | releases
let selCountry = null;
let selHost = null;
let modal = null; // null | "addHost" | "addRelease" | "editRelease"
let editTarget = null;
let confirmCb = null;
let currentTheme = localStorage.getItem('theme') || 'light';

// Initialize with empty data
data = { mirrors: [] };

// Theme management
export function initTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeIcon();
}

export function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  localStorage.setItem('theme', currentTheme);
  updateThemeIcon();
}

function updateThemeIcon() {
  const icon = document.querySelector('.theme-toggle md-icon');
  if (icon) {
    icon.textContent = currentTheme === 'light' ? 'dark_mode' : 'light_mode';
  }
}

// Data functions
function getCountries() {
  const countries = {};
  data.mirrors.forEach(m => {
    if (!countries[m.location]) countries[m.location] = [];
    countries[m.location].push(m);
  });
  return countries;
}

function getHosts(country) {
  return data.mirrors.filter(m => m.location === country);
}

// Utility functions
export function renderTag(code) {
  const t = RELEASE_TYPES[code] || {label: code, color: "#555", bg: "#eee"};
  return `<span class="tag" style="background:${t.bg};color:${t.color}">${t.label}</span>`;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {year: 'numeric', month: 'short', day: 'numeric'});
  } catch {
    return iso;
  }
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Dialog functions
export function showConfirm(msg, cb) {
  confirmCb = cb;
  const app = document.getElementById('app');
  let el = document.getElementById('confirm-modal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'confirm-modal';
    app.appendChild(el);
  }
  el.innerHTML = `<div class="confirm-modal"><div class="confirm-box"><p class="confirm-msg">${msg}</p><div class="confirm-actions"><md-outlined-button onclick="closeConfirm()">Cancel</md-outlined-button><md-filled-button onclick="doConfirm()" style="--md-filled-button-container-color: var(--md-sys-color-error); --md-filled-button-label-text-color: var(--md-sys-color-on-error)">Delete</md-filled-button></div></div></div>`;
}

function closeConfirm() {
  const el = document.getElementById('confirm-modal');
  if (el) el.innerHTML = '';
  confirmCb = null;
}

function doConfirm() {
  if (confirmCb) confirmCb();
  closeConfirm();
}

// Rendering functions
export function render() {
  const app = document.getElementById('app');
  let html = '<div class="wrap">';

  if (view === 'empty') {
    html += renderEmptyView();
  } else {
    // breadcrumbs
    html += `<div class="step-bar">`;
    if (view === 'countries') {
      html += `<span class="crumb active">Countries</span>`;
    } else if (view === 'hosts') {
      html += `<span class="crumb" style="cursor:pointer;color:var(--app-primary)" onclick="goCountries()">Countries</span><span class="crumb-sep">›</span><span class="crumb active">${selCountry}</span>`;
    } else {
      html += `<span class="crumb" style="cursor:pointer;color:var(--app-primary)" onclick="goCountries()">Countries</span><span class="crumb-sep">›</span><span class="crumb" style="cursor:pointer;color:var(--app-primary)" onclick="goHosts()">`;
      html += selCountry;
      html += `</span><span class="crumb-sep">›</span><span class="crumb active">${selHost ? selHost.name : ''}</span>`;
    }
    html += `</div>`;

    if (view === 'countries') {
      html += renderCountriesView();
    } else if (view === 'hosts') {
      html += renderHostsView();
    } else {
      html += renderReleasesView();
    }

    // export
    html += `<div class="export-bar">`;
    if (view === 'countries') {
      html += `<md-outlined-button onclick="loadFile()">Load JSON file</md-outlined-button>`;
    }
    html += `<md-filled-button onclick="exportJSON()"><md-icon>download</md-icon> Export JSON</md-filled-button></div>`;
  }

  html += '</div>';
  app.innerHTML = html;
}

function renderEmptyView() {
  return `
    <div style="text-align: center; padding: 60px 20px;">
      <div style="font-size: 48px; margin-bottom: 24px; color: var(--app-text-secondary);">
        <md-icon style="font-size: 48px; height: 48px; width: 48px;">folder_open</md-icon>
      </div>
      <h1 class="md-typescale-headline-medium" style="margin-bottom: 16px; color: var(--app-text);">OpenJiboOS Mirror Editor</h1>
      <p class="md-typescale-body-large" style="margin-bottom: 32px; color: var(--app-text-secondary); max-width: 500px; margin-left: auto; margin-right: auto;">
        Create a new mirror database or import an existing one to get started managing OpenJiboOS mirrors and releases.
      </p>
      <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
        <md-filled-button onclick="createNewDatabase()">
          <md-icon>add_circle</md-icon>
          Create New Database
        </md-filled-button>
        <md-outlined-button onclick="loadFile()">
          <md-icon>upload_file</md-icon>
          Import JSON File
        </md-outlined-button>
      </div>
      <div style="margin-top: 40px;">
        <p class="md-typescale-body-small" style="color: var(--app-text-secondary);">
          Supported format: JSON files with mirror and release data
        </p>
      </div>
    </div>
  `;
}

function renderCountriesView() {
  const countries = getCountries();
  let html = `<div class="section-label">Select a country</div><div class="grid">`;
  Object.entries(countries).forEach(([loc, mirrors]) => {
    const flag = FLAGS[loc] || '🌐';
    html += `<div class="tile" onclick="selectCountry('${loc}')">
      <div class="flag">${flag}</div>
      <div class="tile-title">${loc}</div>
      <div class="tile-sub">${mirrors.length} host${mirrors.length !== 1 ? 's' : ''}</div>
    </div>`;
  });
  html += `</div>`;
  html += `<div class="add-row"><md-outlined-button onclick="openAddHostModal()">Add host</md-outlined-button></div>`;
  return html;
}

function renderHostsView() {
  const hosts = getHosts(selCountry);
  const flag = FLAGS[selCountry] || '🌐';
  let html = `<div class="section-label">${flag} ${selCountry} — Select a host</div><div class="grid">`;
  hosts.forEach(h => {
    html += `<div class="tile" onclick="selectHost('${h.id}')">
      <div class="tile-title">${h.name}</div>
      <div class="tile-sub">${h.type}</div>
      <div class="tile-sub" style="margin-top:4px">${h.releases.length} release${h.releases.length !== 1 ? 's' : ''}</div>
    </div>`;
  });
  html += `</div>`;
  html += `<div class="add-row"><md-outlined-button onclick="openAddHostModal()">Add host</md-outlined-button></div>`;
  return html;
}

function renderReleasesView() {
  if (!selHost) return '';
  let html = `<div class="host-header"><div class="host-title">${selHost.name}</div><div class="host-sub">${selHost.baseUrl}</div><div class="tile-sub" style="margin-top:4px">Type: ${selHost.type} &nbsp;·&nbsp; Location: ${selHost.location}</div></div>`;
  html += `<div class="releases-section">`;
  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div class="section-label" style="margin:0">Releases (${selHost.releases.length})</div><div style="display:flex;gap:8px"><md-outlined-button onclick="deleteHost()">Delete host</md-outlined-button><md-filled-button onclick="openAddReleaseModal()"><md-icon>add</md-icon> Add release</md-filled-button></div></div>`;
  if (!selHost.releases.length) {
    html += `<div class="empty">No releases yet. Add one above.</div>`;
  } else {
    selHost.releases.forEach((r, i) => {
      const tags = (r.tags || []).map(t => renderTag(t)).join('');
      html += `<div class="release-card">
        <div class="release-header">
          <div>
            <div class="release-name">${r.name}</div>
            <div class="release-meta">${r.version} &nbsp;·&nbsp; ${formatDate(r.releaseDate)} &nbsp;·&nbsp; ${r.fileSize}</div>
          </div>
          <div>${r.preRelease ? '<span class="badge-pre">Pre-release</span>' : '<span class="badge-stable">Stable</span>'}</div>
        </div>
        ${tags ? `<div class="tags-row">${tags}</div>` : ''}
        <div class="actions">
          <md-outlined-button onclick="openEditRelease(${i})">Edit</md-outlined-button>
          <md-outlined-button onclick="deleteRelease(${i})" style="--md-outlined-button-label-text-color: var(--md-sys-color-error)">Delete</md-outlined-button>
        </div>
      </div>`;
    });
  }
  html += `</div>`;
  return html;
}

// Modal functions
export function renderModal() {
  let el = document.getElementById('modal-layer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'modal-layer';
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:100;pointer-events:none;';
    document.body.appendChild(el);
  }
  
  if (modal === null) {
    el.innerHTML = '';
    el.style.display = 'none';
    return;
  }
  
  el.style.display = 'block';
  el.style.pointerEvents = 'auto';

  if (modal === 'addHost') {
    el.innerHTML = `<div class="modal-bg" onclick="handleModalBgClick(event)"><div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">Add host</div>
      <div class="field"><label>Name *</label><md-outlined-text-field id="m-name" placeholder="OpenJiboOS Mirror EU"></md-outlined-text-field></div>
      <div class="field-row">
        <div class="field"><label>Location (country code) *</label><md-outlined-text-field id="m-loc" placeholder="US" maxlength="3"></md-outlined-text-field></div>
        <div class="field"><label>Type *</label><md-outlined-text-field id="m-type" placeholder="OpenJiboOS"></md-outlined-text-field></div>
      </div>
      <div class="field"><label>Base URL *</label><md-outlined-text-field id="m-url" placeholder="https://..."></md-outlined-text-field></div>
      <div class="modal-actions">
        <md-outlined-button onclick="closeModal()">Cancel</md-outlined-button>
        <md-filled-button onclick="saveHost()">Add host</md-filled-button>
      </div>
    </div></div>`;
  }

  if (modal === 'addRelease' || modal === 'editRelease') {
    const r = editTarget || {};
    const checkedTags = r.tags || [];
    const tagChecks = Object.entries(RELEASE_TYPES).map(([code, t]) => `<label><md-checkbox value="${code}" ${checkedTags.includes(code) ? 'checked' : ''}></md-checkbox> ${t.label}</label>`).join('');
    el.innerHTML = `<div class="modal-bg" onclick="handleModalBgClick(event)"><div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">${modal === 'addRelease' ? 'Add release' : 'Edit release'}</div>
      <div class="field-row">
        <div class="field"><label>Version *</label><md-outlined-text-field id="m-ver" value="${r.version || ''}" placeholder="1.0.0"></md-outlined-text-field></div>
        <div class="field"><label>Version tag *</label><md-outlined-text-field id="m-vtag" value="${r.versionTag || ''}" placeholder="v1.0.0"></md-outlined-text-field></div>
      </div>
      <div class="field"><label>Name *</label><md-outlined-text-field id="m-rname" value="${(r.name || '').replace(/"/g, '&quot;')}" placeholder="Release name"></md-outlined-text-field></div>
      <div class="field"><label>Description *</label><md-outlined-text-field id="m-desc" rows="4">${r.description || ''}</md-outlined-text-field></div>
      <div class="field-row">
        <div class="field"><label>Release date *</label><md-outlined-text-field id="m-date" type="datetime-local" value="${r.releaseDate ? r.releaseDate.slice(0, 16) : ''}"></md-outlined-text-field></div>
        <div class="field"><label>Pre-release? *</label><md-select id="m-pre" value="${r.preRelease ? 'true' : 'false'}"><md-select-option value="false">Stable</md-select-option><md-select-option value="true">Pre-release</md-select-option></md-select></div>
      </div>
      <div class="field"><label>Download URL *</label><md-outlined-text-field id="m-dl" value="${(r.downloadUrl || '').replace(/"/g, '&quot;')}" placeholder="https://..."></md-outlined-text-field></div>
      <div class="field"><label>Repo URL *</label><md-outlined-text-field id="m-repo" value="${(r.repoUrl || '').replace(/"/g, '&quot;')}" placeholder="https://..."></md-outlined-text-field></div>
      <div class="field-row">
        <div class="field"><label>Release ID *</label><md-outlined-text-field id="m-rid" value="${r.releaseId || ''}" placeholder="1234567"></md-outlined-text-field></div>
        <div class="field"><label>File size *</label><md-outlined-text-field id="m-size" value="${r.fileSize || ''}" placeholder="45.2 MB"></md-outlined-text-field></div>
      </div>
      <div class="field"><label>Checksum *</label><md-outlined-text-field id="m-chk" value="${(r.checksum || '').replace(/"/g, '&quot;')}" placeholder="sha256:..."></md-outlined-text-field></div>
      <div class="field"><label>Tags (optional)</label><div class="tags-check">${tagChecks}</div></div>
      <div class="modal-actions">
        <md-outlined-button onclick="closeModal()">Cancel</md-outlined-button>
        <md-filled-button onclick="saveRelease()">${modal === 'addRelease' ? 'Add release' : 'Save changes'}</md-filled-button>
      </div>
    </div></div>`;
  }
}

// Modal control functions
export function openAddHostModal() {
  modal = 'addHost';
  renderModal();
}

export function openAddReleaseModal() {
  modal = 'addRelease';
  editTarget = null;
  renderModal();
}

export function openEditRelease(i) {
  modal = 'editRelease';
  editTarget = {...selHost.releases[i], _idx: i};
  renderModal();
}

export function closeModal() {
  console.log('Closing modal');
  modal = null;
  editTarget = null;
  renderModal();
  // Force a re-render of the main view to ensure GUI is responsive
  setTimeout(() => {
    render();
  }, 10);
}

export function handleModalBgClick(event) {
  // Close modal when clicking on background
  if (event.target.classList.contains('modal-bg')) {
    closeModal();
  }
}

// Data manipulation functions
export function saveHost() {
  const nameField = document.getElementById('m-name');
  const locField = document.getElementById('m-loc');
  const typeField = document.getElementById('m-type');
  const urlField = document.getElementById('m-url');
  
  const name = nameField.value.trim();
  const loc = locField.value.trim().toUpperCase();
  const type = typeField.value.trim();
  const url = urlField.value.trim();
  
  if (!name || !loc || !type || !url) {
    alert('Please fill in all required fields.');
    return;
  }
  const id = slugify(name);
  data.mirrors.push({id, name, location: loc, type, baseUrl: url, releases: []});
  closeModal();
  selCountry = loc;
  selHost = data.mirrors.find(m => m.id === id);
  view = 'releases';
  render();
}

export function saveRelease() {
  const verField = document.getElementById('m-ver');
  const vtagField = document.getElementById('m-vtag');
  const nameField = document.getElementById('m-rname');
  const descField = document.getElementById('m-desc');
  const dateField = document.getElementById('m-date');
  const preField = document.getElementById('m-pre');
  const dlField = document.getElementById('m-dl');
  const repoField = document.getElementById('m-repo');
  const ridField = document.getElementById('m-rid');
  const sizeField = document.getElementById('m-size');
  const chkField = document.getElementById('m-chk');
  
  const ver = verField.value.trim();
  const vtag = vtagField.value.trim();
  const name = nameField.value.trim();
  const desc = descField.value.trim();
  const date = dateField.value;
  const pre = preField.value === 'true';
  const dl = dlField.value.trim();
  const repo = repoField.value.trim();
  const rid = ridField.value.trim();
  const size = sizeField.value.trim();
  const chk = chkField.value.trim();
  const tags = [...document.querySelectorAll('#modal-layer md-checkbox[checked], #modal-layer md-checkbox:checked')].map(c => c.value);
  
  if (!ver || !vtag || !name || !desc || !date || !dl || !repo || !rid || !size || !chk) {
    alert('Please fill in all required fields (tags are optional).');
    return;
  }
  
  // Validate and format date
  let releaseDate;
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date');
    }
    releaseDate = dateObj.toISOString();
  } catch (error) {
    alert('Please enter a valid release date.');
    return;
  }
  
  const release = {version: ver, versionTag: vtag, name, description: desc, releaseDate, preRelease: pre, downloadUrl: dl, repoUrl: repo, releaseId: rid, tags, fileSize: size, checksum: chk};
  
  const hostIdx = data.mirrors.findIndex(m => m.id === selHost.id);
  if (modal === 'addRelease') {
    data.mirrors[hostIdx].releases.push(release);
  } else {
    data.mirrors[hostIdx].releases[editTarget._idx] = release;
  }
  selHost = data.mirrors[hostIdx];
  closeModal();
  render();
}

export function deleteRelease(i) {
  showConfirm(`Delete release "${selHost.releases[i].name}"? This cannot be undone.`, () => {
    const hostIdx = data.mirrors.findIndex(m => m.id === selHost.id);
    data.mirrors[hostIdx].releases.splice(i, 1);
    selHost = data.mirrors[hostIdx];
    render();
  });
}

export function deleteHost() {
  showConfirm(`Delete host "${selHost.name}" and all its releases? This cannot be undone.`, () => {
    data.mirrors = data.mirrors.filter(m => m.id !== selHost.id);
    selHost = null;
    view = 'hosts';
    const remaining = getHosts(selCountry);
    if (!remaining.length) {
      view = 'countries';
      selCountry = null;
    }
    render();
  });
}

// Navigation functions
export function selectCountry(loc) {
  selCountry = loc;
  view = 'hosts';
  render();
}

export function selectHost(id) {
  selHost = data.mirrors.find(m => m.id === id);
  view = 'releases';
  render();
}

export function goCountries() {
  view = 'countries';
  selCountry = null;
  selHost = null;
  render();
}

export function goHosts() {
  view = 'hosts';
  selHost = null;
  render();
}

// Database operations
export function createNewDatabase() {
  console.log('Creating new database');
  data = { mirrors: [] };
  view = 'countries';
  selCountry = null;
  selHost = null;
  render();
}

// File operations
export function loadFile() {
  console.log('loadFile called');
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json';
  inp.style.display = 'none';
  document.body.appendChild(inp);
  
  inp.onchange = e => {
    console.log('File input change triggered');
    const f = e.target.files[0];
    if (!f) {
      console.log('No file selected');
      return;
    }
    console.log('File selected:', f.name);
    const reader = new FileReader();
    reader.onload = ev => {
      console.log('File loaded, parsing JSON');
      try {
        const jsonData = JSON.parse(ev.target.result);
        console.log('JSON parsed successfully', jsonData);
        data = jsonData;
        view = 'countries';
        selCountry = null;
        selHost = null;
        render();
        console.log('UI updated with new data');
      } catch (error) {
        console.error('JSON parsing error:', error);
        alert('Invalid JSON file. Please check the file format.');
      }
    };
    reader.onerror = (error) => {
      console.error('File reading error:', error);
      alert('Error reading file.');
    };
    reader.readAsText(f);
  };
  
  inp.click();
  // Clean up after a delay to allow the file dialog to open
  setTimeout(() => {
    document.body.removeChild(inp);
  }, 1000);
}

export function exportJSON() {
  data.metadata = data.metadata || {};
  data.metadata.lastUpdated = new Date().toISOString();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'OpenJiboOS-Mirrors.json';
  a.click();
  URL.revokeObjectURL(url);
}

// Global function assignments for onclick handlers
window.showConfirm = showConfirm;
window.closeConfirm = closeConfirm;
window.doConfirm = doConfirm;
window.render = render;
window.renderModal = renderModal;
window.openAddHostModal = openAddHostModal;
window.openAddReleaseModal = openAddReleaseModal;
window.openEditRelease = openEditRelease;
window.closeModal = closeModal;
window.saveHost = saveHost;
window.saveRelease = saveRelease;
window.deleteRelease = deleteRelease;
window.deleteHost = deleteHost;
window.selectCountry = selectCountry;
window.selectHost = selectHost;
window.goCountries = goCountries;
window.goHosts = goHosts;
window.loadFile = loadFile;
window.exportJSON = exportJSON;
window.toggleTheme = toggleTheme;
window.renderTag = renderTag;
window.initTheme = initTheme;
window.createNewDatabase = createNewDatabase;
window.handleModalBgClick = handleModalBgClick;

// Initialize the application when the module loads
initTheme();
render();
