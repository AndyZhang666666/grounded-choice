// ui.js — 图标、标签、材料引用芯片、抽屉、弹层、提示
import { TAG_LABELS, CIRCLED } from './scenarios/index.js';
import { provider } from './providers/mock-provider.js';

// ---------- 内联 SVG 图标 ----------
const ICONS = {
  check: '<path d="M4.5 12.5l5 5 10-11"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  arrow: '<path d="M4 12h15"/><path d="M13 6l6 6-6 6"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  sliders: '<path d="M4 7h9M17.5 7H20M4 17h2.5M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16.5v.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8v.01"/>',
  doc: '<path d="M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M14 3v4h4"/><path d="M9.5 12h5M9.5 16h5"/>',
};

export function icon(name, cls = '') {
  return `<span class="icn ${cls}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg></span>`;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- 证据标签 ----------
export function tagChip(t) {
  return `<span class="tagchip ${t}">${TAG_LABELS[t] || t}</span>`;
}

// ---------- 材料引用芯片（可点击回跳来源抽屉） ----------
// 材料编号随当前场景变化，统一走 provider（当前场景数据源）
export function matNo(id) {
  const mats = provider.getMaterials();
  const i = mats.findIndex((m) => m.id === id);
  return CIRCLED[i] || '?';
}

// ctx: { t: 结论文本, tag: 证据标签, role: 角色, quotes: {mid: sentence}, refs: [...] }
export function refChips(refs, ctx) {
  if (!refs || !refs.length) return '';
  const ev = escapeHtml(JSON.stringify(ctx));
  return `<span class="ref-chips">${refs
    .map((id) => `<button class="ref-chip" data-action="open-source" data-mid="${id}" data-ev="${ev}" title="查看来源详情">材料 ${matNo(id)}</button>`)
    .join('')}</span>`;
}

// ---------- 轻提示 ----------
export function toast(msg) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = msg;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 320);
  }, 2600);
}

// ---------- 右侧抽屉 ----------
export function openDrawer(html) {
  const root = document.getElementById('drawer-root');
  root.innerHTML = `
    <div class="drawer-overlay" data-action="close-drawer"></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="抽屉">${html}</aside>`;
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => root.classList.add('open'));
}

export function closeDrawer() {
  const root = document.getElementById('drawer-root');
  root.classList.remove('open');
  document.body.classList.remove('no-scroll');
  setTimeout(() => { if (!root.classList.contains('open')) root.innerHTML = ''; }, 320);
}

export function isDrawerOpen() {
  return document.getElementById('drawer-root').classList.contains('open');
}

// ---------- 居中弹层（决策卡） ----------
export function openModal(html) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-overlay" data-action="close-card">
      <div class="modal-card">${html}</div>
    </div>`;
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => root.classList.add('open'));
}

export function closeModal() {
  const root = document.getElementById('modal-root');
  root.classList.remove('open');
  document.body.classList.remove('no-scroll');
  setTimeout(() => { if (!root.classList.contains('open')) root.innerHTML = ''; }, 300);
}

export function isModalOpen() {
  return document.getElementById('modal-root').classList.contains('open');
}
