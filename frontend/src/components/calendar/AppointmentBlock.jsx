import { useRef } from 'react';
import { useApp } from '../../context/useApp.js';
import { PROC_LABELS, DOCTOR_COLORS } from '../../utils/constants.js';
import { useProcColors } from '../../hooks/useProcColors.js';
import { parseTime, getHH, fmtTime, addMins, durationMins, checkConflict } from '../../utils/calendarHelpers.js';
import { appointmentsApi } from '../../services/apiServices.js';
import { showToast } from '../../ui/toastService.js';

export default function AppointmentBlock({ appt, ws, layout }) {
  const { state, actions } = useApp();
  const { settings, appointments } = state;
  const blockRef = useRef(null);
  const PROC_COLORS = useProcColors();

  const c = PROC_COLORS[appt.procedure] || PROC_COLORS.other;
  const hh = getHH(settings.zoomLevel);
  const startTotal = parseTime(appt.startTime).total;
  const endTotal   = parseTime(appt.endTime).total;
  const top  = ((startTotal / 60) - ws) * hh;
  const hpx  = ((endTotal - startTotal) / 60) * hh;
  const blockH = Math.max(18, hpx);
  const isCancelled = appt.status === 'cancelled';

  const bg  = isCancelled ? '#f1f5f9' : c.bg;
  const bor = isCancelled ? '#94a3b8' : c.border;
  const txt = isCancelled ? '#64748b' : c.text;
  const docColor = isCancelled ? '#94a3b8' : (DOCTOR_COLORS[appt.doctor] || '#2563eb');
  const docName = appt.doctor === 'dr2'
    ? (settings.dr2Name || 'Dr. B')
    : (settings.dr1Name || 'Dr. A');

  // ── Layout (overlap tiling) ──────────────────────────────────────────────
  const lout = layout && layout[appt.id];
  let leftStyle = '3px', widthStyle = '';
  if (lout && lout.numCols > 1) {
    const colW = 100 / lout.numCols;
    leftStyle = `${lout.col * colW + 0.5}%`;
    widthStyle = `${colW - 1}%`;
  }

  const blockStyle = {
    top: `${top}px`,
    height: `${blockH}px`,
    background: bg,
    borderLeftColor: bor,
    color: txt,
    left: leftStyle,
    ...(widthStyle ? { width: widthStyle } : { right: '3px' }),
    position: 'absolute',
  };

  // ── Mouse Down — starts drag OR opens popover ────────────────────────────
  function handleMouseDown(e) {
    if (e.target.classList.contains('resize-handle')) return;
    e.preventDefault();
    e.stopPropagation();

    const sx = e.clientX, sy = e.clientY;
    let dragStarted = false;

    const onMove = (mv) => {
      if (!dragStarted && (Math.abs(mv.clientX - sx) > 5 || Math.abs(mv.clientY - sy) > 5)) {
        dragStarted = true;
        cleanup();
        startDrag(e);
      }
    };
    const onUp = (up) => {
      cleanup();
      if (!dragStarted) openPopover(up);
    };

    const holdTimer = setTimeout(() => {
      cleanup();
      startDrag(e);
    }, 200);

    function cleanup() {
      clearTimeout(holdTimer);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ── Open Popover ─────────────────────────────────────────────────────────
  function openPopover(e) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const pw = Math.min(320, vw - 32), ph = 460;
    let left = e.clientX + 16, top = e.clientY - 80;
    if (vw <= 480) { left = 16; top = Math.max(16, Math.min(vh - ph - 16, e.clientY - 80)); }
    else {
      if (left + pw > vw - 16) left = e.clientX - pw - 16;
      if (left < 16) left = 16;
      if (top + ph > vh - 16) top = vh - ph - 16;
      if (top < 16) top = 16;
    }
    actions.setPopover({ id: appt.id, x: left, y: top });
  }

  // ── Drag ─────────────────────────────────────────────────────────────────
  function startDrag(e) {
    actions.closePopover();
    const block = blockRef.current;
    if (!block) return;
    const rect = block.getBoundingClientRect();

    const ghost = block.cloneNode(true);
    ghost.id = 'drag-ghost';
    ghost.style.cssText = `width:${rect.width}px;height:${rect.height}px;left:${rect.left}px;top:${rect.top}px;cursor:grabbing;position:fixed;z-index:9999;pointer-events:none;opacity:.85;box-shadow:0 8px 24px rgba(0,0,0,.25);border-radius:6px;`;
    document.body.appendChild(ghost);
    block.classList.add('dragging');

    const offsetY = e.clientY - rect.top;

    function onDragMove(mv) {
      ghost.style.top = (mv.clientY - offsetY) + 'px';
      ghost.style.left = (mv.clientX - ghost.offsetWidth / 2) + 'px';

      // Highlight column under cursor
      document.querySelectorAll('.cal-day-col').forEach(c => {
        c.classList.remove('drag-over');
        const pid = 'preview-' + c.id.replace('col-', '');
        const prev = document.getElementById(pid);
        if (prev) prev.style.display = 'none';
      });

      const t = findDropTarget(mv.clientX, mv.clientY);
      if (t) {
        t.col.classList.add('drag-over');
        const pid = 'preview-' + t.col.id.replace('col-', '');
        const prev = document.getElementById(pid);
        if (prev) {
          const dur = durationMins(appt.startTime, appt.endTime);
          const topY = ((t.snapMins / 60) - ws) * hh;
          prev.style.cssText = `display:block;top:${topY}px;left:3px;right:3px;height:${(dur / 60) * hh}px;`;
        }
      }
    }

    async function onDragUp(ev) {
      ghost.remove();
      block.classList.remove('dragging');
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragUp);
      document.querySelectorAll('.cal-day-col').forEach(c => c.classList.remove('drag-over'));

      const t = findDropTarget(ev.clientX, ev.clientY);
      if (!t) return;

      const dur = durationMins(appt.startTime, appt.endTime);
      const ns = fmtTime(Math.floor(t.snapMins / 60), t.snapMins % 60);
      const ne = addMins(ns, dur);
      const newDoctor = t.col.dataset.doctor || appt.doctor || 'dr1';

      const conflict = checkConflict(appointments, appt.id, t.date, ns, ne, newDoctor, settings.conflictDetect);
      if (conflict) {
        showToast('Conflict — cannot move here', 'error');
        return;
      }

      try {
        const updated = await appointmentsApi.update(appt.id, { date: t.date, startTime: ns, endTime: ne, doctor: newDoctor });
        actions.updateAppointment(updated);
        showToast('Appointment moved', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragUp);
  }

  function findDropTarget(cx, cy) {
    const cols = document.querySelectorAll('.cal-day-col');
    for (const col of cols) {
      const r = col.getBoundingClientRect();
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
        const calBody = col.closest('.cal-body') || col.parentElement;
        const scrollTop = calBody ? calBody.scrollTop : 0;
        const relY = cy - r.top + scrollTop;
        const colH = (settings.workEnd - ws) * hh;
        const clampedY = Math.min(Math.max(0, relY), colH - 1);
        const rawMins = (clampedY / hh) * 60;
        const snapMins = Math.round(ws * 60 + rawMins);
        return { col, date: col.dataset.date, snapMins };
      }
    }
    return null;
  }

  // ── Resize ───────────────────────────────────────────────────────────────
  function startResize(e) {
    e.preventDefault();
    e.stopPropagation();
    const block = blockRef.current;
    if (!block) return;
    const startY = e.clientY;
    const origEnd = appt.endTime;
    let tempEnd = origEnd;

    function onResizeMove(mv) {
      const dy = mv.clientY - startY;
      const dm = Math.round((dy / hh) * 60);
      const origE = parseTime(origEnd).total;
      const startT = parseTime(appt.startTime).total;
      const newE = Math.max(startT + 1, Math.min(settings.workEnd * 60, origE + dm));
      tempEnd = fmtTime(Math.floor(newE / 60), newE % 60);
      block.style.height = Math.max(18, ((newE - startT) / 60) * hh) + 'px';
      const te = block.querySelector('.appt-time');
      if (te) te.textContent = `${appt.startTime}–${tempEnd}`;
    }

    async function onResizeUp() {
      document.removeEventListener('mousemove', onResizeMove);
      document.removeEventListener('mouseup', onResizeUp);
      if (tempEnd === origEnd) return;

      const conflict = checkConflict(appointments, appt.id, appt.date, appt.startTime, tempEnd, appt.doctor, settings.conflictDetect);
      if (conflict) {
        showToast('Conflict — resize reverted', 'error');
        block.style.height = blockH + 'px';
        return;
      }

      try {
        const updated = await appointmentsApi.update(appt.id, { endTime: tempEnd });
        actions.updateAppointment(updated);
        showToast('Duration updated', 'success');
      } catch (err) {
        showToast(err.message, 'error');
        block.style.height = blockH + 'px';
      }
    }

    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeUp);
  }

  return (
    <div
      ref={blockRef}
      className={`appt-block${isCancelled ? ' cancelled' : ''}`}
      id={`appt-${appt.id}`}
      style={blockStyle}
      onMouseDown={handleMouseDown}
    >
      <div className="appt-name">{appt.firstName} {appt.lastName}</div>
      {hpx > 32 && <div className="appt-time">{appt.startTime}–{appt.endTime}</div>}
      {hpx > 52 && <span className="appt-proc-tag">{PROC_LABELS[appt.procedure] || 'Other'}</span>}
      {hpx > 70 && <div className="appt-doc-tag" style={{ color: docColor }}>● {docName}</div>}
      {!isCancelled && (
        <div className="resize-handle" onMouseDown={startResize}></div>
      )}
    </div>
  );
}