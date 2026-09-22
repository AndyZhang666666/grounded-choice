// views/decision.js — 第四步 · 形成决定（含条件变化应用）
import { getScenario } from '../scenarios/index.js';
import { icon, tagChip, refChips } from '../ui.js';

// ---------- 比价纯函数（可测试） ----------
// inputs: { jd: string, tb: string, pdd: string }
// 返回 { min: number|null, platform: string|null, entries: [{platform, value}] }
export function comparePrices(inputs) {
  const PLATFORMS = { jd: '京东', tb: '淘宝', pdd: '拼多多' };
  const entries = [];
  for (const [key, label] of Object.entries(PLATFORMS)) {
    const raw = inputs[key];
    const val = parseFloat(raw);
    if (raw !== '' && raw !== undefined && isFinite(val) && val > 0) {
      entries.push({ platform: label, value: val });
    }
  }
  if (entries.length === 0) return { min: null, platform: null, entries: [] };
  const minEntry = entries.reduce((a, b) => (b.value < a.value ? b : a));
  return { min: minEntry.value, platform: minEntry.platform, entries };
}

export function renderDecision(state, A) {
  const sc = getScenario(state.scenarioId);
  const plan = A.plans.find((p) => p.id === state.selectedPlan);
  const d = plan.decision;
  const done = state.checklist.size;
  const diff = state.condition ? sc.diffs[plan.id]?.[state.condition] || null : null;
  const appliedList = [...state.appliedConditions].map((c) => sc.diffs[plan.id]?.[c]).filter(Boolean);

  // 应用调整后：风险与待确认同步更新
  const risks = [...d.risks, ...appliedList.map((x) => x.risk.text)];
  const toConfirm = [...d.toConfirm, ...appliedList.map((x) => x.toConfirmAdd).filter(Boolean)];

  // 未满足的硬约束
  const unmetHard = plan.unmetHard || [];

  return `
  <section class="view decision">
    <div class="wrap">
      <div class="page-head">
        <p class="kicker">第四步 · 形成决定</p>
        <h2>我的决定</h2>
      </div>

      ${A.exploratory ? `
      <div class="notice severe">
        ${icon('alert')}
        <p>当前材料不足（探索性状态）——以下内容仅供参考，建议补充更多材料后再形成最终决定。</p>
      </div>` : ''}

      ${unmetHard.length ? `
      <div class="unmet-hard-notice">
        ${icon('alert')}
        <div>
          <b>该方案存在未满足的硬约束（由你主动选择）</b>
          <ul class="unmet-list">
            ${unmetHard.map((c) => `<li><span class="unmet-tag unmet-${c.meetStatus}">${c.meetStatus === 'no' ? '不满足' : '存在风险'}</span><b>${c.text}</b>：${c.meetText}</li>`).join('')}
          </ul>
        </div>
      </div>` : ''}

      <div class="md-sections">
        <header class="md-head">
          <span class="plan-letter big">${plan.id}</span>
          <div class="md-title">
            <h3>方案 ${plan.id} · ${plan.name}</h3>
            <p>${plan.sub} · ${sc.priceLabel} ${sc.priceHtml(plan, state.appliedConditions)} · ${plan.status.label}</p>
          </div>
        </header>
        <div class="md-grid">
          <div class="md-block why">
            <h4>为什么选它</h4>
            <ol class="md-reasons">
              ${d.reasons.map((x, i) => `<li><i>${i + 1}</i><p>${x}</p></li>`).join('')}
            </ol>
          </div>
          <div class="md-block giveup">
            <h4>主动放弃了什么</h4>
            <ul>${d.gaveUp.map((x) => `<li>${x}</li>`).join('')}</ul>
          </div>
          <div class="md-block toconfirm">
            <h4>${sc.checklistTitle}</h4>
            <ul>${toConfirm.map((x) => `<li>${x}</li>`).join('')}</ul>
          </div>
        </div>

        ${appliedList.length ? `
        <div class="md-block md-applied">
          <h4>已应用的方案调整 <span class="cl-progress">${appliedList.length} 项</span></h4>
          <ul>
            ${appliedList.map((x) => `<li><b>${x.title}</b><span>${x.after.text}</span></li>`).join('')}
          </ul>
        </div>` : ''}

        <div class="md-block md-checklist">
          <h4>${sc.actionTitle || '行动清单'} <span class="cl-progress">${done} / ${sc.checklist.length} 已确认</span></h4>
          <ul class="cl-list">
            ${sc.checklist.map((c) => `
            <li>
              <label class="cl-item ${state.checklist.has(c.id) ? 'done' : ''}">
                <input type="checkbox" data-action="check" data-id="${c.id}" ${state.checklist.has(c.id) ? 'checked' : ''}>
                <span class="cl-box">${icon('check')}</span>
                <span class="cl-text"><b>${c.text}</b><i>${c.note}</i></span>
              </label>
            </li>`).join('')}
          </ul>
          ${done === sc.checklist.length ? `<p class="cl-done-note">${icon('check')} ${sc.readyNote}</p>` : ''}
        </div>

        <div class="md-risks">
          <h4>关键风险</h4>
          <ul>${risks.map((x) => `<li>${x}</li>`).join('')}</ul>
        </div>
      </div>

      ${sc.hasReviews ? renderPriceCompare(state.priceInputs || { jd: '', tb: '', pdd: '' }) : ''}

      ${sc.conditions.length ? `
      <div class="conditions" id="conditions">
        <div class="cond-head">
          <h3>如果情况发生变化</h3>
          <p>选一个假设条件，先<b>预览</b>方案的局部调整，再决定是否纳入最终方案。</p>
        </div>
        <div class="cond-btns">
          ${sc.conditions.map((c) => {
            const applied = state.appliedConditions.has(c.id);
            return `<button class="cond-btn ${state.condition === c.id ? 'on' : ''} ${applied ? 'applied' : ''}" data-action="condition" data-cond="${c.id}">${c.label}${applied ? ' ✓已应用' : ''}</button>`;
          }).join('')}
        </div>
        ${diff ? renderDiff(diff, plan, state, sc) : `
        <div class="empty-state">
          ${icon('doc')}
          <p>还没有选择变化条件。<br>点击上方任意一个条件，查看方案的前后对比。</p>
        </div>`}
      </div>` : ''}

      <div class="final-cta">
        <button class="btn btn-primary btn-lg" data-action="open-card">生成决策卡</button>
        <button class="back-link" data-action="back">${icon('arrow', 'flip')} 返回方案审议</button>
      </div>
      <p class="health-foot">${sc.footNote}</p>
    </div>
  </section>`;
}

function renderDiff(diff, plan, state, sc) {
  const applied = state.appliedConditions.has(state.condition);
  const activeRefs = (diff.reason.refs || []).filter((r) => state.selected.has(r));
  return `
  <div class="diff">
    <div class="diff-title">
      <b>条件变化 · ${diff.title}</b>
      <span>基于当前选择：方案 ${plan.id} · ${plan.name}</span>
    </div>
    <div class="diff-banner">${applied ? '此调整已应用至你的最终方案。' : '当前仅为变化预览，尚未修改你的最终方案。'}</div>
    <div class="diff-main">
      <div class="diff-box before">
        <h5>${diff.before.label}</h5>
        <p>${diff.before.text}</p>
      </div>
      <div class="diff-arrow">
        <span>调整为</span>
        ${icon('arrow')}
      </div>
      <div class="diff-box after">
        <h5>${diff.after.label}</h5>
        <p><mark>${diff.after.text}</mark></p>
      </div>
    </div>
    <div class="diff-detail">
      <div class="dd dd-why">
        <h6>调整原因</h6>
        <p>${diff.reason.text}</p>
        <footer>
          ${tagChip(diff.reason.tag)}
          ${refChips(activeRefs, { t: diff.reason.text, tag: diff.reason.tag, role: 'diff', quotes: diff.reason.quotes, refs: activeRefs })}
        </footer>
      </div>
      <div class="dd dd-keep">
        <h6>保持不变</h6>
        <ul>${diff.keep.map((x) => `<li>${icon('check')}<span>${x}</span></li>`).join('')}</ul>
      </div>
      <div class="dd dd-risk">
        <h6>新增风险</h6>
        <p>${diff.risk.text}</p>
        <footer>
          ${tagChip(diff.risk.tag)}
          ${refChips((diff.risk.refs || []).filter((r) => state.selected.has(r)), { t: diff.risk.text, tag: diff.risk.tag, role: 'opposing', quotes: diff.risk.quotes, refs: (diff.risk.refs || []).filter((r) => state.selected.has(r)) })}
        </footer>
      </div>
    </div>
    ${diff.hint ? `<p class="diff-hint">${icon('alert')} ${diff.hint}</p>` : ''}
    <div class="diff-actions">
      ${applied
        ? `<button class="btn btn-ghost btn-sm" data-action="withdraw-condition" data-cond="${state.condition}">撤销调整</button>`
        : `<button class="btn btn-primary btn-sm" data-action="apply-condition" data-cond="${state.condition}">将调整纳入方案</button>
           <button class="btn btn-secondary btn-sm" data-action="keep-condition">保留原方案</button>`}
    </div>
    <p class="diff-note">这是对原方案的局部修改，不是重新生成的新方案——只有受牵连的部分被调整。</p>
  </div>`;
}

// ---------- 下单前比价（仅 vacuum 场景，hasReviews=true） ----------
function renderPriceCompare(inputs) {
  const safeInputs = inputs || { jd: '', tb: '', pdd: '' };
  const result = comparePrices(safeInputs);
  const rows = [
    { key: 'jd', label: '京东' },
    { key: 'tb', label: '淘宝' },
    { key: 'pdd', label: '拼多多' },
  ];
  const resultHtml = result.min !== null
    ? `<p class="pc-result">当前录入最低价：<b>${result.min} 元</b>（${result.platform}）</p>`
    : `<p class="pc-result pc-empty">未录入价格，暂无比较结果</p>`;
  return `
  <div class="price-compare">
    <h4 class="pc-title">下单前比价</h4>
    <table class="pc-table">
      <tbody>
        ${rows.map(({ key, label }) => `
        <tr>
          <th>${label}</th>
          <td><input
            class="pc-input"
            type="number"
            min="1"
            step="1"
            placeholder="到手价，元"
            data-action="price-input"
            data-platform="${key}"
            value="${safeInputs[key] || ''}"
          ></td>
        </tr>`).join('')}
      </tbody>
    </table>
    ${resultHtml}
    <p class="pc-disclaimer">请核对同一型号、售后政策、退换条款与耗材价格；X1/X2/X3 为演示虚构型号，无实际商品链接。</p>
  </div>`;
}

// ---------- 决策卡（弹层内） ----------
export function decisionCardHtml(state, A) {
  const sc = getScenario(state.scenarioId);
  const plan = A.plans.find((p) => p.id === state.selectedPlan);
  const d = plan.decision;
  const applied = [...state.appliedConditions].map((c) => sc.diffs[plan.id]?.[c]).filter(Boolean);
  const now = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日`;
  const ts = `${dateStr} ${p2(now.getHours())}:${p2(now.getMinutes())}`;
  const unmetHard = plan.unmetHard || [];

  return `
  <div class="share-card" id="share-card" data-title="${sc.cardTitle}" data-date="${dateStr}">
    <header class="sc-head">
      <span class="brand-seal">有据</span>
      <div>
        <h3>${sc.cardTitle}</h3>
        <p>生活决策审议台 · Grounded Choice</p>
      </div>
    </header>
    <div class="sc-body">
      <div class="sc-row">
        <h5>我的目标</h5>
        <p>${sc.goalText}</p>
      </div>
      <div class="sc-row sc-choice">
        <h5>最终选择</h5>
        <p><b>方案 ${plan.id} · ${plan.name}</b><span>${plan.sub} · ${sc.priceLabel} ${sc.pricePlain(plan, state.appliedConditions)} · ${plan.status.label}</span></p>
      </div>
      ${unmetHard.length ? `
      <div class="sc-row sc-unmet">
        <h5>未满足的硬约束（已由你主动选择）</h5>
        <ul class="sc-unmet-list">
          ${unmetHard.map((c) => `<li><span class="unmet-tag unmet-${c.meetStatus}">${c.meetStatus === 'no' ? '不满足' : '存在风险'}</span>${c.text}：${c.meetText}</li>`).join('')}
        </ul>
      </div>` : ''}
      ${A.exploratory ? `
      <div class="sc-row sc-exploratory">
        <h5>证据状态注记</h5>
        <p>⚠ 证据不足（探索性状态）——材料数量不足，以上结论仅供参考，建议补充材料后重新评估。</p>
      </div>` : ''}
      <div class="sc-row">
        <h5>为什么选择</h5>
        <ol>${d.reasons.map((x) => `<li>${x}</li>`).join('')}</ol>
      </div>
      <div class="sc-row">
        <h5>做出的取舍</h5>
        <ul>${d.gaveUp.map((x) => `<li>${x}</li>`).join('')}</ul>
      </div>
      ${applied.length ? `
      <div class="sc-row sc-applied-row">
        <h5>已应用的变化</h5>
        <ul class="sc-applied">${applied.map((x) => `<li>${x.title}：${x.after.text}</li>`).join('')}</ul>
      </div>` : ''}
      <div class="sc-row">
        <h5>关键风险</h5>
        <ul class="sc-risk">${[...d.risks, ...applied.map((x) => x.risk.text)].map((x) => `<li>${x}</li>`).join('')}</ul>
      </div>
      <div class="sc-row">
        <h5>待确认事项</h5>
        <ul class="sc-confirm">${[...d.toConfirm, ...applied.map((x) => x.toConfirmAdd).filter(Boolean)].map((x) => `<li>${x}</li>`).join('')}</ul>
      </div>
    </div>
    <footer class="sc-foot">
      <span>生成于 ${ts}</span>
      <span>由有据辅助整理，重要信息请在行动前核实</span>
    </footer>
  </div>`;
}
