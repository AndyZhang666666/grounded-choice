// components/source-drawer.js — 来源详情抽屉
// 点击材料编号（材料①③…）后打开，展示该材料与当前结论的关系。
// 只展示支撑结论所需的有限片段，不搬运全文；演示用模拟资料不提供外链。

import { provider } from '../providers/mock-provider.js';
import { getState } from '../state.js';
import { icon, tagChip, escapeHtml, matNo } from '../ui.js';
import { TAG_LABELS } from '../scenarios/index.js';

const ROLE_TEXT = {
  supporting: '支持当前结论',
  opposing: '构成当前结论的反方经验',
  outdated: '提示该信息可能已过时',
  verify: '提示该信息需实时核实',
  consensus: '参与当前共识的归纳',
  disagreement: '参与当前分歧的一方',
  diff: '为调整原因提供依据',
};

export function buildSourceDrawerHtml(mid, ctx) {
  const m = provider.getMaterialDetail(mid);
  if (!m) return '<div class="drawer-body"><p>未找到该材料。</p></div>';

  const quote = ctx.quotes && ctx.quotes[mid];
  const roleText = ROLE_TEXT[ctx.role] || '与当前结论相关';

  // 摘要中对相关句子做行内高亮（不整卡高亮）
  let summaryHtml;
  if (quote && m.summary.includes(quote)) {
    const [before, after] = m.summary.split(quote);
    summaryHtml = `${escapeHtml(before)}<mark>${escapeHtml(quote)}</mark>${escapeHtml(after)}`;
  } else {
    summaryHtml = escapeHtml(m.summary);
  }

  // 切换芯片只列出「当前仍被选中」的引用材料（取消的材料不再出现）
  const selected = getState().selected;
  const activeRefs = (ctx.refs || []).filter(
    (id) => selected.has(id) && provider.getMaterialDetail(id)
  );

  return `
  <header class="drawer-head">
    <div>
      <p class="drawer-kicker">来源详情 · 材料 ${matNo(mid)}</p>
      <h3>${escapeHtml(m.title)}</h3>
    </div>
    <button class="icon-btn" data-action="close-drawer" aria-label="关闭抽屉">${icon('x')}</button>
  </header>

  <div class="drawer-legend">
    ${tagChip(ctx.tag || 'exact')}
    ${provider.getCommercialFlag(mid) ? '<span class="tagchip commercial">可能含商业合作</span>' : ''}
    <span class="tagchip demo">演示用模拟资料</span>
  </div>

  <div class="drawer-body sd">
    <div class="sd-meta">
      <span>资料类型</span><b>${escapeHtml(m.tag)}</b>
      <span>发布时间</span><b>${escapeHtml(provider.getPublishTime(mid))}</b>
      <span>来源</span><b>${escapeHtml(provider.getSourceInfo(mid).byline)}</b>
      <span>使用者场景</span><b>${escapeHtml(m.traits.join(' · '))}</b>
    </div>

    ${activeRefs.length > 1 ? `
    <div class="sd-switch">
      <span>本结论引用了 ${activeRefs.length} 份材料，点击切换：</span>
      <div class="sd-switch-chips">
        ${activeRefs
          .map((id) => `<button class="ref-chip ${id === mid ? 'on' : ''}" data-action="open-source" data-mid="${id}" data-ev="${escapeHtml(JSON.stringify(ctx))}">材料 ${matNo(id)}</button>`)
          .join('')}
      </div>
    </div>` : ''}

    <h4 class="sd-h">原始摘要</h4>
    <p class="sd-summary">${summaryHtml}</p>
    ${quote && !m.summary.includes(quote) ? `<p class="sd-quote">${escapeHtml(quote)}</p>` : ''}

    <div class="sd-claim">
      <span>相关结论</span>
      <p>${escapeHtml(ctx.t || '')}</p>
    </div>
    <div class="sd-role">
      该材料在当前结论中的作用：<b>${roleText}</b>
      <span class="sd-role-tag">${tagChip(ctx.tag || 'exact')}</span>
    </div>

    <p class="sd-note">演示用模拟资料，不代表任何真实用户、品牌或平台；${ctx.tag === 'verify' ? '该信息需实时核实' : ctx.tag === 'infer' ? '该条目为方案推演，非材料原文' : '原文片段仅展示支撑结论所需部分'}。</p>
  </div>`;
}
