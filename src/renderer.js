const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let games = [];
let selectedId = null;
let activeFilter = 'all';
let toastTimer;
const tones = ['tone-1','tone-2','tone-3','tone-4','tone-5','tone-6'];

function esc(value) { return String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function toneFor(name) { return [...name].reduce((total, char) => total + char.charCodeAt(0), 0) % tones.length; }
function toast(message, isError = false) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.toggle('error', isError);
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 3500);
}
function sortRecent(list) { return [...list].sort((a, b) => (b.lastPlayed || b.addedAt) - (a.lastPlayed || a.addedAt)); }
function selectedGame() { return games.find((game) => game.id === selectedId) || sortRecent(games)[0] || null; }

function gameCard(game) {
  const tone = tones[toneFor(game.name)];
  return `<article class="game-card ${game.id === selectedId ? 'selected' : ''}" data-id="${esc(game.id)}" tabindex="0" role="button" aria-label="Sélectionner ${esc(game.name)}">
    <div class="cover-art ${tone}"><span class="cover-title">${esc(game.name.toUpperCase())}</span></div>
    <div class="game-card-footer"><div><strong>${esc(game.name)}</strong><small>${game.lastPlayed ? 'Joué récemment' : 'Ajouté à la bibliothèque'}</small></div><button class="favorite-mini ${game.favorite ? 'on' : ''}" data-favorite="${esc(game.id)}" title="${game.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${game.favorite ? '★' : '☆'}</button></div>
  </article>`;
}

function updateHero() {
  const game = selectedGame();
  if (!game) {
    $('#featured-title').innerHTML = 'Bienvenue dans<br>GML';
    $('#featured-meta').textContent = 'Tes jeux Windows, réunis au même endroit.';
    $('#hero-hint').textContent = 'Ajoute un fichier .exe pour commencer.';
    $('#featured-play').disabled = true;
    $('#featured-play').style.opacity = '.55';
    return;
  }
  $('#featured-title').textContent = game.name;
  $('#featured-meta').textContent = 'Jeu Windows · lancé avec Wine';
  $('#hero-hint').textContent = game.exePath;
  $('#featured-play').disabled = false;
  $('#featured-play').style.opacity = '1';
}

function render() {
  if (!selectedId || !games.some((game) => game.id === selectedId)) selectedId = sortRecent(games)[0]?.id || null;
  const sorted = sortRecent(games);
  $('#game-count').textContent = String(games.length);
  $('#recent-games').innerHTML = sorted.slice(0, 8).map(gameCard).join('');
  const query = $('#library-search').value.trim().toLowerCase();
  const filtered = sorted.filter((game) => {
    const matchesQuery = game.name.toLowerCase().includes(query);
    return matchesQuery && (activeFilter !== 'favorites' || game.favorite);
  });
  $('#library-grid').innerHTML = filtered.map(gameCard).join('');
  $('#favorites-grid').innerHTML = sorted.filter((game) => game.favorite).map(gameCard).join('');
  $('#empty-home').classList.toggle('hidden', games.length !== 0);
  $('#empty-library').classList.toggle('hidden', filtered.length !== 0);
  $('#empty-favorites').classList.toggle('hidden', sorted.some((game) => game.favorite));
  updateHero();
}

function openPage(page) {
  $$('.page').forEach((section) => section.classList.toggle('active', section.id === `page-${page}`));
  $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.page === page));
  const label = ({home:'ACCUEIL',games:'MES JEUX',controller:'MANETTE',favorites:'FAVORIS',settings:'RÉGLAGES',about:'À PROPOS'})[page] || 'ACCUEIL';
  $('#page-label').textContent = label;
  $('.main-area').scrollTo({ top: 0, behavior: 'smooth' });
}

async function addGame() {
  try {
    const game = await window.gml.addGame();
    if (!game) return;
    games = (await window.gml.getLibrary()).games;
    selectedId = game.id;
    render();
    openPage('games');
    toast(`${game.name} ajouté à ta bibliothèque.`);
  } catch (error) { toast(error.message || 'Impossible d’ajouter ce jeu.', true); }
}

async function playGame(id) {
  const game = games.find((entry) => entry.id === id);
  if (!game) return;
  try {
    await window.gml.playGame(id);
  } catch (error) {
    toast(error.message || 'Le jeu ne peut pas être lancé.', true);
  }
}

document.addEventListener('click', async (event) => {
  const nav = event.target.closest('[data-page]');
  if (nav) openPage(nav.dataset.page);
  const goto = event.target.closest('[data-goto]');
  if (goto) openPage(goto.dataset.goto);
  const add = event.target.closest('#add-game-hero,#empty-add,#add-game-library,#empty-library-add');
  if (add) await addGame();
  const card = event.target.closest('.game-card');
  const fav = event.target.closest('[data-favorite]');
  if (fav) {
    event.stopPropagation();
    const result = await window.gml.toggleFavorite(fav.dataset.favorite);
    games = result.games;
    render();
    return;
  }
  if (card) { selectedId = card.dataset.id; render(); }
  if (event.target.closest('#featured-play')) {
    const game = selectedGame();
    if (game) await playGame(game.id);
  }
  if (event.target.closest('.filter-button')) {
    const button = event.target.closest('.filter-button');
    activeFilter = button.dataset.filter;
    $$('.filter-button').forEach((item) => item.classList.toggle('active', item === button));
    render();
  }
  if (event.target.closest('#search-button')) {
    $('#search-modal').classList.remove('hidden');
    $('#global-search').focus();
  }
  if (event.target.id === 'search-modal') $('#search-modal').classList.add('hidden');
  if (event.target.closest('#quit-button')) window.close();
  if (event.target.closest('#show-library-folder')) {
    const path = await window.gml.getLibraryPath();
    if (path) await window.gml.openPath(path);
  }
  if (event.target.closest('#refresh-wine')) await refreshWine();
  if (event.target.closest('#refresh-pad')) detectControllers();
  if (event.target.closest('#home-check-pad')) { detectControllers(); openPage('controller'); }
  if (event.target.closest('#refresh-pad-page')) detectControllers();
});

document.addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.game-card')) {
    event.preventDefault();
    selectedId = event.target.dataset.id;
    render();
  }
  if (event.key === 'Escape') $('#search-modal').classList.add('hidden');
});

$('#library-search').addEventListener('input', render);
$('#global-search').addEventListener('input', (event) => {
  $('#library-search').value = event.target.value;
  render();
  openPage('games');
});
$('#global-search').addEventListener('keydown', (event) => { if (event.key === 'Enter') $('#search-modal').classList.add('hidden'); });
window.gml.onLaunchError((message) => toast(`Lancement impossible : ${message}`, true));

async function refreshWine() {
  const result = await window.gml.getWineVersion();
  const label = result.available ? 'Wine disponible' : 'Wine introuvable';
  $('#wine-status').textContent = label;
  $('#wine-version').textContent = result.version || 'Installe Wine pour lancer des jeux';
  $('#settings-wine-status').textContent = label;
  $('#settings-wine-version').textContent = result.version || '—';
  for (const node of [$('#wine-dot'), $('#settings-wine-dot')]) {
    node.classList.toggle('ok', result.available);
    node.classList.toggle('bad', !result.available);
  }
}

function detectControllers() {
  const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
  const dot = $('#pad-dot');
  dot.classList.toggle('ok', pads.length > 0);
  dot.classList.toggle('bad', pads.length === 0);
  $('#pad-status').textContent = pads.length ? `${pads.length} manette${pads.length > 1 ? 's' : ''} détectée${pads.length > 1 ? 's' : ''}` : 'Aucune manette détectée';
  $('#pad-name').textContent = pads.length ? pads.map((pad) => pad.id).join(' · ') : 'Branche ou connecte la manette ; Linux et le jeu doivent la prendre en charge.';
  $('#home-pad-status').textContent = pads.length ? `${pads[0].id} · prête si le jeu la prend en charge` : 'Connecte ta manette PS3 pour vérifier si Linux la détecte.';
  $('#controller-page-status').textContent = pads.length ? `${pads.length} manette${pads.length > 1 ? 's' : ''} détectée${pads.length > 1 ? 's' : ''}` : 'Aucune manette détectée';
  $('#controller-page-name').textContent = pads.length ? pads.map((pad) => pad.id).join(' · ') : 'Branche ta manette PS3 en USB ou connecte-la en Bluetooth. Linux doit la reconnaître pour qu’elle apparaisse ici.';
  $('#controller-page-dot').classList.toggle('ok', pads.length > 0);
  $('#controller-page-dot').classList.toggle('bad', pads.length === 0);
}

function updateClock() { $('#clock').textContent = new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date()); }
window.addEventListener('gamepadconnected', detectControllers);
window.addEventListener('gamepaddisconnected', detectControllers);
setInterval(updateClock, 15000);
updateClock();
Promise.all([window.gml.getLibrary(), refreshWine()]).then(([library]) => { games = library.games || []; render(); detectControllers(); });
