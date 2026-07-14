import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initTodos } from '../js/todos.js';

function mountTodos() {
  document.body.innerHTML = `
    <button id="todos-toggle" type="button"></button>
    <dialog id="todos-dialog">
      <div class="todos-dialog-head">
        <div class="todos-dialog-tabs">
          <button class="todos-dialog-tab is-active" type="button" data-todo-tab="active" aria-selected="true"></button>
          <button class="todos-dialog-tab" type="button" data-todo-tab="archive" aria-selected="false"></button>
        </div>
        <span id="todos-count"></span>
      </div>
      <section data-todo-panel="active"><ul id="todo-list"></ul><p id="todo-empty" hidden></p><input id="todo-input"></section>
      <section data-todo-panel="archive" hidden><ul id="archive-list"></ul><p id="archive-empty" hidden></p></section>
    </dialog>
  `;
}

beforeEach(() => {
  localStorage.clear();
  mountTodos();
  vi.restoreAllMocks();
});

afterEach(() => vi.useRealTimers());

describe('todos', () => {
  it('opens the left-side dialog and focuses the active tab', () => {
    initTodos();
    document.getElementById('todos-toggle').click();

    expect(document.getElementById('todos-dialog').open).toBe(true);
    expect(document.activeElement).toBe(document.querySelector('[data-todo-tab="active"]'));
  });

  it('adds a new todo to the active list', () => {
    initTodos();
    const input = document.getElementById('todo-input');
    input.value = '整理发布笔记';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(document.querySelector('.todo-title').textContent).toBe('整理发布笔记');
    expect(JSON.parse(localStorage.getItem('ziqi-todos'))).toHaveLength(1);
  });

  it('archives a completed todo', () => {
    localStorage.setItem('ziqi-todos', JSON.stringify([{ id: 'one', title: '整理发布笔记', completedAt: null }]));
    initTodos();
    document.querySelector('.todo-complete').click();

    expect(JSON.parse(localStorage.getItem('ziqi-todos'))[0].completedAt).toEqual(expect.any(Number));
    expect(document.getElementById('todo-empty').hidden).toBe(false);
  });

  it('shows capacity and disables adding at five active todos', () => {
    localStorage.setItem('ziqi-todos', JSON.stringify(Array.from({ length: 5 }, (_value, index) => ({
      id: String(index), title: `待办 ${index}`, completedAt: null,
    }))));
    initTodos();
    const input = document.getElementById('todo-input');

    expect(document.getElementById('todos-count').textContent).toBe('5/5');
    expect(input.disabled).toBe(true);
    expect(input.placeholder).toBe('已达 5 项上限');
  });

  it('switches to archive and restores a todo to the top of active todos', () => {
    localStorage.setItem('ziqi-todos', JSON.stringify([
      { id: 'active', title: '已有待办', completedAt: null },
      { id: 'archived', title: '已完成待办', completedAt: Date.now() },
    ]));
    initTodos();
    document.querySelector('[data-todo-tab="archive"]').click();

    expect(document.querySelector('[data-todo-panel="archive"]').hidden).toBe(false);
    document.querySelector('.archive-restore').click();

    const todos = JSON.parse(localStorage.getItem('ziqi-todos'));
    expect(todos[0]).toMatchObject({ id: 'archived', completedAt: null });
  });

  it('deletes an archived todo when its trash icon is clicked', () => {
    localStorage.setItem('ziqi-todos', JSON.stringify([
      { id: 'archived', title: '已完成待办', completedAt: Date.now() },
    ]));
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true);
    initTodos();

    document.querySelector('.archive-delete svg').dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(confirmMock).toHaveBeenCalledWith('确定要永久删除这项待办吗？');
    expect(JSON.parse(localStorage.getItem('ziqi-todos'))).toEqual([]);
  });

  it('hides the left-side entry when todos are disabled', () => {
    localStorage.setItem('ziqi-todos-enabled', 'false');
    initTodos();

    expect(document.getElementById('todos-toggle').hidden).toBe(true);
  });

  it('closes with Escape and returns focus to the left-side entry', () => {
    vi.useFakeTimers();
    initTodos();
    const toggle = document.getElementById('todos-toggle');
    const dialog = document.getElementById('todos-dialog');
    toggle.click();
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    vi.runAllTimers();

    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(toggle);
  });
});
