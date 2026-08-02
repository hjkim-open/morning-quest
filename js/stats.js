// 기록 탭 — 밍기적 그래프, 랭크 캘린더, 배지
import { now, todayKey } from './clock.js';
import { getState } from './state.js';
import { fmtDuration } from './ui.js';

const $stats = sel => document.querySelector(sel);

const RANK_EMOJI = { S: '🌟', A: '🅰️', B: '🅱️', C: '©️', F: '💀' };

export function renderStats() {
  renderChart();
  renderCalendar();
  renderBadges();
}

function lastNDays(n) {
  const out = [];
  const base = new Date(todayKey() + 'T00:00:00');
  for (let i = n - 1; i >= 0; i--) {
    out.push(todayKey(new Date(base.getTime() - i * 86400000)));
  }
  return out;
}

function renderChart() {
  const s = getState();
  const chart = $stats('#chart');
  chart.innerHTML = '';
  const keys = lastNDays(14);
  const vals = keys.map(k => s.days[k]?.mingiSec ?? null);
  const max = Math.max(600, ...vals.filter(v => v !== null));
  let hasData = false;

  keys.forEach((k, i) => {
    const v = vals[i];
    const day = s.days[k];
    const col = document.createElement('div');
    col.className = 'bar-col';

    const val = document.createElement('span');
    val.className = 'bar-val';
    const bar = document.createElement('div');
    bar.className = 'bar';

    if (v !== null) {
      hasData = true;
      val.textContent = fmtDuration(v);
      bar.style.height = `${Math.max(4, Math.round((v / max) * 90))}%`;
      if (s.bestMingi !== null && v === s.bestMingi) bar.classList.add('best');
    } else if (day?.failed) {
      hasData = true;
      val.textContent = '실패';
      bar.style.height = '90%';
      bar.classList.add('fail');
    } else {
      val.textContent = '·';
      bar.style.height = '4%';
    }

    const label = document.createElement('span');
    label.className = 'bar-label';
    label.textContent = `${Number(k.slice(5, 7))}/${Number(k.slice(8, 10))}`;

    col.append(val, bar, label);
    chart.appendChild(col);
  });

  if (!hasData) {
    chart.innerHTML = '<p style="color:#9ca3af;font-size:13px;align-self:center;margin:auto">아직 기록이 없어요. 내일 아침부터 쌓아보자! 💪</p>';
  } else {
    // 최근 기록이 보이도록 오른쪽 끝으로 스크롤
    chart.scrollLeft = chart.scrollWidth;
  }
}

function renderCalendar() {
  const s = getState();
  const cal = $stats('#calendar');
  cal.innerHTML = '';
  const t = now();
  const year = t.getFullYear();
  const month = t.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayKey();

  ['일', '월', '화', '수', '목', '금', '토'].forEach(w => {
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    cell.textContent = w;
    cal.appendChild(cell);
  });
  for (let i = 0; i < first.getDay(); i++) {
    cal.appendChild(Object.assign(document.createElement('div'), { className: 'cal-cell' }));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = todayKey(new Date(year, month, d));
    const day = s.days[key];
    const cell = document.createElement('div');
    cell.className = 'cal-cell' + (key === today ? ' today' : '');
    const rank = day?.rank ? `<span class="rank">${RANK_EMOJI[day.rank] || ''}</span>` : '';
    cell.innerHTML = `<span>${d}</span>${rank}`;
    cal.appendChild(cell);
  }
}

function renderBadges() {
  const s = getState();
  const box = $stats('#badges');
  box.innerHTML = '';
  // 역대 최장 스트릭 기록이 없으므로 현재 스트릭 기준으로 표시
  [
    { need: 3, icon: '🥉', label: '3일 연속' },
    { need: 7, icon: '🥈', label: '7일 연속' },
    { need: 14, icon: '🥇', label: '14일 연속' },
  ].forEach(b => {
    const el = document.createElement('div');
    el.className = 'badge' + (s.streak >= b.need ? '' : ' off');
    el.innerHTML = `<span class="icon">${b.icon}</span>${b.label}`;
    box.appendChild(el);
  });
}
