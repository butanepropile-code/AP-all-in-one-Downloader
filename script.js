/* ==========================================================================
   CONFIG & GLOBAL SETTINGS
   ========================================================================== */
const CONFIG = {
  siteName: "ResourceHub",
  logo: "images/logo.png",
  
  // Countdown durations for each step (in seconds)
  stepDurations: [30, 30, 30, 30, 30, 30],
  
  // Google Sheet Public CSV Link for automatic updates
  googleSheetCsvUrl: "[https://docs.google.com/spreadsheets/d/1RzZkw3LiC0ICwT-Gmp47potgY0OvWw2-iC9XsDeSNNQ/gviz/tq?tqx=out:csv](https://docs.google.com/spreadsheets/d/1RzZkw3LiC0ICwT-Gmp47potgY0OvWw2-iC9XsDeSNNQ/gviz/tq?tqx=out:csv)",
  
  // Local fallback resource array if CSV network fetch fails
  fallbackResources: [
    {
      id: "math-notes-10",
      title: "Mathematics Class 10 Full Notes",
      category: "Class 10",
      description: "Complete chapter-wise formulas and solved exercises.",
      image: "[https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=400&q=80](https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=400&q=80)",
      downloadUrl: "[https://example.com/math-notes.pdf](https://example.com/math-notes.pdf)"
    },
    {
      id: "physics-mod-apk",
      title: "Physics Wallah Modified App",
      category: "Apps",
      description: "Latest premium tools unlock module for educational apps.",
      image: "[https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80](https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80)",
      downloadUrl: "[https://example.com/app-release.apk](https://example.com/app-release.apk)"
    }
  ]
};

/* ==========================================================================
   STATE MANAGEMENT
   ========================================================================== */
let state = {
  resources: [],
  currentResource: null,
  currentStep: 0,
  timer: null,
  timeLeft: 0,
  isTimerFinished: false,
  isScrolledToBottom: false
};

/* ==========================================================================
   INITIALIZATION & GOOGLE SHEETS FETCH
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  initTheme();
  initNavigation();
  initSearchAndFilter();
  loadResources();
});

function initIcons() {
  if (window.lucide) {
    lucide.createIcons();
  }
}

// Fetch resources dynamically from Google Sheet CSV or fallback
async function loadResources() {
  try {
    const response = await fetch(CONFIG.googleSheetCsvUrl);
    if (!response.ok) throw new Error("Google Sheet network response failed.");
    const csvData = await response.text();
    state.resources = parseCsv(csvData);
    if (!state.resources.length) throw new Error("Parsed empty sheet");
  } catch (err) {
    console.warn("Using fallback resources due to fetch issue:", err);
    state.resources = CONFIG.fallbackResources;
  }
  
  populateCategories();
  renderResources(state.resources, 'resource-grid');
  renderResources(state.resources, 'all-resources-grid');
}

// CSV Parser Helper
function parseCsv(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.replace(/^"(.*)"$/, '$1').trim().toLowerCase());
  const list = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"(.*)"$/, '$1').trim());
    if (values.length >= 4) {
      list.push({
        id: values[0] || `res-${i}`,
        title: values[1] || 'Untitled Resource',
        category: values[2] || 'General',
        description: values[3] || 'No description provided.',
        image: values[4] || '[https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80](https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80)',
        downloadUrl: values[5] || '#'
      });
    }
  }
  return list;
}

/* ==========================================================================
   UI RENDERING & SEARCH
   ========================================================================== */
function renderResources(items, targetContainerId) {
  const container = document.getElementById(targetContainerId);
  if (!container) return;

  container.innerHTML = '';
  if (items.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No matching resources found.</p>`;
    return;
  }

  items.forEach(res => {
    const card = document.createElement('div');
    card.className = 'resource-card';
    card.innerHTML = `
      <img src="${res.image}" alt="${escapeHtml(res.title)}" class="card-img" onerror="this.src='[https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80](https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80)'">
      <div class="card-body">
        <span class="card-tag">${escapeHtml(res.category)}</span>
        <h3 class="card-title">${escapeHtml(res.title)}</h3>
        <p class="card-desc">${escapeHtml(res.description)}</p>
        <button class="btn-primary" onclick="startAccessFlow('${res.id}')">Get Resource</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function populateCategories() {
  const select = document.getElementById('category-select');
  if (!select) return;
  const categories = ['ALL', ...new Set(state.resources.map(r => r.category))];
  
  select.innerHTML = categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}

function initSearchAndFilter() {
  const searchInput = document.getElementById('search-input');
  const categorySelect = document.getElementById('category-select');

  const filter = () => {
    const q = searchInput ? searchInput.value.toLowerCase() : '';
    const cat = categorySelect ? categorySelect.value : 'ALL';

    const filtered = state.resources.filter(r => {
      const matchQuery = r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
      const matchCat = cat === 'ALL' || r.category === cat;
      return matchQuery && matchCat;
    });

    renderResources(filtered, 'resource-grid');
  };

  if (searchInput) searchInput.addEventListener('input', filter);
  if (categorySelect) categorySelect.addEventListener('change', filter);
}

/* ==========================================================================
   MULTI-STEP ACCESS FLOW
   ========================================================================== */
function startAccessFlow(resourceId) {
  const resource = state.resources.find(r => r.id === resourceId);
  if (!resource) return;

  state.currentResource = resource;
  state.currentStep = 0;

  switchSection('access-section');
  setupStep(0);
}

function setupStep(stepIndex) {
  state.currentStep = stepIndex;
  state.isTimerFinished = false;
  state.isScrolledToBottom = false;
  state.timeLeft = CONFIG.stepDurations[stepIndex] || 30;

  // Update Progress UI
  document.getElementById('step-badge').innerText = `Step ${stepIndex + 1} of 6`;
  document.getElementById('current-resource-title').innerText = state.currentResource.title;
  
  const progressPercent = ((stepIndex + 1) / 6) * 100;
  document.getElementById('progress-bar-fill').style.width = `${progressPercent}%`;

  // Reset Button
  const btn = document.getElementById('step-continue-btn');
  btn.className = 'btn-disabled';
  btn.disabled = true;
  btn.innerText = 'Wait for Timer...';

  document.getElementById('scroll-notice').innerText = '⏳ Waiting for countdown...';

  // Start Countdown
  clearInterval(state.timer);
  document.getElementById('countdown-display').innerText = state.timeLeft;

  state.timer = setInterval(() => {
    state.timeLeft--;
    document.getElementById('countdown-display').innerText = state.timeLeft;

    if (state.timeLeft <= 0) {
      clearInterval(state.timer);
      state.isTimerFinished = true;
      document.getElementById('scroll-notice').innerText = '👇 Scroll down to the bottom to continue!';
      checkStepRequirements();
    }
  }, 1000);

  // Setup Scroll Listener
  window.removeEventListener('scroll', handleScrollCheck);
  window.addEventListener('scroll', handleScrollCheck);
}

function handleScrollCheck() {
  if (state.isScrolledToBottom) return;

  const threshold = 150; // Distance from bottom in px
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - threshold) {
    state.isScrolledToBottom = true;
    checkStepRequirements();
  }
}

function checkStepRequirements() {
  const btn = document.getElementById('step-continue-btn');
  
  if (state.isTimerFinished && state.isScrolledToBottom) {
    btn.className = 'btn-enabled';
    btn.disabled = false;
    btn.innerText = state.currentStep < 5 ? 'Continue to Next Step ➔' : 'Unlock Final Download ➔';
    btn.onclick = advanceStep;
  } else if (state.isTimerFinished && !state.isScrolledToBottom) {
    btn.innerText = 'Scroll Down to Bottom...';
  }
}

function advanceStep() {
  if (state.currentStep < 5) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setupStep(state.currentStep + 1);
  } else {
    showFinalPage();
  }
}

function showFinalPage() {
  switchSection('final-section');
  document.getElementById('final-title').innerText = state.currentResource.title;
  document.getElementById('final-desc').innerText = state.currentResource.description;
  document.getElementById('final-thumb').src = state.currentResource.image;
  
  const downloadLink = document.getElementById('download-anchor');
  downloadLink.href = state.currentResource.downloadUrl;
}

/* ==========================================================================
   NAVIGATION & THEME
   ========================================================================== */
function initNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const target = e.target.getAttribute('data-target');
      switchSection(target);
    });
  });

  document.getElementById('brand-link').addEventListener('click', (e) => {
    e.preventDefault();
    switchSection('home-section');
  });
}

function switchSection(sectionId) {
  document.querySelectorAll('.app-section').forEach(sec => sec.classList.remove('active'));
  const activeSec = document.getElementById(sectionId);
  if (activeSec) activeSec.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const icon = document.getElementById('theme-icon');
  
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  toggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
