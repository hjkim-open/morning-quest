// 시계 모듈 — 모든 시간 판정은 반드시 이 모듈을 거친다.
// 테스트용 오버라이드: ?t=HH:MM (시각), ?d=YYYY-MM-DD (날짜)

const params = new URLSearchParams(location.search);
let offsetMs = 0;

(function initOverride() {
  const real = new Date();
  let target = new Date(real);
  let changed = false;

  const d = params.get('d');
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-').map(Number);
    target.setFullYear(y, m - 1, day);
    changed = true;
  }
  const t = params.get('t');
  if (t && /^\d{1,2}:\d{2}$/.test(t)) {
    const [h, min] = t.split(':').map(Number);
    target.setHours(h, min, 0, 0);
    changed = true;
  }
  if (changed) offsetMs = target.getTime() - real.getTime();
})();

export function now() {
  return new Date(Date.now() + offsetMs);
}

export function todayKey(date = now()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 자정부터 지난 분 (소수점 포함)
export function minutesOfDay(date = now()) {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

export function isFakeClock() {
  return offsetMs !== 0;
}
