/**
 * Clock — updates time, date, and greeting every second.
 */

const elTime = document.getElementById('time');
const elDate = document.getElementById('date');
const elGreeting = document.getElementById('greeting');

function formatTime(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const w = weekdays[date.getDay()];
  return `${y}年${m}月${d}日 星期${w}`;
}

function getGreeting(hour) {
  if (hour < 6)  return '夜深了 🌙';
  if (hour < 9)  return '早上好 ☀️';
  if (hour < 12) return '上午好 🌤️';
  if (hour < 14) return '中午好 ☀️';
  if (hour < 18) return '下午好 🌿';
  if (hour < 22) return '晚上好 🌆';
  return '夜深了 🌙';
}

function tick() {
  const now = new Date();
  elTime.textContent = formatTime(now);
  elDate.textContent = formatDate(now);
  elGreeting.textContent = getGreeting(now.getHours());
}

export function initClock() {
  tick();
  // Align to next whole second
  const ms = 1000 - (Date.now() % 1000);
  setTimeout(() => {
    tick();
    setInterval(tick, 1000);
  }, ms);
}
