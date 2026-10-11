// Stage deck: one slide at a time on a 1920×1080 canvas, clips that start from the beginning when
// their slide appears, and a presenter window with notes and a timer. Works from file://, offline.
const deck = document.querySelector('.deck');
const slides = [...document.querySelectorAll('.slide')];
const counter = document.querySelector('[data-counter]');
const TALK_SECONDS = 5 * 60;

let current = 0;
let presenter = null;
let startedAt = Date.now();

function fit() {
  const scale = Math.min(innerWidth / 1920, innerHeight / 1080);
  deck.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

function playClips(slide) {
  for (const clip of slide.querySelectorAll('.clip')) {
    const video = clip.querySelector('video');
    clip.classList.remove('blocked');
    video.currentTime = 0;
    video.play().catch((error) => {
      // Opened straight on a clip slide, before any key press: the browser wants a click first.
      if (error.name === 'NotAllowedError') clip.classList.add('blocked');
      // A clip not recorded yet shows where its file goes instead of a black box.
      else if (error.name === 'NotSupportedError') clip.classList.add('missing');
      // Leaving the slide before the clip started pauses it; nothing to recover.
      else if (error.name !== 'AbortError') throw error;
    });
  }
}

function stopClips(slide) {
  for (const video of slide.querySelectorAll('video')) video.pause();
}

function show(index) {
  const next = Math.max(0, Math.min(slides.length - 1, index));
  stopClips(slides[current]);
  slides[current].classList.remove('active');
  current = next;
  slides[current].classList.add('active');
  counter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  history.replaceState(null, '', `#${current + 1}`);
  playClips(slides[current]);
  renderPresenter();
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
}

function onKey(event) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const actions = {
    ArrowRight: () => show(current + 1),
    ArrowDown: () => show(current + 1),
    PageDown: () => show(current + 1),
    ' ': () => show(current + 1),
    Enter: () => show(current + 1),
    ArrowLeft: () => show(current - 1),
    ArrowUp: () => show(current - 1),
    PageUp: () => show(current - 1),
    Backspace: () => show(current - 1),
    Home: () => show(0),
    End: () => show(slides.length - 1),
    f: toggleFullscreen,
    p: openPresenter,
    r: () => playClips(slides[current]),
    t: () => { startedAt = Date.now(); renderPresenter(); },
    b: () => document.body.classList.toggle('blank'),
    '.': () => document.body.classList.toggle('blank'),
  };
  const action = actions[event.key.length === 1 ? event.key.toLowerCase() : event.key];
  if (!action) return;
  event.preventDefault();
  action();
}

// ---------- presenter window ----------

const PRESENTER_HTML = `
  <style>
    body { margin: 0; font: 22px/1.45 system-ui, sans-serif; background: #1d1b18; color: #f5efe4; }
    header { display: flex; justify-content: space-between; align-items: baseline; padding: 18px 28px; border-bottom: 1px solid #6f675c; }
    #timer { font-size: 56px; font-variant-numeric: tabular-nums; font-weight: 600; }
    #timer.late { color: #ffb020; } #timer.over { color: #ff5a4f; }
    #title { font-size: 28px; font-weight: 600; }
    main { padding: 20px 28px; font-size: 26px; } main p { margin: 0 0 14px; }
    footer { padding: 14px 28px; color: #cfc5b4; border-top: 1px solid #6f675c; }
    .keys { font-size: 16px; color: #a8a29a; margin-top: 6px; }
  </style>
  <header><span id="title"></span><span id="timer"></span></header>
  <main id="notes"></main>
  <footer>Dalej: <span id="next"></span>
    <div class="keys">strzałki / pilot: slajdy · R: nagranie od nowa · T: zeruj czas · B: czarny ekran</div>
  </footer>`;

function openPresenter() {
  if (presenter && !presenter.closed) {
    presenter.focus();
    return;
  }
  presenter = window.open('', 'dotknij-obrazu-notatki', 'width=980,height=680');
  if (!presenter) throw new Error('The browser blocked the presenter window; allow pop-ups for this file.');
  presenter.document.title = 'Notatki — Dotknij obrazu';
  presenter.document.body.innerHTML = PRESENTER_HTML;
  presenter.document.addEventListener('keydown', onKey);
  renderPresenter();
}

function renderPresenter() {
  if (!presenter || presenter.closed) return;
  const doc = presenter.document;
  const slide = slides[current];
  doc.getElementById('title').textContent = `${current + 1}/${slides.length} · ${slide.dataset.title}`;
  doc.getElementById('notes').innerHTML = slide.querySelector('.notes')?.innerHTML ?? '';
  doc.getElementById('next').textContent = slides[current + 1]?.dataset.title ?? 'koniec';
  renderTimer();
}

function renderTimer() {
  if (!presenter || presenter.closed) return;
  const seconds = Math.floor((Date.now() - startedAt) / 1000);
  const timer = presenter.document.getElementById('timer');
  timer.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} / 5:00`;
  timer.className = seconds > TALK_SECONDS ? 'over' : seconds > TALK_SECONDS - 30 ? 'late' : '';
}

// ---------- start ----------

for (const clip of document.querySelectorAll('.clip')) {
  const video = clip.querySelector('video');
  // A clip not recorded yet shows where its file goes instead of a black box. The file may
  // already have failed to load before this script ran.
  if (video.error) clip.classList.add('missing');
  video.addEventListener('error', () => clip.classList.add('missing'));
  clip.querySelector('.play').addEventListener('click', () => playClips(slides[current]));
}

document.addEventListener('keydown', onKey);
addEventListener('resize', fit);
setInterval(renderTimer, 1000);
fit();
show((parseInt(location.hash.slice(1), 10) || 1) - 1);
