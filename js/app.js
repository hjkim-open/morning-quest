// 엔트리 — 초기화와 1초 틱
import { todayKey } from './clock.js';
import { getToday } from './state.js';
import { checkTimeline } from './timeline.js';
import {
  bindEvents, renderAll, renderClock, renderTimer, renderQuests,
  showWarning, showFailOverlay, hideWarning,
} from './ui.js';

let currentDay = todayKey();

function tick() {
  // 자정(또는 날짜 오버라이드) 넘어가면 새로운 하루
  if (todayKey() !== currentDay) {
    currentDay = todayKey();
    hideWarning();
    renderAll();
    return;
  }

  renderClock();
  renderTimer();

  const { active } = checkTimeline({
    onWarn: (stage, message) => {
      showWarning(stage, message);
      renderQuests();
    },
    onFail: quiet => showFailOverlay(quiet),
  });

  const day = getToday();
  if (!active && (day.arriveAt || day.failed)) hideWarning();
}

function init() {
  getToday();       // 오늘 데이터 생성 (자정 리셋 포함)
  bindEvents();
  renderAll();

  // 아이폰인데 홈 화면 앱이 아니면(Safari·카톡 등) 저장 안내 표시
  // — 여는 방식마다 저장소가 달라 기록이 사라진 것처럼 보이는 것 방지
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (isIOS && navigator.standalone !== true) {
    document.getElementById('standalone-tip').classList.remove('hidden');
  }
  setInterval(tick, 1000);

  // PWA service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
