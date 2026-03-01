import { PHT } from './constants.js';

// ── PHT Date/Time Utilities ─────────────────────────────────────────────────

export function todayPHT() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PHT }).format(new Date());
}

export function getNowPHT() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PHT, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);
  const h = parseInt(parts.find(p => p.type === 'hour').value);
  const m = parseInt(parts.find(p => p.type === 'minute').value);
  return { h, m, dateStr: todayPHT() };
}

export function formatDatePHT(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: PHT, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(d);
}

export function fmtDate(d) {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
}

export function fmtTime(h, m) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseTime(t) {
  const [h, m] = t.split(':').map(Number);
  return { h, m, total: h * 60 + m };
}

export function addMins(ts, mins) {
  const { total } = parseTime(ts);
  const n = total + mins;
  return fmtTime(Math.floor(n / 60), n % 60);
}

export function durationMins(s, e) {
  return parseTime(e).total - parseTime(s).total;
}

export function isToday(ds) {
  return ds === todayPHT();
}

// ── Calendar Navigation ─────────────────────────────────────────────────────

export function getWeekDays(date, showWeekends = true) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const num = showWeekends ? 7 : 5;
  const days = [];
  for (let i = 0; i < num; i++) {
    days.push(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  }
  return days;
}

// ── Zoom / Pixel Helpers ────────────────────────────────────────────────────

export function getHH(zoomLevel = 1) {
  return Math.round(72 * zoomLevel);
}

export function getColHeight(ws, we, zoomLevel = 1) {
  return (we - ws) * getHH(zoomLevel);
}

export function timeToY(ts, ws, zoomLevel = 1) {
  const { h, m } = parseTime(ts);
  return ((h + m / 60) - ws) * getHH(zoomLevel);
}

// ── Overlap Layout Algorithm ────────────────────────────────────────────────
// Returns { [apptId]: { col, numCols } } for side-by-side tile rendering
export function computeLayout(appts) {
  if (!appts.length) return {};
  const sorted = [...appts].sort((a, b) => parseTime(a.startTime).total - parseTime(b.startTime).total);
  const result = {};
  let clusters = [];
  let current = [sorted[0]];
  let clusterEnd = parseTime(sorted[0].endTime).total;

  for (let i = 1; i < sorted.length; i++) {
    const st = parseTime(sorted[i].startTime).total;
    if (st < clusterEnd) {
      current.push(sorted[i]);
      clusterEnd = Math.max(clusterEnd, parseTime(sorted[i].endTime).total);
    } else {
      clusters.push(current);
      current = [sorted[i]];
      clusterEnd = parseTime(sorted[i].endTime).total;
    }
  }
  clusters.push(current);

  clusters.forEach(cluster => {
    const cols = [];
    cluster.forEach(appt => {
      let placed = false;
      for (let c = 0; c < cols.length; c++) {
        const last = cols[c][cols[c].length - 1];
        if (parseTime(last.endTime).total <= parseTime(appt.startTime).total) {
          cols[c].push(appt);
          result[appt.id] = { col: c };
          placed = true;
          break;
        }
      }
      if (!placed) {
        result[appt.id] = { col: cols.length };
        cols.push([appt]);
      }
    });
    cluster.forEach(a => { result[a.id].numCols = cols.length; });
  });

  return result;
}

// ── Conflict Detection ──────────────────────────────────────────────────────
export function checkConflict(appointments, excludeId, date, start, end, doctor, conflictDetect = true) {
  if (!conflictDetect) return false;
  const sm = parseTime(start).total;
  const em = parseTime(end).total;
  return appointments.some(a => {
    if (a.id === excludeId || a.date !== date || a.status === 'cancelled') return false;
    const sameDoc = doctor ? (a.doctor === doctor || (!a.doctor && doctor === 'dr1')) : true;
    if (!sameDoc) return false;
    return sm < parseTime(a.endTime).total && em > parseTime(a.startTime).total;
  });
}

// ── Grid Line Renderer (returns HTML string) ────────────────────────────────
export function renderGridLinesHTML(ws, we, zoomLevel = 1) {
  let html = '';
  const hh = getHH(zoomLevel);
  for (let h = ws; h < we; h++) {
    const i = h - ws;
    html += `<div class="cal-hour-line" style="top:${i * hh}px"></div>`;
    if (hh >= 50) html += `<div class="cal-half-line" style="top:${i * hh + hh / 2}px"></div>`;
    if (hh >= 96) {
      html += `<div class="cal-quarter-line" style="top:${i * hh + hh / 4}px"></div>`;
      html += `<div class="cal-quarter-line" style="top:${i * hh + hh * 3 / 4}px"></div>`;
    }
  }
  return html;
}

// ── Time Column Renderer (returns HTML string) ──────────────────────────────
export function renderTimeColHTML(ws, we, zoomLevel = 1) {
  let html = '';
  const hh = getHH(zoomLevel);
  for (let h = ws; h < we; h++) {
    const h12 = h % 24;
    const label = h12 === 0 ? '12 AM' : h12 === 12 ? '12 PM' : h12 < 12 ? `${h12} AM` : `${h12 - 12} PM`;
    const half = hh >= 70
      ? `<span style="position:absolute;right:8px;top:${hh / 2}px;font-size:9px;font-weight:600;color:var(--text-l);opacity:.75;transform:translateY(-50%)">&nbsp;:30</span>`
      : '';
    html += `<div class="cal-time-slot" style="height:${hh}px;position:relative">${label}${half}</div>`;
  }
  return html;
}

// ── Topbar Subtitle ─────────────────────────────────────────────────────────
export function getTopbarSubtitle(calView, currentDate, showWeekends) {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const d = currentDate;
  if (calView === 'month') return `— ${months[d.getMonth()]} ${d.getFullYear()} (PHT)`;
  if (calView === 'week') {
    const wd = getWeekDays(d, showWeekends);
    return `— Week of ${months[wd[0].getMonth()].slice(0, 3)} ${wd[0].getDate()} (PHT)`;
  }
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return `— ${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} (PHT)`;
}