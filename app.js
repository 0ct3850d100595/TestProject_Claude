// ============================================================
// ToDo App — app.js
// ============================================================

const STORAGE_KEY = 'todo-app-v1';

// ============================================================
// State
// ============================================================
let state = {
  tasks:          [],
  filter:         'all',     // 'all' | 'active' | 'completed'
  priorityFilter: 'all',     // 'all' | 'high' | 'medium' | 'low'
  categoryFilter: 'all',
  sortBy:         'created', // 'created' | 'dueDate' | 'priority' | 'alpha'
  searchQuery:    '',
  darkMode:       false,
  editingId:      null,
  selectedPriority: 'medium',
};

// ============================================================
// Storage
// ============================================================
function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    tasks:    state.tasks,
    darkMode: state.darkMode,
  }));
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.tasks)) state.tasks = data.tasks;
    if (typeof data.darkMode === 'boolean') state.darkMode = data.darkMode;
  } catch (e) {
    console.error('Storage load failed:', e);
  }
}

// ============================================================
// Task Operations
// ============================================================
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function addTask({ title, description, dueDate, priority, category }) {
  const task = {
    id:          generateId(),
    title:       title.trim(),
    description: description.trim(),
    dueDate:     dueDate || null,
    priority:    priority || 'medium',
    category:    category.trim(),
    completed:   false,
    createdAt:   new Date().toISOString(),
    completedAt: null,
  };
  state.tasks.unshift(task);
  saveToStorage();
  return task;
}

function updateTask(id, updates) {
  const idx = state.tasks.findIndex(t => t.id === id);
  if (idx === -1) return;
  state.tasks[idx] = { ...state.tasks[idx], ...updates };
  saveToStorage();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveToStorage();
}

function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  task.completed   = !task.completed;
  task.completedAt = task.completed ? new Date().toISOString() : null;
  saveToStorage();
}

function markAllComplete() {
  const allDone = state.tasks.every(t => t.completed);
  state.tasks.forEach(t => {
    t.completed   = !allDone;
    t.completedAt = !allDone ? new Date().toISOString() : null;
  });
  saveToStorage();
  render();
}

function clearCompleted() {
  state.tasks = state.tasks.filter(t => !t.completed);
  saveToStorage();
  render();
}

// ============================================================
// Filtering & Sorting
// ============================================================
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function getFilteredTasks() {
  let tasks = [...state.tasks];

  if (state.filter === 'active')    tasks = tasks.filter(t => !t.completed);
  if (state.filter === 'completed') tasks = tasks.filter(t =>  t.completed);

  if (state.priorityFilter !== 'all')
    tasks = tasks.filter(t => t.priority === state.priorityFilter);

  if (state.categoryFilter !== 'all')
    tasks = tasks.filter(t => t.category === state.categoryFilter);

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    tasks = tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }

  tasks.sort((a, b) => {
    // Completed tasks always sink to the bottom
    if (a.completed !== b.completed) return a.completed ? 1 : -1;

    switch (state.sortBy) {
      case 'dueDate':
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      case 'priority':
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      case 'alpha':
        return a.title.localeCompare(b.title, 'ja');
      default: // 'created'
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  return tasks;
}

function getCategories() {
  return [...new Set(state.tasks.map(t => t.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'ja'));
}

// ============================================================
// Date Formatting
// ============================================================
function formatDueDate(dateStr) {
  const date  = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date - today) / 86400000);

  const label = date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });

  let suffix = '';
  if      (diffDays < 0)  suffix = `（${Math.abs(diffDays)}日超過）`;
  else if (diffDays === 0) suffix = '（今日）';
  else if (diffDays === 1) suffix = '（明日）';

  return { text: label + suffix, overdue: diffDays < 0 };
}

// ============================================================
// DOM Helpers
// ============================================================
const el = id => document.getElementById(id);

function esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// Render
// ============================================================
function render() {
  renderStats();
  renderTaskList();
  renderCategoryFilter();
  renderCategoryDatalist();
  applyTheme();
}

function renderStats() {
  const total     = state.tasks.length;
  const completed = state.tasks.filter(t => t.completed).length;
  const active    = total - completed;

  el('stats').textContent = total === 0
    ? 'タスクなし'
    : `全 ${total} 件　未完了 ${active} 件　完了 ${completed} 件`;
}

function renderTaskList() {
  const tasks     = getFilteredTasks();
  const list      = el('taskList');
  const emptyDiv  = el('emptyState');
  const pri       = { high: '高', medium: '中', low: '低' };

  if (tasks.length === 0) {
    list.innerHTML = '';
    emptyDiv.style.display = 'block';

    let msg = 'タスクがありません';
    let sub = '「タスクを追加」ボタンから新しいタスクを作成しましょう';

    if (state.searchQuery || state.priorityFilter !== 'all' || state.categoryFilter !== 'all') {
      msg = '条件に一致するタスクがありません';
      sub = 'フィルターや検索条件を変更してみてください';
    } else if (state.filter === 'completed') {
      msg = '完了済みのタスクはありません';
      sub = '';
    } else if (state.filter === 'active') {
      msg = '未完了のタスクはありません';
      sub = '';
    }

    emptyDiv.querySelector('h3').textContent = msg;
    emptyDiv.querySelector('p').textContent  = sub;
    return;
  }

  emptyDiv.style.display = 'none';

  list.innerHTML = tasks.map(task => {
    const dateInfo  = task.dueDate ? formatDueDate(task.dueDate) : null;
    const descHtml  = task.description
      ? `<p class="task-desc">${esc(task.description)}</p>`
      : '';
    const dateMeta  = dateInfo
      ? `<span class="task-meta-item ${dateInfo.overdue ? 'overdue' : ''}">📅 ${esc(dateInfo.text)}</span>`
      : '';
    const catMeta   = task.category
      ? `<span class="task-meta-item">🏷️ ${esc(task.category)}</span>`
      : '';
    const metaHtml  = (dateMeta || catMeta)
      ? `<div class="task-meta">${dateMeta}${catMeta}</div>`
      : '';

    return `
      <div class="task-card ${task.completed ? 'completed' : ''}"
           data-id="${task.id}" data-priority="${task.priority}">

        <div class="task-checkbox ${task.completed ? 'checked' : ''}"
             data-action="toggle" data-id="${task.id}"
             title="${task.completed ? '未完了に戻す' : '完了にする'}">
          ${task.completed ? '✓' : ''}
        </div>

        <div class="task-content">
          <div class="task-header">
            <span class="task-title">${esc(task.title)}</span>
            <div class="task-right">
              <span class="badge badge-${task.priority}">${pri[task.priority]}</span>
              <div class="task-actions">
                <button class="action-btn"        data-action="edit"   data-id="${task.id}" title="編集">✏️</button>
                <button class="action-btn delete" data-action="delete" data-id="${task.id}" title="削除">🗑️</button>
              </div>
            </div>
          </div>
          ${descHtml}
          ${metaHtml}
        </div>
      </div>`;
  }).join('');
}

function renderCategoryFilter() {
  const cats    = getCategories();
  const current = state.categoryFilter;
  el('categoryFilter').innerHTML =
    `<option value="all">カテゴリ: すべて</option>` +
    cats.map(c => `<option value="${esc(c)}" ${c === current ? 'selected' : ''}>${esc(c)}</option>`).join('');
}

function renderCategoryDatalist() {
  el('categoryList').innerHTML =
    getCategories().map(c => `<option value="${esc(c)}">`).join('');
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
  el('themeToggle').textContent = state.darkMode ? '☀️' : '🌙';
}

// ============================================================
// Form
// ============================================================
function openForm(task = null) {
  state.editingId = task ? task.id : null;

  el('formTitle').textContent  = task ? 'タスクを編集' : '新しいタスク';
  el('submitBtn').textContent  = task ? '更新' : '追加';
  el('taskTitle').value        = task ? task.title       : '';
  el('taskDesc').value         = task ? task.description : '';
  el('taskDue').value          = task ? (task.dueDate || '') : '';
  el('taskCategory').value     = task ? task.category    : '';
  el('editTaskId').value       = task ? task.id          : '';

  const priority = task ? task.priority : 'medium';
  state.selectedPriority = priority;
  document.querySelectorAll('.priority-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.priority === priority)
  );

  el('formWrapper').classList.add('open');
  el('formWrapper').setAttribute('aria-hidden', 'false');
  setTimeout(() => el('taskTitle').focus(), 150);
}

function closeForm() {
  el('formWrapper').classList.remove('open');
  el('formWrapper').setAttribute('aria-hidden', 'true');
  el('taskForm').reset();
  state.editingId        = null;
  state.selectedPriority = 'medium';
  document.querySelectorAll('.priority-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.priority === 'medium')
  );
}

// ============================================================
// Event Listeners
// ============================================================
function initEvents() {

  // Add Task Button — toggles form open/close
  el('addTaskBtn').addEventListener('click', () => {
    if (el('formWrapper').classList.contains('open') && !state.editingId) {
      closeForm();
    } else {
      openForm();
    }
  });

  // Close Form
  el('closeFormBtn').addEventListener('click', closeForm);
  el('cancelBtn').addEventListener('click', closeForm);

  // Form Submit
  el('taskForm').addEventListener('submit', e => {
    e.preventDefault();
    const title = el('taskTitle').value.trim();
    if (!title) { el('taskTitle').focus(); return; }

    const data = {
      title,
      description: el('taskDesc').value,
      dueDate:     el('taskDue').value || null,
      priority:    state.selectedPriority,
      category:    el('taskCategory').value,
    };

    if (state.editingId) {
      updateTask(state.editingId, data);
    } else {
      addTask(data);
    }

    closeForm();
    render();
  });

  // Priority Buttons
  document.querySelectorAll('.priority-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedPriority = btn.dataset.priority;
      document.querySelectorAll('.priority-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.priority === state.selectedPriority)
      );
    });
  });

  // Theme Toggle
  el('themeToggle').addEventListener('click', () => {
    state.darkMode = !state.darkMode;
    saveToStorage();
    applyTheme();
  });

  // Filter Tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      state.filter = tab.dataset.filter;
      document.querySelectorAll('.filter-tab').forEach(t =>
        t.classList.toggle('active', t === tab)
      );
      render();
    });
  });

  // Search
  el('searchInput').addEventListener('input', e => {
    state.searchQuery = e.target.value;
    render();
  });

  // Priority Filter
  el('priorityFilter').addEventListener('change', e => {
    state.priorityFilter = e.target.value;
    render();
  });

  // Category Filter
  el('categoryFilter').addEventListener('change', e => {
    state.categoryFilter = e.target.value;
    render();
  });

  // Sort
  el('sortBy').addEventListener('change', e => {
    state.sortBy = e.target.value;
    render();
  });

  // Task List — Event Delegation
  el('taskList').addEventListener('click', e => {
    const action = e.target.closest('[data-action]');
    if (!action) return;

    const { id, action: type } = action.dataset;

    if (type === 'toggle') {
      toggleTask(id);
      render();
    } else if (type === 'delete') {
      const card = action.closest('.task-card');
      card.classList.add('removing');
      setTimeout(() => { deleteTask(id); render(); }, 250);
    } else if (type === 'edit') {
      const task = state.tasks.find(t => t.id === id);
      if (task) openForm(task);
    }
  });

  // Bulk Actions
  el('markAllComplete').addEventListener('click', markAllComplete);
  el('clearCompleted').addEventListener('click', () => {
    if (state.tasks.some(t => t.completed)) clearCompleted();
  });

  // Keyboard Shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeForm(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (el('formWrapper').classList.contains('open')) {
        el('taskForm').requestSubmit();
      }
    }
  });
}

// ============================================================
// Sample Tasks (first launch only)
// ============================================================
function addSampleTasks() {
  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0]; })();
  const next3    = (() => { const d = new Date(); d.setDate(d.getDate()+3); return d.toISOString().split('T')[0]; })();

  [
    { title: 'Claude Code の基本操作を学ぶ',       description: 'ドキュメントを読んで主要コマンドを把握する',   dueDate: today,    priority: 'high',   category: '学習' },
    { title: 'コードレビューを完了させる',             description: 'PR #42 のレビューが pending になっている', dueDate: tomorrow, priority: 'high',   category: '仕事' },
    { title: 'プロジェクトの README を更新する',      description: '',                                        dueDate: next3,    priority: 'medium', category: '仕事' },
    { title: '週末の買い物リストを作る',              description: '食材・日用品をまとめる',                   dueDate: '',       priority: 'low',    category: '個人' },
  ].forEach(s => addTask(s));
}

// ============================================================
// Init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  initEvents();

  if (state.tasks.length === 0) addSampleTasks();

  render();
});
