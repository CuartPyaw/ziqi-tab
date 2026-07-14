const TODOS_KEY = 'ziqi-todos';
const ENABLED_KEY = 'ziqi-todos-enabled';
const ACTIVE_LIMIT = 5;

function loadTodos() {
  try {
    const todos = JSON.parse(localStorage.getItem(TODOS_KEY) || '[]');
    return Array.isArray(todos) ? todos.filter(todo => typeof todo?.title === 'string' && todo.title.trim()) : [];
  } catch (_) {
    return [];
  }
}

function saveTodos(todos) {
  localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
}

export function getTodosEnabled() {
  return localStorage.getItem(ENABLED_KEY) !== 'false';
}

export function setTodosEnabled(enabled) {
  localStorage.setItem(ENABLED_KEY, String(enabled));
}

function createTodo(title) {
  return { id: crypto.randomUUID(), title, completedAt: null };
}

function activeTodos(todos) {
  return todos.filter(todo => !todo.completedAt);
}

function archiveDate(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return '今天';
  if (date.toDateString() === yesterday.toDateString()) return '昨天';
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

function renderActiveTodos(list, empty, active) {
  list.innerHTML = '';
  empty.hidden = active.length !== 0;

  active.forEach(todo => {
    const item = document.createElement('li');
    item.className = 'todo-item';
    item.draggable = true;
    item.dataset.id = todo.id;

    const complete = document.createElement('input');
    complete.type = 'checkbox';
    complete.className = 'todo-complete';
    complete.setAttribute('aria-label', `完成：${todo.title}`);

    const title = document.createElement('button');
    title.type = 'button';
    title.className = 'todo-title';
    title.textContent = todo.title;
    title.setAttribute('aria-label', `编辑：${todo.title}`);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'todo-delete';
    remove.textContent = '×';
    remove.title = '删除待办';
    remove.setAttribute('aria-label', `删除：${todo.title}`);
    item.append(complete, title, remove);
    list.appendChild(item);
  });
}

function renderArchive(list, empty, todos, activeCount) {
  const archived = todos.filter(todo => todo.completedAt).sort((a, b) => b.completedAt - a.completedAt);
  list.innerHTML = '';
  empty.hidden = archived.length !== 0;

  archived.forEach(todo => {
    const item = document.createElement('li');
    item.className = 'archive-item';
    item.dataset.id = todo.id;
    const title = document.createElement('span');
    title.className = 'archive-title';
    title.textContent = todo.title;
    const date = document.createElement('time');
    date.className = 'archive-date';
    date.dateTime = new Date(todo.completedAt).toISOString();
    date.textContent = archiveDate(todo.completedAt);
    const restore = document.createElement('button');
    restore.type = 'button';
    restore.className = 'archive-action archive-restore';
    restore.disabled = activeCount >= ACTIVE_LIMIT;
    restore.title = restore.disabled ? '任务已达上限' : '恢复';
    restore.setAttribute('aria-label', restore.title);
    restore.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 1 1 0 12h-1"/></svg>';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'archive-action archive-delete';
    remove.title = '永久删除';
    remove.setAttribute('aria-label', '永久删除');
    remove.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>';
    item.append(title, date, restore, remove);
    list.appendChild(item);
  });
}

function updateTodo(id, update) {
  const todos = loadTodos();
  const index = todos.findIndex(todo => todo.id === id);
  if (index === -1) return;
  todos[index] = { ...todos[index], ...update };
  saveTodos(todos);
}

function removeTodo(id) {
  saveTodos(loadTodos().filter(todo => todo.id !== id));
}

function editTodo(item, render) {
  const title = item.querySelector('.todo-title');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'todo-title-input';
  input.value = title.textContent;
  title.replaceWith(input);
  input.focus();
  input.select();

  let cancelled = false;
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      cancelled = true;
      input.blur();
    }
    if (event.key === 'Enter') input.blur();
  });
  input.addEventListener('blur', () => {
    const value = input.value.trim();
    if (!cancelled && value) updateTodo(item.dataset.id, { title: value });
    render();
  }, { once: true });
}

export function initTodos() {
  const toggle = document.getElementById('todos-toggle');
  const dialog = document.getElementById('todos-dialog');
  const list = document.getElementById('todo-list');
  const empty = document.getElementById('todo-empty');
  const input = document.getElementById('todo-input');
  const count = document.getElementById('todos-count');
  const archiveList = document.getElementById('archive-list');
  const archiveEmpty = document.getElementById('archive-empty');
  if (!toggle || !dialog || !list || !empty || !input || !archiveList || !archiveEmpty) return;

  const render = () => {
    toggle.hidden = !getTodosEnabled();
    const todos = loadTodos();
    const active = activeTodos(todos);
    const atLimit = active.length >= ACTIVE_LIMIT;
    renderActiveTodos(list, empty, active);
    renderArchive(archiveList, archiveEmpty, todos, active.length);
    input.disabled = atLimit;
    input.placeholder = atLimit ? `已达 ${ACTIVE_LIMIT} 项上限` : '添加待办…';
    if (count) count.textContent = `${active.length}/${ACTIVE_LIMIT}`;
  };
  const closeDialog = () => {
    if (!dialog.open) return;
    dialog.classList.remove('todos-dialog--visible');
    window.setTimeout(() => dialog.close(), 160);
    toggle.focus();
  };
  const selectTab = (name) => {
    dialog.querySelectorAll('[data-todo-tab]').forEach(tab => {
      const active = tab.dataset.todoTab === name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      dialog.querySelector(`[data-todo-panel="${tab.dataset.todoTab}"]`).hidden = !active;
    });
  };

  render();
  toggle.addEventListener('click', () => {
    dialog.showModal();
    const reveal = () => {
      dialog.classList.add('todos-dialog--visible', 'animate__animated', 'animate__slideInLeft');
      dialog.addEventListener('animationend', () => {
        dialog.classList.remove('animate__animated', 'animate__slideInLeft');
      }, { once: true });
    };
    if (window.requestAnimationFrame) window.requestAnimationFrame(reveal);
    else window.setTimeout(reveal, 0);
    dialog.querySelector('.todos-dialog-tab.is-active').focus();
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) closeDialog();
  });
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeDialog();
  });
  dialog.querySelector('.todos-dialog-tabs').addEventListener('click', event => {
    const tab = event.target.closest('[data-todo-tab]');
    if (tab) selectTab(tab.dataset.todoTab);
  });

  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    const title = input.value.trim();
    if (!title) return;
    if (activeTodos(loadTodos()).length >= ACTIVE_LIMIT) return;
    saveTodos([...loadTodos(), createTodo(title)]);
    input.value = '';
    render();
  });

  list.addEventListener('change', event => {
    if (!event.target.matches('.todo-complete')) return;
    updateTodo(event.target.closest('.todo-item').dataset.id, { completedAt: Date.now() });
    render();
  });
  list.addEventListener('click', event => {
    const item = event.target.closest('.todo-item');
    if (!item) return;
    if (event.target.matches('.todo-delete')) {
      removeTodo(item.dataset.id);
      render();
    } else if (event.target.matches('.todo-title')) {
      editTodo(item, render);
    }
  });

  let dragId = null;
  list.addEventListener('dragstart', event => {
    const item = event.target.closest('.todo-item');
    if (!item) return;
    dragId = item.dataset.id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', '');
    item.classList.add('todo-item--dragging');
  });
  list.addEventListener('dragover', event => {
    if (dragId) event.preventDefault();
  });
  list.addEventListener('drop', event => {
    event.preventDefault();
    const target = event.target.closest('.todo-item');
    if (!dragId || !target || dragId === target.dataset.id) return;
    const todos = loadTodos();
    const sourceIndex = todos.findIndex(todo => todo.id === dragId);
    const targetIndex = todos.findIndex(todo => todo.id === target.dataset.id);
    const [moved] = todos.splice(sourceIndex, 1);
    todos.splice(targetIndex, 0, moved);
    saveTodos(todos);
    render();
  });
  list.addEventListener('dragend', () => {
    dragId = null;
    list.querySelector('.todo-item--dragging')?.classList.remove('todo-item--dragging');
  });

  archiveList.addEventListener('click', event => {
    const item = event.target.closest('.archive-item');
    if (!item) return;
    const todos = loadTodos();
    const todo = todos.find(entry => entry.id === item.dataset.id);
    if (!todo) return;
    if (event.target.closest('.archive-restore')) {
      saveTodos([{ ...todo, completedAt: null }, ...todos.filter(entry => entry.id !== todo.id)]);
      render();
    }
    if (event.target.closest('.archive-delete') && confirm('确定要永久删除这项待办吗？')) {
      removeTodo(todo.id);
      render();
    }
  });
}
