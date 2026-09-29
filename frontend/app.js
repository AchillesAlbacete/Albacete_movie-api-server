const API_BASE = '';
const movieList = document.querySelector('#movie-list');
const movieCount = document.querySelector('#movie-count');
const searchInput = document.querySelector('#search-input');
const contentArea = document.querySelector('#content-area');
const detailCard = document.querySelector('#detail-card');
const dialog = document.querySelector('#movie-dialog');
const form = document.querySelector('#movie-form');
const formError = document.querySelector('#form-error');
const saveButton = document.querySelector('#save-button');
const toast = document.querySelector('#toast');
const movies = [];
let selectedId = null;
let toastTimer;
const POSTER_CACHE_KEY = 'reelbase-film-posters-v1';
const WIKIPEDIA_ARTICLES = {
  'The Shawshank Redemption (Extended)': 'The_Shawshank_Redemption',
  Interstellar: 'Interstellar_(film)',
  Parasite: 'Parasite_(2019_film)',
  Gladiator: 'Gladiator_(2000_film)',
  Whiplash: 'Whiplash_(2014_film)',
  Oppenheimer: 'Oppenheimer_(film)',
  'The Lord of the Rings: The Fellowship of the Ring': 'The_Lord_of_the_Rings:_The_Fellowship_of_the_Ring',
  'The Silence of the Lambs': 'The_Silence_of_the_Lambs_(film)',
  Casablanca: 'Casablanca_(film)',
  'The Social Network': 'The_Social_Network',
  Coco: 'Coco_(2017_film)',
  'The Departed': 'The_Departed_(film)',
  '12 Angry Men': '12_Angry_Men_(1957_film)',
  'The Lion King': 'The_Lion_King_(1994_film)',
  Dune: 'Dune_(2021_film)',
};
const posterCache = (() => {
  try {
    return JSON.parse(localStorage.getItem(POSTER_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
})();
const posterQueue = [];
const pendingPosters = new Set();
const attemptedPosters = new Set();
let activePosterRequests = 0;

async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error('Could not reach the API. Make sure the Flask server is running on port 5000.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || data.message || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function wikipediaTitle(movie) {
  return WIKIPEDIA_ARTICLES[movie.title] || String(movie.title).replace(/\s+\([^)]*\)$/, '').replace(/\s+/g, '_');
}

function wikipediaArticleUrl(movie) {
  return `https://en.wikipedia.org/wiki/${wikipediaTitle(movie)}`;
}

function moviePoster(movie, className = 'movie-poster') {
  const article = wikipediaTitle(movie);
  const cached = posterCache[article];
  const src = cached?.source ? `src="${escapeHtml(cached.source)}"` : '';
  return `<img class="${className}" data-poster-key="${escapeHtml(article)}" ${src} alt="Film poster for ${escapeHtml(movie.title)}">`;
}

function updatePosterImages(movie) {
  const article = wikipediaTitle(movie);
  const cached = posterCache[article];
  if (!cached) return;

  document.querySelectorAll('.movie-poster[data-poster-key]').forEach((image) => {
    if (image.dataset.posterKey === article) image.src = cached.source;
  });
  const detailPoster = detailCard.querySelector('.detail-poster');
  const sourceLink = detailCard.querySelector('#poster-source');
  if (detailPoster?.dataset.posterKey === article) {
    detailPoster.src = cached.source;
    if (sourceLink) sourceLink.href = cached.articleUrl;
  }
}

function processPosterQueue() {
  while (activePosterRequests < 4 && posterQueue.length) {
    const movie = posterQueue.shift();
    const article = wikipediaTitle(movie);
    activePosterRequests += 1;
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(article)}`, {
      headers: { Accept: 'application/json' },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Poster lookup returned ${response.status}`);
        return response.json();
      })
      .then((summary) => {
        const source = summary.thumbnail?.source || summary.originalimage?.source;
        if (!source) return;
        posterCache[article] = {
          source,
          articleUrl: summary.content_urls?.desktop?.page || wikipediaArticleUrl(movie),
        };
        try {
          localStorage.setItem(POSTER_CACHE_KEY, JSON.stringify(posterCache));
        } catch {
          // The images still work if browser storage is unavailable or full.
        }
        updatePosterImages(movie);
      })
      .catch(() => {
        // Keep a quiet visual placeholder if Wikipedia has no image or is offline.
      })
      .finally(() => {
        activePosterRequests -= 1;
        pendingPosters.delete(article);
        attemptedPosters.add(article);
        processPosterQueue();
      });
  }
}

function queueMoviePosters(collection) {
  collection.forEach((movie) => {
    const article = wikipediaTitle(movie);
    if (posterCache[article]) {
      updatePosterImages(movie);
    } else if (!pendingPosters.has(article) && !attemptedPosters.has(article)) {
      pendingPosters.add(article);
      posterQueue.push(movie);
    }
  });
  processPosterQueue();
}

function renderMovieList() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = movies.filter((movie) =>
    `${movie.title} ${movie.genre} ${movie.year}`.toLowerCase().includes(query),
  );
  movieCount.textContent = movies.length;

  if (!movies.length) {
    movieList.innerHTML = '<div class="list-state">Your library is empty.<br>Add a movie to get started.</div>';
    return;
  }
  if (!filtered.length) {
    movieList.innerHTML = '<div class="list-state">No movies match your search.</div>';
    return;
  }

  movieList.innerHTML = filtered.map((movie) => `
    <button class="movie-item${movie.id === selectedId ? ' active' : ''}" type="button" data-id="${Number(movie.id)}" aria-current="${movie.id === selectedId ? 'true' : 'false'}">
      ${moviePoster(movie)}
      <span class="movie-item-copy"><span class="movie-item-title">${escapeHtml(movie.title)}</span><span class="movie-item-meta">${escapeHtml(movie.year)} <span aria-hidden="true">·</span> ${escapeHtml(movie.genre)}</span></span>
    </button>`).join('');

  movieList.querySelectorAll('.movie-item').forEach((button) => {
    button.addEventListener('click', () => loadMovie(Number(button.dataset.id)));
  });
  queueMoviePosters(filtered);
}

function showContent(html, className) {
  document.querySelector('.welcome-panel').classList.add('hidden');
  detailCard.classList.add('hidden');
  let state = contentArea.querySelector('.temporary-state');
  if (!state) {
    state = document.createElement('div');
    state.className = 'temporary-state';
    contentArea.append(state);
  }
  state.className = `temporary-state ${className}`;
  state.innerHTML = html;
}

function clearTemporaryState() {
  contentArea.querySelector('.temporary-state')?.remove();
}

function showWelcome() {
  clearTemporaryState();
  detailCard.classList.add('hidden');
  document.querySelector('.welcome-panel').classList.remove('hidden');
  document.querySelector('#breadcrumb-current').textContent = 'OVERVIEW';
}

function renderDetail(movie) {
  clearTemporaryState();
  document.querySelector('.welcome-panel').classList.add('hidden');
  detailCard.classList.remove('hidden');
  document.querySelector('#breadcrumb-current').textContent = escapeHtml(movie.title).toUpperCase();
  detailCard.innerHTML = `
    <div class="detail-hero">
      ${moviePoster(movie, 'detail-poster')}
      <div class="detail-hero-content">
        <p class="detail-kicker">NOW SHOWING IN YOUR LIBRARY</p>
        <h2 class="detail-title">${escapeHtml(movie.title)}</h2>
        <div class="detail-tags"><span class="detail-tag">${escapeHtml(movie.year)}</span><span class="detail-tag">${escapeHtml(movie.genre)}</span></div>
      </div>
    </div>
    <div class="detail-body">
      <div><p class="detail-caption">LIBRARY RECORD</p><p class="detail-id">Movie #${Number(movie.id)} <span aria-hidden="true">·</span> Added to your collection</p><a class="poster-credit" id="poster-source" href="${escapeHtml(wikipediaArticleUrl(movie))}" target="_blank" rel="noopener noreferrer">Poster image source ↗</a></div>
      <div class="detail-actions">
        <button class="action-button" type="button" data-action="edit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l4.2-.9L19 8.3a2.1 2.1 0 0 0-3-3L5.2 16.1 4 20Z"></path></svg>Edit movie</button>
        <button class="action-button danger" type="button" data-action="delete"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"></path></svg>Delete</button>
      </div>
    </div>`;
  detailCard.querySelector('[data-action="edit"]').addEventListener('click', () => openDialog(movie));
  detailCard.querySelector('[data-action="delete"]').addEventListener('click', () => deleteMovie(movie));
  queueMoviePosters([movie]);
}

async function loadLibrary(preferredId = null) {
  movieList.innerHTML = '<div class="list-state">Loading your library…</div>';
  showContent('<span class="loading-spinner" aria-hidden="true"></span> Loading your movie library…', 'loading-state');
  try {
    const data = await apiRequest('/movies');
    movies.splice(0, movies.length, ...(Array.isArray(data) ? data : []));
    renderMovieList();
    const nextId = preferredId ?? (movies.some((movie) => movie.id === selectedId) ? selectedId : movies[0]?.id);
    if (nextId != null) await loadMovie(Number(nextId));
    else showWelcome();
  } catch (error) {
    movieList.innerHTML = `<div class="list-state">${escapeHtml(error.message)}</div>`;
    movieCount.textContent = '—';
    showContent(`<strong>Couldn't load your movies.</strong><br>${escapeHtml(error.message)}<br><br><button class="button button-quiet" id="retry-button" type="button">Try again</button>`, 'error-state');
    contentArea.querySelector('#retry-button')?.addEventListener('click', () => loadLibrary());
  }
}

async function loadMovie(id) {
  selectedId = id;
  renderMovieList();
  showContent('<span class="loading-spinner" aria-hidden="true"></span> Loading movie details…', 'loading-state');
  try {
    const movie = await apiRequest(`/movies/${id}`);
    selectedId = movie.id;
    renderMovieList();
    renderDetail(movie);
  } catch (error) {
    selectedId = null;
    renderMovieList();
    const notFound = error.status === 404;
    showContent(`<strong>${notFound ? 'Movie not found.' : 'Could not load this movie.'}</strong><br>${escapeHtml(error.message)}<br><br><button class="button button-quiet" id="back-button" type="button">Back to library</button>`, notFound ? 'empty-state' : 'error-state');
    contentArea.querySelector('#back-button')?.addEventListener('click', () => loadLibrary());
  }
}

function openDialog(movie = null) {
  form.reset();
  formError.textContent = '';
  formError.classList.add('hidden');
  document.querySelector('#movie-id').value = movie?.id ?? '';
  document.querySelector('#title-input').value = movie?.title ?? '';
  document.querySelector('#year-input').value = movie?.year ?? '';
  document.querySelector('#genre-input').value = movie?.genre ?? '';
  const editing = Boolean(movie);
  document.querySelector('#dialog-title').textContent = editing ? 'Edit movie' : 'Add a movie';
  document.querySelector('#dialog-eyebrow').textContent = editing ? 'UPDATE YOUR COLLECTION' : 'YOUR COLLECTION';
  document.querySelector('#dialog-description').textContent = editing
    ? 'Make changes to this movie in your collection.'
    : 'A few details are all it takes to add a new favorite.';
  saveButton.textContent = editing ? 'Save changes' : 'Save movie';
  dialog.showModal();
  document.querySelector('#title-input').focus();
}

function showFormError(message) {
  formError.textContent = message;
  formError.classList.remove('hidden');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2800);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = document.querySelector('#movie-id').value;
  const payload = {};
  const title = document.querySelector('#title-input').value.trim();
  const year = document.querySelector('#year-input').value.trim();
  const genre = document.querySelector('#genre-input').value.trim();
  // Leave blank fields out so the API's own required-field validation is shown in the UI.
  if (title) payload.title = title;
  if (year) payload.year = Number(year);
  if (genre) payload.genre = genre;

  saveButton.disabled = true;
  saveButton.textContent = 'Saving…';
  formError.classList.add('hidden');
  try {
    const result = await apiRequest(id ? `/movies/${id}` : '/movies', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    });
    dialog.close();
    await loadLibrary(result.id);
    showToast(id ? 'Movie updated.' : 'Movie added to your library.');
  } catch (error) {
    showFormError(error.message);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = id ? 'Save changes' : 'Save movie';
  }
});

async function deleteMovie(movie) {
  if (!window.confirm(`Delete “${movie.title}” from your library? This can't be undone.`)) return;
  try {
    await apiRequest(`/movies/${movie.id}`, { method: 'DELETE' });
    const remaining = movies.filter((item) => item.id !== movie.id);
    movies.splice(0, movies.length, ...remaining);
    selectedId = null;
    renderMovieList();
    showToast('Movie deleted.');
    if (remaining.length) await loadMovie(remaining[0].id);
    else showWelcome();
  } catch (error) {
    if (error.status === 404) {
      await loadLibrary();
      showToast('That movie was already removed. Your library is up to date.');
    } else {
      showToast(error.message);
    }
  }
}

document.querySelector('#add-button').addEventListener('click', () => openDialog());
document.querySelector('#welcome-add-button').addEventListener('click', () => openDialog());
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
document.querySelector('#cancel-dialog').addEventListener('click', () => dialog.close());
document.querySelector('#refresh-button').addEventListener('click', () => loadLibrary());
searchInput.addEventListener('input', renderMovieList);
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !dialog.open && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
});

loadLibrary();
