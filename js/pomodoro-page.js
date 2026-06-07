/**
 * Pomodoro page entry — initialises the timer and handles navigation.
 * Loaded as an external module to satisfy MV3 CSP (no inline scripts).
 */
import { initPomodoro } from './pomodoro.js';

document.getElementById('pomodoro-back').addEventListener('click', () => {
  document.body.classList.remove('page-fade-in');
  document.body.classList.add('page-fade-out');
  setTimeout(() => {
    window.location.href = 'newtab.html';
  }, 300);
});

initPomodoro();
