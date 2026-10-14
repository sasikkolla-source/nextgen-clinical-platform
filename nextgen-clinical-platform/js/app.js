/* ---------- Helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const isoLocal = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return isoLocal(d); };
const TODAY = () => isoLocal(new Date());
const age = dob => { const b = new Date(dob), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };
const fmtDate = s => new Date(s + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const initials = n => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

/* ---------- Data (localStorage with fallback) ---------- */
const KEY = 'ngcp.v1';
function seed() {
  const v = (d, sys, dia, hr, temp, spo2) => ({ date: addDays(d), sys, dia, hr, temp, spo2 });
  return {
    patients: [
      { id: 'p1', name: 'Asha Verma', dob: '1968-04-12', sex: 'Female', phone: '98480 11223', allergies: ['Penicillin'], conditions: ['Hypertension', 'Type 2 diabetes'], meds: ['Amlodipine 5 mg daily', 'Metformin 500 mg twice daily'],
        vitals: [v(-12,146,92,82,36.7,98), v(-9,150,94,84,36.8,97), v(-6,148,93,80,36.6,98), v(-3,152,96,86,36.7,97), v(-1,154,98,88,36.8,97)],
        notes: [{ date: addDays(-1), text: 'BP trending up over two weeks despite medication. Review dose and discuss salt intake.' }] },
      { id: 'p2', name: 'Rohan Mehta', dob: '1991-09-30', sex: 'Male', phone: '90001 44556', allergies: [], conditions: ['Asthma'], meds: ['Salbutamol inhaler as needed'],
        vitals: [v(-8,118,76,72,36.6,98), v(-4,120,78,74,36.7,97), v(-1,116,74,70,36.6,98)], notes: [] },
      { id: 'p3', name: 'Meera Iyer', dob: '1955-01-08', sex: 'Female', phone: '99890 77881', allergies: ['Sulfa drugs', 'Latex'], conditions: ['COPD', 'Atrial fibrillation'], meds: ['Tiotropium 18 mcg daily', 'Apixaban 5 mg twice daily'],
        vitals: [v(-7,132,84,92,36.9,93), v(-4,134,86,98,37.2,92), v(-2,136,86,104,37.4,91), v(0,138,88,108,38.1,90)],
        notes: [{ date: addDays(-2), text: 'Increased breathlessness. Chest clear. Monitor oxygen closely.' }] },
      { id: 'p4', name: 'Imran Qureshi', dob: '1982-06-21', sex: 'Male', phone: '98660 33210', allergies: [], conditions: [], meds: [],
        vitals: [v(-2,122,80,68,36.5,99)], notes: [] }
    ],
    appts: [
      { id: 'a1', pid: 'p1', date: TODAY(), time: '09:30', reason: 'Blood pressure review', status: 'checked-in' },
      { id: 'a2', pid: 'p3', date: TODAY(), time: '11:00', reason: 'Breathlessness follow-up', status: 'scheduled' },
      { id: 'a3', pid: 'p2', date: TODAY(), time: '14:15', reason: 'Inhaler technique check', status: 'scheduled' },
      { id: 'a4', pid: 'p4', date: addDays(1), time: '10:00', reason: 'Annual health check', status: 'scheduled' },
      { id: 'a5', pid: 'p1', date: addDays(-3), time: '10:30', reason: 'Medication review', status: 'completed' }
    ]
  };
}
function load() {
  try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch (e) {}
  return seed();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
let db = load();
const state = { view: 'dashboard', pid: null, q: '' };
const P = id => db.patients.find(p => p.id === id);

/* ---------- Clinical logic ---------- */
function flags(v) {
  if (!v) return [];
  const f = [];
  if (v.sys >= 140 || v.dia >= 90) f.push('High blood pressure');
  if (v.sys < 90) f.push('Low blood pressure');
  if (v.hr > 100) f.push('Fast heart rate');
  if (v.hr < 50) f.push('Slow heart rate');
  if (v.temp >= 38) f.push('Fever');
  if (v.spo2 < 94) f.push('Low oxygen');
  return f;
}
const latest = p => p.vitals.length ? [...p.vitals].sort((a, b) => a.date.localeCompare(b.date)).at(-1) : null;
const flagged = () => db.patients.map(p => ({ p, f: flags(latest(p)) })).filter(x => x.f.length);
const statusTag = s => ({ scheduled: ['mute', 'Scheduled'], 'checked-in': ['warn', 'Checked in'], completed: ['ok', 'Completed'], cancelled: ['alert', 'Cancelled'] }[s] || ['mute', s]);

function spark(values, color = 'var(--brand)') {
  if (values.length < 2) return '<div class="sub" style="color:var(--muted)">Add more readings to see a trend.</div>';
  const w = 240, h = 60, min = Math.min(...values) - 4, max = Math.max(...values) + 4;
  const pts = values.map((v, i) => `${(i / (values.length - 1) * w).toFixed(1)},${(h - (v - min) / (max - min) * h).toFixed(1)}`);
  const last = pts.at(-1).split(',');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Trend of ${values.join(', ')}">
    <polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="${color}"/></svg>`;
}

/* ---------- Views ---------- */
const views = {
  dashboard() {
    const t = TODAY();
    const todays = db.appts.filter(a => a.date === t && a.status !== 'cancelled').sort((a, b) => a.time.localeCompare(b.time));
    const fl = flagged();
    const upcoming = db.appts.filter(a => a.date >= t && a.status === 'scheduled').length;
    return `
    <div class="top"><div><h1>Good day, Doctor</h1><p>${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
      <button class="btn primary" data-act="new-appt">Book appointment</button></div>
    <div class="grid stats">
      <div class="panel stat"><div class="n">${db.patients.length}</div><div class="l">Patients on record</div></div>
      <div class="panel stat"><div class="n">${todays.length}</div><div class="l">Appointments today</div></div>
      <div class="panel stat"><div class="n">${upcoming}</div><div class="l">Upcoming bookings</div></div>
      <div class="panel stat ${fl.length ? 'hot' : ''}"><div class="n">${fl.length}</div><div class="l">Patients with flagged vitals</div></div>
    </div>
    <div class="grid two">
      <section class="panel"><header><h2>Today's schedule</h2><button class="link" data-nav="appointments">All appointments</button></header>
        ${todays.length ? `<ul class="list">${todays.map(apptRow).join('')}</ul>` : '<div class="empty">No appointments today. Book one to fill the schedule.</div>'}
      </section>
      <section class="panel"><header><h2>Needs attention</h2></header>
        ${fl.length ? `<ul class="list">${fl.map(({ p, f }) => `<li><div class="grow"><button class="link" data-act="open" data-id="${p.id}">${esc(p.name)}</button>
          <div class="chips" style="margin-top:4px">${f.map(x => `<span class="tag alert">${x}</span>`).join('')}</div></div></li>`).join('')}</ul>`
          : '<div class="empty">All latest readings are in range.</div>'}
      </section>
    </div>`;
  },

  patients() {
    return `
    <div class="top"><div><h1>Patients</h1><p>${db.patients.length} on record</p></div>
      <button class="btn primary" data-act="new-patient">Add patient</button></div>
    <div class="panel">
      <input id="q" class="search" type="search" placeholder="Search by name or condition" value="${esc(state.q)}" aria-label="Search patients">
      <div class="scroll" id="plist" style="margin-top:12px">${patientTable()}</div>
    </div>`;
  },

  patient() {
    const p = P(state.pid); if (!p) { state.view = 'patients'; return views.patients(); }
    const lv = latest(p), fl = flags(lv);
    const sorted = [...p.vitals].sort((a, b) => a.date.localeCompare(b.date));
    const appts = db.appts.filter(a => a.pid === p.id).sort((a, b) => b.date.localeCompare(a.date));
    const bad = (cond) => cond ? 'bad' : '';
    return `
    <div class="top">
      <div class="pt-head"><div class="avatar">${esc(initials(p.name))}</div>
        <div><h1>${esc(p.name)}</h1><p>${age(p.dob)} years · ${esc(p.sex)} · ${esc(p.phone)}</p></div></div>
      <div class="row"><button class="btn" data-nav="patients">Back to patients</button>
        <button class="btn" data-act="new-appt" data-id="${p.id}">Book visit</button>
        <button class="btn danger" data-act="del-patient" data-id="${p.id}">Delete</button></div>
    </div>
    ${fl.length ? `<div class="panel" style="border-color:var(--alert);background:var(--alert-soft);margin-bottom:16px"><b>Flagged:</b> ${fl.join(', ')}</div>` : ''}
    <div class="grid two">
      <div class="grid" style="align-content:start">
        <section class="panel"><header><h2>Vitals</h2><button class="btn small" data-act="new-vitals" data-id="${p.id}">Record vitals</button></header>
          ${lv ? `<div class="vit">
            <div class="${bad(lv.sys >= 140 || lv.dia >= 90 || lv.sys < 90)}"><span>Blood pressure</span><b>${lv.sys}/${lv.dia}</b></div>
            <div class="${bad(lv.hr > 100 || lv.hr < 50)}"><span>Heart rate</span><b>${lv.hr}</b></div>
            <div class="${bad(lv.temp >= 38)}"><span>Temp °C</span><b>${lv.temp}</b></div>
            <div class="${bad(lv.spo2 < 94)}"><span>SpO₂ %</span><b>${lv.spo2}</b></div></div>
            <div class="sub" style="color:var(--muted);font-size:13px">Systolic pressure, last ${sorted.length} readings</div>
            ${spark(sorted.map(v => v.sys))}`
            : '<div class="empty">No vitals yet. Record the first reading.</div>'}
        </section>
        <section class="panel"><header><h2>Clinical notes</h2><button class="btn small" data-act="new-note" data-id="${p.id}">Add note</button></header>
          ${p.notes.length ? [...p.notes].sort((a, b) => b.date.localeCompare(a.date)).map(n => `<div class="note"><small>${fmtDate(n.date)}</small><div>${esc(n.text)}</div></div>`).join('') : '<div class="empty">No notes recorded.</div>'}
        </section>
      </div>
      <div class="grid" style="align-content:start">
        <section class="panel"><header><h2>Health profile</h2><button class="btn small" data-act="edit-profile" data-id="${p.id}">Edit</button></header>
          <p style="margin:0 0 6px"><b>Allergies</b></p>
          <div class="chips" style="margin-bottom:14px">${p.allergies.length ? p.allergies.map(a => `<span class="tag alert">${esc(a)}</span>`).join('') : '<span class="tag mute">None recorded</span>'}</div>
          <p style="margin:0 0 6px"><b>Conditions</b></p>
          <div class="chips" style="margin-bottom:14px">${p.conditions.length ? p.conditions.map(a => `<span class="tag">${esc(a)}</span>`).join('') : '<span class="tag mute">None recorded</span>'}</div>
          <p style="margin:0 0 6px"><b>Medications</b></p>
          ${p.meds.length ? `<ul class="list">${p.meds.map((m, i) => `<li><span>${esc(m)}</span><button class="btn small" data-act="del-med" data-id="${p.id}" data-i="${i}">Remove</button></li>`).join('')}</ul>` : '<div class="sub" style="color:var(--muted)">No medications recorded.</div>'}
          <button class="btn small" style="margin-top:10px" data-act="new-med" data-id="${p.id}">Add medication</button>
        </section>
        <section class="panel"><header><h2>Visits</h2></header>
          ${appts.length ? `<ul class="list">${appts.map(a => `<li><div class="grow"><b>${fmtDate(a.date)}</b> at ${a.time}<div class="sub">${esc(a.reason)}</div></div><span class="tag ${statusTag(a.status)[0]}">${statusTag(a.status)[1]}</span></li>`).join('')}</ul>` : '<div class="empty">No visits yet.</div>'}
        </section>
      </div>
    </div>`;
  },

  appointments() {
    const t = TODAY();
    const groups = {};
    [...db.appts].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).forEach(a => (groups[a.date] ||= []).push(a));
    const dates = Object.keys(groups);
    const upcoming = dates.filter(d => d >= t), past = dates.filter(d => d < t).reverse();
    const block = d => `<section class="panel" style="margin-bottom:14px"><header><h2>${d === t ? 'Today' : fmtDate(d)}</h2></header><ul class="list">${groups[d].map(apptRow).join('')}</ul></section>`;
    return `
    <div class="top"><div><h1>Appointments</h1><p>Check patients in, complete visits, and manage bookings.</p></div>
      <button class="btn primary" data-act="new-appt">Book appointment</button></div>
    ${upcoming.length ? upcoming.map(block).join('') : '<div class="panel empty">No upcoming appointments. Book one to get started.</div>'}
    ${past.length ? `<h2 style="margin:24px 0 12px">Earlier</h2>${past.map(block).join('')}` : ''}`;
  }
};

function apptRow(a) {
  const p = P(a.pid); if (!p) return '';
  const [cls, label] = statusTag(a.status);
  let action = '';
  if (a.status === 'scheduled') action = `<button class="btn small" data-act="status" data-id="${a.id}" data-s="checked-in">Check in</button>`;
  if (a.status === 'checked-in') action = `<button class="btn small primary" data-act="status" data-id="${a.id}" data-s="completed">Complete</button>`;
  const cancel = (a.status === 'scheduled' || a.status === 'checked-in') ? `<button class="btn small danger" data-act="status" data-id="${a.id}" data-s="cancelled">Cancel</button>` : '';
  return `<li><span class="time">${a.time}</span>
    <div class="grow"><button class="link" data-act="open" data-id="${p.id}">${esc(p.name)}</button><div class="sub">${esc(a.reason)}</div></div>
    <span class="tag ${cls}">${label}</span><div class="row">${action}${cancel}</div></li>`;
}

function patientTable() {
  const q = state.q.trim().toLowerCase();
  const rows = db.patients.filter(p => !q || p.name.toLowerCase().includes(q) || p.conditions.join(' ').toLowerCase().includes(q));
  if (!rows.length) return '<div class="empty">No patients match your search.</div>';
  return `<table class="tbl"><thead><tr><th>Name</th><th>Age</th><th>Conditions</th><th>Latest BP</th><th>Status</th></tr></thead><tbody>
    ${rows.map(p => { const v = latest(p), f = flags(v); return `<tr>
      <td><button class="link" data-act="open" data-id="${p.id}">${esc(p.name)}</button></td>
      <td>${age(p.dob)}</td>
      <td>${p.conditions.length ? esc(p.conditions.join(', ')) : '<span style="color:var(--muted)">None</span>'}</td>
      <td>${v ? `${v.sys}/${v.dia}` : '–'}</td>
      <td>${f.length ? `<span class="tag alert">${f.length} flag${f.length > 1 ? 's' : ''}</span>` : '<span class="tag ok">In range</span>'}</td></tr>`; }).join('')}
    </tbody></table>`;
}

/* ---------- Rendering ---------- */
function render() {
  const main = $('#main');
  main.innerHTML = views[state.view]();
  document.querySelectorAll('.nav button').forEach(b => {
    const active = b.dataset.nav === state.view || (state.view === 'patient' && b.dataset.nav === 'patients');
    active ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current');
  });
  const q = $('#q');
  if (q) q.addEventListener('input', e => { state.q = e.target.value; $('#plist').innerHTML = patientTable(); });
}
function go(view, pid = null) { state.view = view; state.pid = pid; render(); window.scrollTo(0, 0); }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2200); }

/* ---------- Dialog forms ---------- */
function openForm(title, html, onSubmit, submitLabel = 'Save') {
  const f = $('#dform');
  f.innerHTML = `<h2>${title}</h2>${html}<div class="actions"><button type="button" class="btn" data-act="close">Cancel</button><button class="btn primary" type="submit">${submitLabel}</button></div>`;
  f.onsubmit = e => { e.preventDefault(); onSubmit(new FormData(f)); $('#dlg').close(); };
  $('#dlg').showModal();
}
const patientOptions = sel => db.patients.map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
const list = s => s.split(',').map(x => x.trim()).filter(Boolean);

const actions = {
  close: () => $('#dlg').close(),
  open: d => go('patient', d.id),

  'new-patient'() {
    openForm('Add patient', `
      <label>Full name<input name="name" required></label>
      <div class="fields2"><label>Date of birth<input name="dob" type="date" required max="${TODAY()}"></label>
        <label>Sex<select name="sex"><option>Female</option><option>Male</option><option>Other</option></select></label></div>
      <label>Phone<input name="phone" type="tel"></label>
      <label>Allergies (comma separated)<input name="allergies"></label>
      <label>Conditions (comma separated)<input name="conditions"></label>`,
      fd => {
        db.patients.push({ id: uid(), name: fd.get('name').trim(), dob: fd.get('dob'), sex: fd.get('sex'), phone: fd.get('phone'), allergies: list(fd.get('allergies')), conditions: list(fd.get('conditions')), meds: [], vitals: [], notes: [] });
        save(); render(); toast('Patient added');
      }, 'Add patient');
  },

  'edit-profile'(d) {
    const p = P(d.id);
    openForm('Edit health profile', `
      <label>Allergies (comma separated)<input name="allergies" value="${esc(p.allergies.join(', '))}"></label>
      <label>Conditions (comma separated)<input name="conditions" value="${esc(p.conditions.join(', '))}"></label>`,
      fd => { p.allergies = list(fd.get('allergies')); p.conditions = list(fd.get('conditions')); save(); render(); toast('Profile saved'); });
  },

  'del-patient'(d) {
    const p = P(d.id);
    if (!confirm(`Delete ${p.name} and all their appointments?`)) return;
    db.patients = db.patients.filter(x => x.id !== p.id);
    db.appts = db.appts.filter(a => a.pid !== p.id);
    save(); go('patients'); toast('Patient deleted');
  },

  'new-vitals'(d) {
    const p = P(d.id);
    openForm(`Record vitals for ${esc(p.name)}`, `
      <div class="fields2"><label>Systolic (mmHg)<input name="sys" type="number" min="50" max="260" required></label>
        <label>Diastolic (mmHg)<input name="dia" type="number" min="30" max="160" required></label></div>
      <div class="fields2"><label>Heart rate (bpm)<input name="hr" type="number" min="20" max="240" required></label>
        <label>Temperature (°C)<input name="temp" type="number" step="0.1" min="30" max="43" required></label></div>
      <label>Oxygen saturation (%)<input name="spo2" type="number" min="50" max="100" required></label>`,
      fd => {
        const v = { date: TODAY(), sys: +fd.get('sys'), dia: +fd.get('dia'), hr: +fd.get('hr'), temp: +fd.get('temp'), spo2: +fd.get('spo2') };
        p.vitals.push(v); save(); render();
        const f = flags(v); toast(f.length ? `Saved. Flagged: ${f.join(', ')}` : 'Vitals saved');
      }, 'Save vitals');
  },

  'new-note'(d) {
    const p = P(d.id);
    openForm('Add clinical note', `<label>Note<textarea name="text" rows="5" required></textarea></label>`,
      fd => { p.notes.push({ date: TODAY(), text: fd.get('text').trim() }); save(); render(); toast('Note added'); });
  },

  'new-med'(d) {
    const p = P(d.id);
    openForm('Add medication', `<label>Medication and dose<input name="med" placeholder="e.g. Atorvastatin 10 mg nightly" required></label>`,
      fd => {
        const m = fd.get('med').trim();
        const allergy = p.allergies.find(a => m.toLowerCase().includes(a.toLowerCase().split(' ')[0]));
        p.meds.push(m); save(); render();
        toast(allergy ? `Added. Check allergy: ${allergy}` : 'Medication added');
      }, 'Add medication');
  },
  'del-med'(d) { const p = P(d.id); p.meds.splice(+d.i, 1); save(); render(); },

  'new-appt'(d) {
    if (!db.patients.length) return toast('Add a patient first');
    openForm('Book appointment', `
      <label>Patient<select name="pid">${patientOptions(d.id)}</select></label>
      <div class="fields2"><label>Date<input name="date" type="date" value="${TODAY()}" min="${TODAY()}" required></label>
        <label>Time<input name="time" type="time" value="09:00" required></label></div>
      <label>Reason for visit<input name="reason" required></label>`,
      fd => {
        db.appts.push({ id: uid(), pid: fd.get('pid'), date: fd.get('date'), time: fd.get('time'), reason: fd.get('reason').trim(), status: 'scheduled' });
        save(); render(); toast('Appointment booked');
      }, 'Book appointment');
  },

  status(d) { const a = db.appts.find(x => x.id === d.id); a.status = d.s; save(); render(); toast({ 'checked-in': 'Checked in', completed: 'Visit completed', cancelled: 'Appointment cancelled' }[d.s]); }
};

/* ---------- Events ---------- */
document.addEventListener('click', e => {
  const nav = e.target.closest('[data-nav]');
  if (nav) return go(nav.dataset.nav);
  const act = e.target.closest('[data-act]');
  if (act && actions[act.dataset.act]) actions[act.dataset.act](act.dataset);
});
$('#dlg').addEventListener('click', e => { if (e.target.id === 'dlg') e.target.close(); });

render();
