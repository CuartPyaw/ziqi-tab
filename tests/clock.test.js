/**
 * Clock — time, date, greeting formatting and DOM updates.
 *
 * We test through the public API (initClock) by freezing time with fake timers
 * and then inspecting the DOM output.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initClock } from '../js/clock.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('initClock', () => {
  it('renders the current time immediately', () => {
    vi.setSystemTime(new Date('2026-06-08T09:30:45'));
    initClock();

    expect(document.getElementById('time-hm').textContent).toBe('09:30');
    expect(document.getElementById('time-sec').textContent).toBe(':45');
  });

  it('renders the current date in Chinese format', () => {
    vi.setSystemTime(new Date('2026-06-08T09:00:00'));
    initClock();

    expect(document.getElementById('date').textContent).toBe('2026年6月8日 星期一');
  });

  it('renders Sunday correctly', () => {
    // 2026-06-07 is a Sunday
    vi.setSystemTime(new Date('2026-06-07T12:00:00'));
    initClock();
    expect(document.getElementById('date').textContent).toContain('星期日');
  });

  it('renders Saturday correctly', () => {
    // 2026-06-13 is a Saturday
    vi.setSystemTime(new Date('2026-06-13T12:00:00'));
    initClock();
    expect(document.getElementById('date').textContent).toContain('星期六');
  });
});

describe('greeting', () => {
  function greetingAt(hour) {
    vi.setSystemTime(new Date(`2026-06-08T${String(hour).padStart(2, '0')}:00:00`));
    initClock();
    return document.getElementById('greeting').textContent;
  }

  it('says 夜深了 between 0-5', () =>             expect(greetingAt(0)).toBe('夜深了'));
  it('says 夜深了 at 23', () =>                    expect(greetingAt(23)).toBe('夜深了'));
  it('says 早上好 at 6-8', () =>                   expect(greetingAt(6)).toBe('早上好'));
  it('says 上午好 at 9-11', () =>                  expect(greetingAt(9)).toBe('上午好'));
  it('says 中午好 at 12-13', () =>                 expect(greetingAt(12)).toBe('中午好'));
  it('says 下午好 at 14-17', () =>                 expect(greetingAt(14)).toBe('下午好'));
  it('says 晚上好 at 18-21', () =>                 expect(greetingAt(18)).toBe('晚上好'));
});

describe('tick', () => {
  it('updates seconds every tick', () => {
    vi.setSystemTime(new Date('2026-06-08T09:00:00.000'));
    initClock();

    // First tick happens after alignment timeout (1000ms - 0ms = 1000ms)
    vi.advanceTimersByTime(1000);
    expect(document.getElementById('time-sec').textContent).toBe(':01');
    expect(document.getElementById('time-hm').textContent).toBe('09:00');

    vi.advanceTimersByTime(1000);
    expect(document.getElementById('time-sec').textContent).toBe(':02');
  });

  it('carries over minute at 59→00 transition', () => {
    vi.setSystemTime(new Date('2026-06-08T09:00:59.000'));
    initClock();

    expect(document.getElementById('time-hm').textContent).toBe('09:00');
    expect(document.getElementById('time-sec').textContent).toBe(':59');

    // Advance past 1 second alignment + 1 second tick = 2000ms
    vi.advanceTimersByTime(2000);
    expect(document.getElementById('time-hm').textContent).toBe('09:01');
    expect(document.getElementById('time-sec').textContent).toBe(':01');
  });
});
