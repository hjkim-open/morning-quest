// 경고 타임라인 — 1초마다 호출되어 경고/실패를 판정한다
import { minutesOfDay } from './clock.js';
import { getToday, markFailed, save, TIMES } from './state.js';

// 2차 경고 (10:25~) — 욕설 시작
// 수위를 바꾸고 싶으면 아래 문구를 직접 수정하세요. (외모·신체 비하, 혐오 표현 금지)
export const INSULTS_LV1 = [
  '야 이 게으른 자식아, 아직도 누워있냐?',
  '한심하다 진짜. 이불이 네 인생 책임져주냐?',
  '10시 25분이다. 정신 안 차리냐?',
  '밍기적거리는 꼬라지 하고는… 얼른 안 일어나?',
  '세수하는 데 5분이면 된다. 뭐가 그렇게 오래 걸려!!',
  '지금 일어나면 아직 안 늦었다. 계속 이러면 진짜 노답 된다?',
];

// 분노 모드 (10:30~, 5분마다) — 더 심한 욕설
export const INSULTS_LV2 = [
  '미쳤냐?? 시험이 코앞인데 아직도 침대야?!',
  '이 정도면 의지박약이 아니라 그냥 노답이다 노답.',
  '할머니는 밥 차려놓고 기다리시는데 이러고 있냐? 부끄러운 줄 알아라!!',
  '야이 답답아!! 네 미래가 지금 이불 속에서 썩고 있다고!!',
  '불합격 통지서 받고 싶어서 환장했구나?',
  '지금 이 순간에도 인강은 안 듣고 뭐 하는 거냐 진짜!!',
  '돌겠네 진짜. 일어나. 일어나라고. 당장!!!',
  '네 라이벌들은 벌써 책상에 앉아 있다. 너만 이불에 있다.',
];

const WARN1_MESSAGE = '⚠️ 10시 20분. 슬슬 위험하다… 움직이자?';

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 매초 호출. callbacks: { onWarn(stage, message), onFail() }
export function checkTimeline({ onWarn, onFail }) {
  const day = getToday();

  // 3차 완료했거나 이미 실패면 경고 없음
  if (day.arriveAt || day.failed) return { active: false };

  const min = minutesOfDay();

  // 11:00 실패 판정
  if (min >= TIMES.fail) {
    if (markFailed()) onFail();
    return { active: false };
  }

  let stage = 0;
  let key = null;
  let message = null;

  if (min >= TIMES.rage) {
    // 10:30부터 5분 경계마다 새 경고
    const slot = Math.floor((min - TIMES.rage) / 5);
    stage = 3;
    key = `rage-${slot}`;
    message = '🔥 ' + pick(INSULTS_LV2);
  } else if (min >= TIMES.warn2) {
    stage = 2;
    key = 'warn2';
    message = '🚨 ' + pick(INSULTS_LV1);
  } else if (min >= TIMES.warn1) {
    stage = 1;
    key = 'warn1';
    message = WARN1_MESSAGE;
  }

  if (key && !day.warnedStages.includes(key)) {
    day.warnedStages.push(key);
    save();
    onWarn(stage, message);
  }

  return { active: stage > 0 };
}
