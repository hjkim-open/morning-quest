// 상태 관리 — localStorage 스키마와 게임 규칙
import { now, todayKey } from './clock.js';

const KEY = 'morningQuest.v1';
export const EXAM_DATE = '2026-08-22';

// 시간 기준 (분 단위, 자정 기준)
export const TIMES = {
  warn1: 10 * 60 + 20,  // 10:20
  warn2: 10 * 60 + 25,  // 10:25
  rage: 10 * 60 + 30,   // 10:30 (이후 5분 간격)
  fail: 11 * 60,        // 11:00
  sTarget: 10 * 60 + 30,
  aTarget: 10 * 60 + 40,
  bTarget: 10 * 60 + 50,
  cTarget: 11 * 60,
};

export const LEVELS = [
  { xp: 0,    title: '이불 애벌레',      emoji: '🐛' },
  { xp: 80,   title: '눈뜬 좀비',        emoji: '🧟' },
  { xp: 180,  title: '세수 견습생',      emoji: '🧼' },
  { xp: 300,  title: '아침 모험가',      emoji: '🎒' },
  { xp: 450,  title: '기상 기사단원',    emoji: '⚔️' },
  { xp: 620,  title: '밍기적 학살자',    emoji: '🗡️' },
  { xp: 820,  title: '아침의 지배자',    emoji: '👑' },
  { xp: 1050, title: '전설의 아침 용사', emoji: '🏆' },
];

const FIXED_QUESTS = [
  { id: 'q1', title: '기상! 침대 탈출' },
  { id: 'q2', title: '세수 + 양치' },
  { id: 'q3', title: '할머니집 도착' },
];

let state = null;

function defaultState() {
  return {
    xp: 0,
    streak: 0,
    lastSuccessDate: null,
    bestMingi: null,
    settings: { sound: true },
    days: {},
  };
}

export function getState() {
  if (!state) {
    try {
      state = JSON.parse(localStorage.getItem(KEY)) || defaultState();
    } catch {
      state = defaultState();
    }
  }
  return state;
}

export function save() {
  localStorage.setItem(KEY, JSON.stringify(getState()));
}

export function resetAll() {
  state = defaultState();
  save();
}

// 오늘 데이터 (없으면 고정 퀘스트 3개로 생성 = 자정 리셋)
export function getToday() {
  const s = getState();
  const key = todayKey();
  if (!s.days[key]) {
    s.days[key] = {
      quests: FIXED_QUESTS.map(q => ({ ...q, fixed: true, doneAt: null })),
      wakeAt: null,
      arriveAt: null,
      mingiSec: null,
      rank: null,
      failed: false,
      warnedStages: [],   // 발동한 경고 기록 ('1', '2', 'rage-630' 등)
      newRecord: false,
      xpEarned: 0,
    };
    save();
  }
  return s.days[key];
}

function fixedDone(day, id) {
  const q = day.quests.find(q => q.id === id);
  return q && q.doneAt !== null;
}

export function canComplete(questId) {
  const day = getToday();
  const q = day.quests.find(q => q.id === questId);
  if (!q || q.doneAt) return false;
  if (q.fixed) {
    if (q.id === 'q1') return true;
    if (q.id === 'q2') return fixedDone(day, 'q1');
    if (q.id === 'q3') return fixedDone(day, 'q2');
  }
  // 커스텀 퀘스트는 3차(할머니집 도착) 이후
  return fixedDone(day, 'q3');
}

// 퀘스트 완료. 반환: { quest, cleared: 클리어결과|null }
export function completeQuest(questId) {
  const day = getToday();
  if (!canComplete(questId)) return null;
  const q = day.quests.find(q => q.id === questId);
  q.doneAt = now().toISOString();

  let cleared = null;
  if (q.id === 'q1') {
    day.wakeAt = q.doneAt;
    day.xpEarned += 10;
    getState().xp += 10;
  } else if (q.id === 'q3') {
    day.arriveAt = q.doneAt;
    day.mingiSec = Math.max(0, Math.round((new Date(day.arriveAt) - new Date(day.wakeAt)) / 1000));
    day.xpEarned += 10;
    getState().xp += 10;
    cleared = applyClear(day);
  } else if (q.fixed) {
    day.xpEarned += 10;
    getState().xp += 10;
  } else {
    day.xpEarned += 5;
    getState().xp += 5;
  }
  save();
  return { quest: q, cleared };
}

export function addCustomQuest(title) {
  const day = getToday();
  const t = title.trim();
  if (!t) return null;
  const q = { id: 'c' + Date.now(), title: t, fixed: false, doneAt: null };
  day.quests.push(q);
  save();
  return q;
}

// 3차 완료 시 랭크·XP·스트릭·신기록 판정
function applyClear(day) {
  const s = getState();
  const arrive = new Date(day.arriveAt);
  const min = arrive.getHours() * 60 + arrive.getMinutes() + arrive.getSeconds() / 60;

  let rank, bonus;
  if (min < TIMES.sTarget) { rank = 'S'; bonus = 50; }
  else if (min < TIMES.aTarget) { rank = 'A'; bonus = 30; }
  else if (min < TIMES.bTarget) { rank = 'B'; bonus = 20; }
  else if (min < TIMES.cTarget) { rank = 'C'; bonus = 10; }
  else { rank = 'F'; bonus = 0; }

  day.rank = rank;
  const prevLevel = levelInfo(s.xp).level;

  let newRecord = false;
  if (rank !== 'F') {
    day.failed = false;
    // 신기록
    if (s.bestMingi === null || day.mingiSec < s.bestMingi) {
      s.bestMingi = day.mingiSec;
      newRecord = true;
      bonus += 30;
    }
    // 스트릭
    const yesterday = todayKey(new Date(new Date(day.arriveAt).getTime() - 86400000));
    s.streak = (s.lastSuccessDate === yesterday) ? s.streak + 1 : 1;
    s.lastSuccessDate = todayKey(new Date(day.arriveAt));
  } else {
    day.failed = true;
    s.streak = 0;
  }

  day.newRecord = newRecord;
  s.xp += bonus;
  day.xpEarned += bonus;
  save();

  const after = levelInfo(s.xp);
  return {
    rank,
    mingiSec: day.mingiSec,
    xpGained: bonus + 10, // 퀘스트 기본 10 포함해 표시용
    newRecord,
    streak: s.streak,
    levelUp: after.level > prevLevel ? after : null,
  };
}

// 11:00 실패 처리 (3차 미완료)
export function markFailed() {
  const day = getToday();
  if (day.failed || day.arriveAt) return false;
  day.failed = true;
  day.rank = 'F';
  getState().streak = 0;
  save();
  return true;
}

export function levelInfo(xp = getState().xp) {
  let level = 1;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) level = i + 1;
  }
  const cur = LEVELS[level - 1];
  const next = LEVELS[level] || null;
  const progress = next
    ? (xp - cur.xp) / (next.xp - cur.xp)
    : 1;
  return { level, title: cur.title, emoji: cur.emoji, progress, xp, nextXp: next ? next.xp : null };
}

export function ddayText() {
  const [y, m, d] = EXAM_DATE.split('-').map(Number);
  const exam = new Date(y, m - 1, d);
  const today = new Date(todayKey() + 'T00:00:00');
  const diff = Math.round((exam - today) / 86400000);
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return 'D-DAY!';
  return '시험 끝!';
}
