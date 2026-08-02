// 렌더링과 사용자 입력
import { now, todayKey, isFakeClock } from './clock.js';
import {
  getState, getToday, save, resetAll, completeQuest, addCustomQuest,
  canComplete, levelInfo, ddayText,
} from './state.js';
import * as effects from './effects.js';
import { renderStats } from './stats.js';

const $ = sel => document.querySelector(sel);

const PRAISE_LINES = [
  '미쳤다!! 이걸 해내네?! 👏👏',
  '오늘도 전설을 쓰는 중…',
  '이불의 저주를 이겨냈다!!',
  '천재적인 움직임이었다…',
  '온 우주가 너의 아침을 응원한다!!',
  '이 속도 실화냐?! 대박!!',
];

const CLEAR_TITLES = {
  S: '🏆 전설의 아침이다!!',
  A: '🎉 완벽에 가까운 아침!',
  B: '👍 좋아, 내일은 A 간다',
  C: '😮‍💨 아슬아슬… 그래도 해냈다',
  F: '💀 너무 늦었다…',
};

const FAIL_LINES = [
  '오늘의 퀘스트는 실패했다.\n내일의 너는 다르게 살아라.',
  '스트릭이 불탔다…\n이 감정을 기억해라.',
];

// ===== 헤더 =====
export function renderHeader() {
  $('#dday').textContent = ddayText();
  const info = levelInfo();
  $('#level-title').textContent = `Lv.${info.level} ${info.title} ${info.emoji}`;
  $('#streak').textContent = `🔥 ${getState().streak}일`;
  $('#xp-fill').style.width = `${Math.round(info.progress * 100)}%`;
  $('#xp-text').textContent = info.nextXp
    ? `${info.xp} / ${info.nextXp} XP`
    : `${info.xp} XP (만렙!)`;
}

export function renderClock() {
  const t = now();
  const hh = String(t.getHours()).padStart(2, '0');
  const mm = String(t.getMinutes()).padStart(2, '0');
  $('#clock').textContent = `${hh}:${mm}` + (isFakeClock() ? ' 🧪' : '');
}

// ===== 타이머 =====
export function renderTimer() {
  const day = getToday();
  const box = $('#timer-box');
  if (!day.wakeAt) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  const end = day.arriveAt ? new Date(day.arriveAt) : now();
  const sec = Math.max(0, Math.floor((end - new Date(day.wakeAt)) / 1000));
  $('#timer').textContent = fmtDuration(sec);
}

export function fmtDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ===== 퀘스트 리스트 =====
export function renderQuests() {
  const day = getToday();
  const ul = $('#quest-list');
  ul.innerHTML = '';
  day.quests.forEach((q, i) => {
    const li = document.createElement('li');
    const done = q.doneAt !== null;
    const enabled = canComplete(q.id);
    li.className = 'quest-item' + (done ? ' done' : '') + (!done && !enabled ? ' locked' : '');

    const num = document.createElement('span');
    num.className = 'quest-num';
    num.textContent = `${i + 1}차`;

    const title = document.createElement('span');
    title.className = 'quest-title';
    title.textContent = q.title;

    const right = document.createElement(done ? 'span' : 'button');
    if (done) {
      right.className = 'quest-time';
      const d = new Date(q.doneAt);
      right.textContent = `✅ ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } else {
      right.className = 'quest-btn' + (q.id === 'q1' ? ' wake' : '');
      right.textContent = q.id === 'q1' ? '⚔️ 기상!' : '완료';
      right.disabled = !enabled;
      right.addEventListener('click', () => onComplete(q.id));
    }

    li.append(num, title, right);
    ul.appendChild(li);
  });

  // 커스텀 추가는 항상 노출 (완료는 3차 이후 가능)
  $('#custom-add').classList.remove('hidden');
}

function onComplete(questId) {
  const result = completeQuest(questId);
  if (!result) return;
  effects.unlockAudio();

  if (result.cleared) {
    showClearOverlay(result.cleared);
  } else {
    showPraiseOverlay(result.quest);
  }
  renderAll();
}

// ===== 오버레이 =====
function overlayShow(html, { failMode = false } = {}) {
  const ov = $('#overlay');
  ov.classList.toggle('fail-mode', failMode);
  $('#overlay-content').innerHTML = html;
  ov.classList.remove('hidden');
  $('#overlay-close')?.addEventListener('click', () => {
    ov.classList.add('hidden');
    effects.stopConfetti();
  });
}

function showPraiseOverlay(quest) {
  const line = PRAISE_LINES[Math.floor(Math.random() * PRAISE_LINES.length)];
  overlayShow(`
    <div class="big">🎉</div>
    <h1>${quest.title} 클리어!</h1>
    <p>${line}</p>
    <button id="overlay-close">다음 퀘스트로!</button>
  `);
  effects.confetti('normal');
  effects.playPraise().then(ok => { if (!ok) effects.playFanfare(); });
}

function showClearOverlay(c) {
  const parts = [
    `<div class="rank-letter ${c.rank}">${c.rank}</div>`,
    `<h1>${CLEAR_TITLES[c.rank]}</h1>`,
    `<p>밍기적 시간: <b>${fmtDuration(c.mingiSec)}</b></p>`,
    c.newRecord ? `<div class="record">🏅 신기록 달성!!</div>` : '',
    `<div class="xp-gain">+${c.xpGained} XP</div>`,
    c.levelUp ? `<p>⬆️ 레벨 업!! <b>Lv.${c.levelUp.level} ${c.levelUp.title} ${c.levelUp.emoji}</b></p>` : '',
    `<p>🔥 연속 ${c.streak}일째</p>`,
    `<button id="overlay-close">오늘도 승리 🙌</button>`,
  ];
  overlayShow(parts.join(''), { failMode: c.rank === 'F' });
  if (c.rank === 'F') {
    effects.playFailSound();
  } else {
    effects.confetti(c.rank === 'S' || c.newRecord ? 'max' : 'normal');
    effects.playPraise().then(ok => { if (!ok) effects.playFanfare(); });
  }
}

export function showFailOverlay() {
  const line = FAIL_LINES[Math.floor(Math.random() * FAIL_LINES.length)];
  overlayShow(`
    <div class="rank-letter F">F</div>
    <h1>QUEST FAILED</h1>
    <p>${line}</p>
    <button id="overlay-close">…내일 보자</button>
  `, { failMode: true });
  effects.playFailSound();
  renderAll();
}

// ===== 경고 배너 =====
export function showWarning(stage, message) {
  const banner = $('#warn-banner');
  banner.className = `warn-banner stage${stage}`;
  banner.textContent = message;
  banner.classList.remove('hidden');

  if (stage === 1) {
    effects.playBeep();
  } else if (stage === 2) {
    // 엄마 목소리 경고, 없으면 삑삑
    effects.playWarnVoice().then(ok => { if (!ok) effects.playBeep(3); });
    document.getElementById('app').classList.remove('shaking');
    void document.getElementById('app').offsetWidth;
    document.getElementById('app').classList.add('shaking');
  } else {
    // 엄마 목소리 경고, 없으면 사이렌
    effects.playWarnVoice().then(ok => { if (!ok) effects.playSiren(); });
    effects.flashRed();
    document.getElementById('app').classList.remove('shaking');
    void document.getElementById('app').offsetWidth;
    document.getElementById('app').classList.add('shaking');
  }
}

export function hideWarning() {
  $('#warn-banner').classList.add('hidden');
}

// ===== 탭/설정/입력 바인딩 =====
export function bindEvents() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ['quest', 'stats', 'settings'].forEach(name => {
        $(`#tab-${name}`).classList.toggle('hidden', name !== btn.dataset.tab);
      });
      if (btn.dataset.tab === 'stats') renderStats();
    });
  });

  $('#custom-btn').addEventListener('click', () => {
    const input = $('#custom-input');
    if (addCustomQuest(input.value)) {
      input.value = '';
      renderQuests();
    }
  });

  $('#sound-toggle').addEventListener('click', () => {
    const s = getState();
    s.settings.sound = !s.settings.sound;
    save();
    $('#sound-toggle').textContent = s.settings.sound ? '켜짐' : '꺼짐';
  });
  $('#sound-toggle').textContent = getState().settings.sound ? '켜짐' : '꺼짐';

  $('#reset-btn').addEventListener('click', () => {
    if (confirm('정말 모든 기록을 삭제할까요? 되돌릴 수 없어요.')) {
      resetAll();
      location.reload();
    }
  });
}

export function renderAll() {
  renderHeader();
  renderClock();
  renderTimer();
  renderQuests();
}
