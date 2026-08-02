// 연출 — Web Audio 합성음, 콘페티, 화면 효과, 엄마 목소리
import { getState } from './state.js';

let ctx = null;

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  // iOS: 사용자 터치 시점에 오디오 엘리먼트를 무음 재생으로 잠금 해제
  // → 이후 경고 시점(터치 없음)에도 목소리 재생 가능
  const audio = getVoiceAudio();
  if (!audio.src) {
    audio.muted = true;
    audio.src = 'data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAACcQCA';
    audio.play().catch(() => {});
  }
}

function soundOn() {
  return getState().settings.sound && ctx;
}

function tone(freq, start, dur, { type = 'square', gain = 0.15, endFreq = null } = {}) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  if (endFreq) osc.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + start + dur);
  g.gain.setValueAtTime(gain, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur + 0.05);
}

// 1차 경고음: 짧은 삑
export function playBeep(times = 1) {
  unlockAudio();
  if (!soundOn()) return;
  for (let i = 0; i < times; i++) tone(880, i * 0.25, 0.15);
}

// 분노 모드: 사이렌 (상승-하강 스윕 반복)
export function playSiren() {
  unlockAudio();
  if (!soundOn()) return;
  for (let i = 0; i < 4; i++) {
    tone(500, i * 0.6, 0.3, { type: 'sawtooth', gain: 0.2, endFreq: 1200 });
    tone(1200, i * 0.6 + 0.3, 0.3, { type: 'sawtooth', gain: 0.2, endFreq: 500 });
  }
}

// 팡파레: 상승 아르페지오
export function playFanfare() {
  unlockAudio();
  if (!soundOn()) return;
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((f, i) => tone(f, i * 0.12, 0.35, { type: 'triangle', gain: 0.18 }));
  tone(1047, notes.length * 0.12, 0.7, { type: 'triangle', gain: 0.2 });
}

// 실패음: 하강
export function playFailSound() {
  unlockAudio();
  if (!soundOn()) return;
  const notes = [440, 370, 311, 233];
  notes.forEach((f, i) => tone(f, i * 0.3, 0.4, { type: 'sawtooth', gain: 0.15 }));
}

// ===== 엄마 목소리 =====
// 공유 오디오 엘리먼트: 첫 사용자 터치 때 잠금 해제해서
// 이후(경고 등) 터치 없이도 재생 가능하게 유지한다.
let voiceAudio = null;
const soundCache = {}; // dir → 파일 목록

function getVoiceAudio() {
  if (!voiceAudio) voiceAudio = new Audio();
  return voiceAudio;
}

async function probeSoundFiles(dir, prefix, dataUris) {
  if (soundCache[dir]) return soundCache[dir];
  // 단일 파일 배포(아티팩트)에서는 데이터 URI로 심은 목소리를 사용
  if (Array.isArray(dataUris) && dataUris.length > 0) {
    soundCache[dir] = dataUris.slice();
    return soundCache[dir];
  }
  const found = [];
  const candidates = [];
  for (let i = 1; i <= 9; i++) {
    candidates.push(`sounds/${dir}/${prefix}${i}.mp3`, `sounds/${dir}/${prefix}${i}.m4a`);
  }
  await Promise.all(candidates.map(async url => {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) found.push(url);
    } catch { /* 없음 */ }
  }));
  soundCache[dir] = found;
  return found;
}

async function playVoice(dir, prefix, dataUris) {
  if (!getState().settings.sound) return true; // 무음 설정이면 대체음도 내지 않음
  const files = await probeSoundFiles(dir, prefix, dataUris);
  if (files.length === 0) return false;
  const url = files[Math.floor(Math.random() * files.length)];
  try {
    const audio = getVoiceAudio();
    audio.pause();
    audio.src = url;
    audio.muted = false;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

// 재생 성공하면 true, 파일 없으면 false (호출부에서 팡파레로 대체)
export function playPraise() {
  return playVoice('praise', 'praise', window.PRAISE_DATA_URIS);
}

// 경고용 엄마 목소리. 없으면 false (호출부에서 사이렌으로 대체)
export function playWarnVoice() {
  return playVoice('warn', 'warn', window.WARN_DATA_URIS);
}

// ===== 콘페티 =====
let confettiRAF = null;

export function confetti(intensity = 'normal') {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const c = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const count = intensity === 'max' ? 200 : 80;
  const colors = ['#fde047', '#34d399', '#60a5fa', '#f472b6', '#fb923c'];
  const parts = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.5,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    vy: 2 + Math.random() * 3,
    vx: -1.5 + Math.random() * 3,
    rot: Math.random() * Math.PI,
    vr: -0.1 + Math.random() * 0.2,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  const started = performance.now();
  const durMs = intensity === 'max' ? 5000 : 2500;

  cancelAnimationFrame(confettiRAF);
  function frame(t) {
    c.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.fillStyle = p.color;
      c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      c.restore();
    });
    if (t - started < durMs) {
      confettiRAF = requestAnimationFrame(frame);
    } else {
      c.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  confettiRAF = requestAnimationFrame(frame);
}

export function stopConfetti() {
  cancelAnimationFrame(confettiRAF);
  const canvas = document.getElementById('confetti-canvas');
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

// ===== 빨간 점멸 =====
export function flashRed() {
  let el = document.getElementById('red-flash');
  if (!el) {
    el = document.createElement('div');
    el.id = 'red-flash';
    document.body.appendChild(el);
  }
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
}
