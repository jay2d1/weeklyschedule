/**
 * Weekly Schedule — app.js
 * Dynamically loads schedule.json and renders
 * a pixel-perfect weekly grid.
 */

/* ── CONFIG ──────────────────────────────────── */
const DAYS         = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAY_SHORT    = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const GRID_START   = 8;   // 08:00
const GRID_END     = 17;  // 17:00
const SLOT_HEIGHT  = 56;  // px per hour

const PALETTE = [
  { bg: 'var(--c0)', accent: 'var(--ca0)' },
  { bg: 'var(--c1)', accent: 'var(--ca1)' },
  { bg: 'var(--c2)', accent: 'var(--ca2)' },
  { bg: 'var(--c3)', accent: 'var(--ca3)' },
  { bg: 'var(--c4)', accent: 'var(--ca4)' },
  { bg: 'var(--c5)', accent: 'var(--ca5)' },
  { bg: 'var(--c6)', accent: 'var(--ca6)' },
  { bg: 'var(--c7)', accent: 'var(--ca7)' },
];

/* ── STATE ───────────────────────────────────── */
let allEvents   = [];
let subjectMap  = {};   // subject → palette index
let weekOffset  = 0;    // 0 = current week

/* ── UTILS ───────────────────────────────────── */
function toMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour   = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2,'0')} ${suffix}`;
}

/** Monday of the week that is `offset` weeks from today */
function getWeekStart(offset = 0) {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // Mon=0 … Sun=6
  const monday = new Date(now);
  monday.setDate(now.getDate() - dow + offset * 7);
  monday.setHours(0,0,0,0);
  return monday;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDate(date) {
  return date.toLocaleDateString('en-GB', { day:'numeric', month:'short' });
}

/** Assign stable colour index per subject */
function getColor(subject) {
  if (!(subject in subjectMap)) {
    subjectMap[subject] = Object.keys(subjectMap).length % PALETTE.length;
  }
  return PALETTE[subjectMap[subject]];
}

/* ── RENDER ──────────────────────────────────── */
function buildLegend() {
  const legend = document.getElementById('legend');
  legend.innerHTML = '';
  Object.entries(subjectMap).forEach(([subject, idx]) => {
    const color = PALETTE[idx];
    const item  = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `
      <span class="legend-dot" style="background:${color.accent}"></span>
      ${subject}
    `;
    legend.appendChild(item);
  });
}

function buildGrid() {
  const grid      = document.getElementById('schedule-grid');
  const weekStart = getWeekStart(weekOffset);
  const today     = new Date(); today.setHours(0,0,0,0);

  /* ── week label ── */
  const weekEnd = addDays(weekStart, 6);
  document.getElementById('week-label').textContent =
    `${formatDate(weekStart)} – ${formatDate(weekEnd)}`;

  /* ── filter events relevant to these day-names ── */
  const visibleEvents = allEvents;  // JSON uses day names, not dates

  /* ── clear grid ── */
grid.replaceChildren();  
  grid.innerHTML = '';

  /* ── HEADER ROW ── */
  // time corner
  const corner = document.createElement('div');
  corner.className = 'grid-header time-header';
  grid.appendChild(corner);

  // day headers
  DAYS.forEach((day, i) => {
    const dayDate  = addDays(weekStart, i);
    const isToday  = dayDate.getTime() === today.getTime();
    const cell     = document.createElement('div');
    cell.className = `grid-header day-header-col${isToday ? ' today' : ''}`;
    const dateNum  = dayDate.getDate();
    cell.innerHTML = `
      <div class="day-name">${DAY_SHORT[i]}</div>
      <div class="day-date">${dateNum}</div>
    `;
    grid.appendChild(cell);
  });

  /* ── TIME SLOT ROWS ── */
  const totalSlots = GRID_END - GRID_START;

  for (let h = GRID_START; h < GRID_END; h++) {
    // time label
    const label = document.createElement('div');
    label.className = 'time-label';
    label.style.height = `${SLOT_HEIGHT}px`;
    label.textContent = `${h.toString().padStart(2,'0')}:00`;
    grid.appendChild(label);

    // day cells
    DAYS.forEach(day => {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.style.height = `${SLOT_HEIGHT}px`;
      cell.dataset.day  = day;
      cell.dataset.hour = h;
      grid.appendChild(cell);
    });
  }

  /* ── PLACE EVENTS ── */
  let hasAny = false;

  visibleEvents.forEach(evt => {
    const dayIdx   = DAYS.indexOf(evt.day);
    if (dayIdx === -1) return;

    const startMin = toMinutes(evt.start_time);
    const endMin   = toMinutes(evt.end_time);

    if (startMin < GRID_START * 60 || endMin > GRID_END * 60) return;

    hasAny = true;

    const color        = getColor(evt.subject);
    const offsetPx     = (startMin - GRID_START * 60) / 60 * SLOT_HEIGHT;
    const heightPx     = Math.max((endMin - startMin) / 60 * SLOT_HEIGHT - 6, 28);

    // find the grid row where this event starts (first cell in that hour × day)
    const startHour    = Math.floor(startMin / 60);
    const anchorCell = grid.querySelector(`[data-day="{evt.day}"][data-hour="${startHour}"]`)
   
     if (!anchorCell) return;

    const block = document.createElement('div');
    block.className = 'event-block';
    block.style.cssText = `
      --event-accent: ${color.accent};
      background: ${color.bg};
      top: ${(startMin - startHour * 60) / 60 * SLOT_HEIGHT + 2}px;
      height: ${heightPx}px;
    `;

    block.innerHTML = `
      <div class="event-subject">${evt.subject}</div>
      <div class="event-topic">${evt.topic}</div>
      ${heightPx > 56 ? `<div class="event-faculty">${evt.faculty}</div>` : ''}
      ${heightPx > 72 ? `<div class="event-time-label">${formatTime(evt.start_time)} – ${formatTime(evt.end_time)}</div>` : ''}
    `;

    block.addEventListener('click', () => openModal(evt, color));
    anchorCell.style.position = 'relative';
    anchorCell.appendChild(block);
  });

  /* ── empty state ── */
  document.getElementById('empty-state').classList.toggle('hidden', hasAny);
  document.querySelector('.grid-scroll-wrapper').classList.toggle('hidden', !hasAny);
}

/* ── MODAL ───────────────────────────────────── */
function openModal(evt, color) {
  document.getElementById('modal-color-bar').style.background = color.accent;
  document.getElementById('modal-tag').textContent     = evt.subject;
  document.getElementById('modal-title').textContent   = evt.topic;
  document.getElementById('modal-topic').textContent   = evt.subject;
  document.getElementById('modal-faculty').textContent = evt.faculty;
  document.getElementById('modal-time').textContent    =
    `${formatTime(evt.start_time)} – ${formatTime(evt.end_time)}`;
  document.getElementById('modal-day').textContent = evt.day;

  document.getElementById('modal-backdrop').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
  document.body.style.overflow = '';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-backdrop').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

/* ── WEEK NAV ────────────────────────────────── */
document.getElementById('prev-week').addEventListener('click', () => {
  weekOffset--;
  buildGrid();
});
document.getElementById('next-week').addEventListener('click', () => {
  weekOffset++;
  buildGrid();
});
document.getElementById('today-btn').addEventListener('click', () => {
  weekOffset = 0;
  buildGrid();
});

/* ── LOAD DATA ───────────────────────────────── */
async function loadSchedule() {
  try {
    const res  = await fetch('./schedule.json', { cache : 'no-cache'});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allEvents  = data.events || [];
    console.log('Loaded events:', allEvents);

    // pre-build subject → colour map in a stable order
    allEvents.forEach(e => getColor(e.subject));
    buildLegend();
    buildGrid();
  } catch (err) {
    console.error('Failed to load schedule.json:', err);
    document.getElementById('week-label').textContent =
      'Could not load schedule.json';
  }
}

loadSchedule();