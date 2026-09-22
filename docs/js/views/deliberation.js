// views/deliberation.js — 第三步 · 方案审议台
// 结构：主推荐方案 + 两个替代方案 + 统一比较表 + 批注式反方意见
// 推荐（更适合你）与用户选择（你的选择）是两个独立状态。
// 冲突横幅：推荐方案含 warn/no 约束时显示。
// 探索性状态：insufficient==='severe' 时不显示确定性推荐语。
import { getScenario } from '../scenarios/index.js';
import { icon, tagChip, refChips } from '../ui.js';
import { REVIEWS } from '../scenarios/robot-vacuum.js';

export function renderDeliberation(state, A) {
  const sc = getScenario(state.scenarioId);
  const rec = A.recommended;
  const main = rec ? A.plans.find((p) => p.id === rec) : A.plans[0];
  const alts = A.plans.filter((p) => p.id !== (main ? main.id : null));
  const sel = state.selectedPlan;
  const cur = A.plans.find((p) => p.id === sel) || main;
  const nonRecHint = sel && sel !== rec;

  // 冲突横幅数据
  const conflictPlan = A.recommendedConflict && main ? main : null;
  const conflictBanner = conflictPlan
    ? renderConflictBanner(conflictPlan, A.feasibleAlternatives, sc)
    : '';

  // 全场景无可行方案提示（所有方案均有 warn 或 no）
  const allHaveUnmet = A.plans.length > 0 && A.plans.every((p) => p.unmetHard && p.unmetHard.length > 0);
  const noFeasibleBanner = (!conflictPlan && allHaveUnmet)
    ? `<div class="conflict-banner no-feasible-banner">
        <div class="cb-head">${icon('alert')}<b>暂无已确认满足全部硬约束的方案</b></div>
        <div class="cb-body">
          <ul>${A.plans.map((p) => `<li><b>方案 ${p.id}</b>：${p.unmetHard.map((c) => c.meetText).join('；')}</li>`).join('')}</ul>
          <p class="cb-alts">建议补充缺失的验证信息，或明确将约束上限调整至可接受范围后再做决定。</p>
        </div>
      </div>`
    : '';

  return `
  <section class="view deliberation">
    <div class="wrap">
      <div class="page-head center">
        <p class="kicker">第三步 · 审议方案</p>
        <h2>没有完美选择，只有更适合你的取舍。</h2>
      </div>

      ${A.insufficient !== 'none' ? `
      <div class="notice ${A.insufficient === 'severe' ? 'severe' : ''}">
        ${icon('alert')}
        <p>${A.insufficientText}${A.exploratory ? ' 当前处于探索性状态，方案仅供参考，建议补充材料后再形成决定。' : ''}</p>
      </div>` : ''}

      ${conflictBanner}
      ${noFeasibleBanner}

      <div class="delib-layout">
        <div class="main-plan">
          ${main ? renderMain(main, state, sc.fitWhy ? sc.fitWhy[state.keyChoice] : '', A, sc) : '<p class="page-sub">请先回答上一步的关键问题，以获取推荐方案。</p>'}
        </div>
        <aside class="alt-wrap">
          <p class="alt-cap">替代方案</p>
          <div class="alt-plans">
            ${alts.map((p) => renderAlt(p, state, sc, A)).join('')}
          </div>
        </aside>
      </div>

      ${renderCmp(sc, A.plans, rec, sel)}

      ${sc.hasReviews && state.keyChoice ? renderReviews(state.keyChoice) : ''}

      <div class="counter">
        <div class="counter-inner">
          <p class="counter-mark">反方意见</p>
          ${cur ? `<h3>${cur.counter.title}</h3>
          <ul class="counter-list">
            ${cur.counter.items.map((x) => `<li><i>—</i><p>${x}</p></li>`).join('')}
          </ul>` : ''}
          ${nonRecHint ? `<p class="alt-hint">你选择了不同于系统推荐的方案，下面会保留这项选择的主要代价。</p>` : ''}
          ${sel
            ? `<button class="btn btn-primary" data-action="confirm-plan">继续形成决定</button>`
            : `<button class="btn btn-primary" disabled>先在上方选择一个方案。</button>`}
        </div>
      </div>

      <div class="view-foot">
        <button class="back-link" data-action="back">${icon('arrow', 'flip')} 返回决策简报</button>
      </div>
    </div>
  </section>`;
}

// ---------- 冲突横幅 ----------
function renderConflictBanner(plan, feasibleAlts, sc) {
  const noItems = plan.unmetHard.filter((c) => c.meetStatus === 'no');
  const warnItems = plan.unmetHard.filter((c) => c.meetStatus === 'warn');
  const altNames = feasibleAlts.map((id) => `方案 ${id}`).join('、');
  return `
  <div class="conflict-banner">
    <div class="cb-head">
      ${icon('alert')}
      <b>偏好最匹配的方案存在硬约束风险</b>
    </div>
    <div class="cb-body">
      ${noItems.length ? `<div class="cb-group cb-no">
        <span class="cb-tag cb-tag-no">不满足</span>
        <ul>${noItems.map((c) => `<li><b>${c.text}</b>：${c.meetText}</li>`).join('')}</ul>
      </div>` : ''}
      ${warnItems.length ? `<div class="cb-group cb-warn">
        <span class="cb-tag cb-tag-warn">存在风险</span>
        <ul>${warnItems.map((c) => `<li><b>${c.text}</b>：${c.meetText}</li>`).join('')}</ul>
      </div>` : ''}
      ${feasibleAlts.length ? `<p class="cb-alts">完全满足硬约束的替代方案：<b>${altNames}</b></p>` : '<p class="cb-alts">当前所有方案均有硬约束风险，建议补充缺失信息或明确将约束上限调整至可接受范围。</p>'}
    </div>
    <p class="cb-note">你仍可主动选择带冲突的方案，但决定页与决策卡会保留未满足约束的提示。</p>
  </div>`;
}

function renderMain(p, state, why, A, sc) {
  const isSel = state.selectedPlan === p.id;
  const accT = state.accOpen === `${p.id}:tradeoff`;
  const accN = state.accOpen === `${p.id}:notfor`;
  const itinOn = state.itinOpen === p.id;
  const basisOn = state.basisOpen === p.id;
  const isRec = A.recommended === p.id;
  const hasConflict = isRec && A.recommendedConflict;
  const hasNo = hasConflict && p.unmetHard.some((c) => c.meetStatus === 'no');
  const badgeCls = hasConflict ? (hasNo ? 'badge-conflict-no' : 'badge-conflict-warn') : 'badge-rec';
  const badgeText = A.exploratory
    ? '证据不足 · 探索性方案'
    : (hasConflict ? (hasNo ? '偏好匹配 · 不满足硬约束' : '偏好匹配 · 未确认满足硬约束') : '更适合你');

  return `
  <div class="mp-badges">
    <span class="badge ${badgeCls}">${badgeText}</span>
    ${isSel ? '<span class="badge badge-sel">你的选择</span>' : ''}
  </div>
  <header class="mp-head">
    <span class="plan-letter">${p.id}</span>
    <div>
      <h3>${p.name}</h3>
      <p class="mp-sub">${p.sub} · ${p.tags.join(' · ')}</p>
    </div>
  </header>
  ${why && !A.exploratory ? `<p class="mp-why">${why}</p>` : ''}
  ${A.exploratory ? `<p class="mp-why mp-why-exploratory">${icon('alert')} 当前材料不足，以下方案为探索性展示，不代表有据的确定性推荐。</p>` : ''}
  <div class="mp-rows">
    <div class="mp-row"><span>做法</span><p>${p.approach}</p></div>
    <div class="mp-row"><span>${sc.priceLabel}</span><p>${sc.priceHtml(p, state.appliedConditions)}</p></div>
    <div class="mp-row gain"><span>主要收益</span><ul>${p.tradeoff.gain.map((x) => `<li>${x}</li>`).join('')}</ul></div>
    <div class="mp-row loss"><span>主要代价</span><ul>${p.tradeoff.cost.map((x) => `<li>${x}</li>`).join('')}</ul></div>
  </div>
  <div class="plan-status">
    <div class="status-row">
      ${p.constraintsLabel ? `<p class="seg-label">约束满足：${p.constraintsLabel}</p>` : ''}
      <span class="ev ev-${p.status.level}">${p.status.label}</span>
    </div>
    <button class="basis-btn ${basisOn ? 'on' : ''}" data-action="basis" data-plan="${p.id}">证据状态的判断依据 ${icon('chevron')}</button>
    ${basisOn ? `<ul class="ev-basis">${p.status.basis.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}
  </div>
  <div class="mp-links">
    <button class="pa-btn ${accT ? 'on' : ''}" data-action="acc" data-plan="${p.id}" data-acc="tradeoff">查看取舍</button>
    <button class="pa-btn" data-action="open-evidence" data-plan="${p.id}">查看证据</button>
    <button class="pa-btn ${accN ? 'on' : ''}" data-action="acc" data-plan="${p.id}" data-acc="notfor">什么情况下不推荐</button>
    ${sc.hasItinerary ? `<button class="pa-btn ${itinOn ? 'on' : ''}" data-action="itin" data-plan="${p.id}">${sc.itinLabel || '5 日路线'}</button>` : ''}
  </div>
  ${accT ? accPanel(p, 'tradeoff') : ''}
  ${accN ? accPanel(p, 'notfor') : ''}
  ${sc.hasItinerary && itinOn ? renderItinerary(p, state, sc) : ''}
  <div class="mp-select">
    ${isSel
      ? `<span class="mp-selected">${icon('check')} 已是你的选择</span>`
      : `<button class="btn btn-outline-accent" data-action="select-plan" data-plan="${p.id}">选择这个方案</button>`}
  </div>`;
}

function renderAlt(p, state, sc, A) {
  const isSel = state.selectedPlan === p.id;
  const accT = state.accOpen === `${p.id}:tradeoff`;
  const accN = state.accOpen === `${p.id}:notfor`;
  const itinOn = state.itinOpen === p.id;
  const feasible = p.feasible;
  return `
  <article class="alt-plan ${isSel ? 'sel' : ''}" data-action="select-plan" data-plan="${p.id}">
    <header class="alt-head">
      <span class="alt-letter">${p.id}</span>
      <h4>${p.name}</h4>
      ${isSel ? '<span class="badge badge-sel">你的选择</span>' : ''}
      ${feasible ? '<span class="badge badge-feasible">满足硬约束</span>' : ''}
    </header>
    <p class="alt-fit">适合：${p.fitFor}</p>
    <div class="alt-rows">
      <div class="alt-row"><span>收益</span><p>${p.tradeoff.gain[0]}</p></div>
      <div class="alt-row"><span>代价</span><p>${p.tradeoff.cost[0]}</p></div>
      <div class="alt-row"><span>${sc.priceLabel}</span><p>${sc.priceHtml(p, state.appliedConditions)}</p></div>
      <div class="alt-row"><span>证据</span><p><span class="ev ev-${p.status.level}">${p.status.label}</span></p></div>
    </div>
    <div class="alt-links">
      <button class="pa-btn ${accT ? 'on' : ''}" data-action="acc" data-plan="${p.id}" data-acc="tradeoff">取舍</button>
      <button class="pa-btn" data-action="open-evidence" data-plan="${p.id}">证据</button>
      <button class="pa-btn ${accN ? 'on' : ''}" data-action="acc" data-plan="${p.id}" data-acc="notfor">不推荐情况</button>
      ${sc.hasItinerary ? `<button class="pa-btn ${itinOn ? 'on' : ''}" data-action="itin" data-plan="${p.id}">路线</button>` : ''}
    </div>
    ${accT ? accPanel(p, 'tradeoff') : ''}
    ${accN ? accPanel(p, 'notfor') : ''}
    ${sc.hasItinerary && itinOn ? renderItinerary(p, state, sc) : ''}
    <button class="btn btn-ghost btn-sm alt-select" data-action="select-plan" data-plan="${p.id}">${isSel ? '✓ 已选择' : '选择此方案'}</button>
  </article>`;
}

function accPanel(p, kind) {
  if (kind === 'tradeoff') {
    return `
    <div class="plan-acc">
      <div class="acc-grid">
        <div class="acc-col gain"><h5>你会得到</h5><ul>${p.tradeoff.gain.map((x) => `<li>${x}</li>`).join('')}</ul></div>
        <div class="acc-col loss"><h5>你要付出</h5><ul>${p.tradeoff.cost.map((x) => `<li>${x}</li>`).join('')}</ul></div>
      </div>
    </div>`;
  }
  return `
  <div class="plan-acc">
    <h5 class="acc-not-title">以下情况建议重新考虑</h5>
    <ul class="acc-not">${p.notFor.map((x) => `<li>${x}</li>`).join('')}</ul>
  </div>`;
}

// ---------- 5 日路线 + 预算拆分（旅行场景） ----------
function renderItinerary(p, state, sc) {
  const applied = state.appliedConditions;
  const days = p.itinerary.map((d) => {
    for (const cond of applied) {
      const changes = sc.diffs[p.id]?.[cond]?.itineraryChanges;
      if (changes && changes[d.day]) return { ...changes[d.day], day: d.day };
    }
    return d;
  });
  const budgetApplied = applied.has('budget');
  const d = sc.diffs[p.id].budget;
  const split = budgetApplied ? d.budgetOverride : p.budgetSplit;
  const total = budgetApplied ? d.budgetOverrideTotal : p.budgetTotal;

  return `
  <div class="itin">
    <div class="itin-days">
      ${days.map((d2) => `
      <div class="itin-day">
        <span class="id-no">Day ${d2.day}</span>
        <div class="id-body">
          <p class="id-place">${d2.place}${d2.moved ? '<i class="id-badge">调整后</i>' : ''}</p>
          <p class="id-plan">${d2.plan}</p>
          <p class="id-meta">强度 ${d2.intensity} · ${d2.cost}${d2.risk && d2.risk !== '—' ? ` · 风险与待确认：${d2.risk}` : ''}</p>
        </div>
      </div>`).join('')}
    </div>
    <div class="itin-split">
      <h5>预算拆分${budgetApplied ? ' <i class="adj-note">已按「预算减少 800 元」调整</i>' : ''}</h5>
      <table>
        ${split.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}
        <tr class="total"><th>合计</th><td>${total}</td></tr>
      </table>
    </div>
    <p class="itin-note">演示用方案，不构成真实出行建议；班次、天气、价格和开放情况需在出发前核实。</p>
  </div>`;
}

// ---------- 横向对比 ----------
function renderCmp(sc, plans, rec, sel) {
  const recPlan = plans.find((p) => p.id === rec);
  const recHasConflict = recPlan && recPlan.unmetHard && recPlan.unmetHard.length > 0;
  const recHasNo = recHasConflict && recPlan.unmetHard.some((c) => c.meetStatus === 'no');
  const recBadgeText = !recPlan ? '' : recHasConflict
    ? (recHasNo ? '偏好匹配 · 不满足硬约束' : '偏好匹配 · 未确认满足硬约束')
    : '更适合你';
  const tags = (p) =>
    (p.id === rec ? `<i class="cmp-tag rec">${recBadgeText}</i>` : '') +
    (p.id === sel ? '<i class="cmp-tag mine">你的选择</i>' : '');
  const colCls = (p) => `class="${p.id === rec ? 'col-rec' : ''}${p.id === sel ? ' col-sel' : ''}`.trim() + '"';
  return `
  <div class="cmp">
    <div class="cmp-head">
      <span class="cmp-title">三个方案横向对比</span>
      <span class="cmp-note">定性比较 · 基于当前选中的材料</span>
    </div>
    <table class="cmp-table">
      <thead>
        <tr><th></th>${plans.map((p) => `<th ${colCls(p)}>${p.id} · ${p.name}${tags(p)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${sc.dims.map(([key, label]) => `
        <tr>
          <th scope="row">${label}</th>
          ${plans.map((p) => `<td ${colCls(p)}>${key === 'evidence' ? p.status.label : sc.dimVal(p, key)}</td>`).join('')}
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="cmp-mobile">
      ${plans.map((p) => `
      <div class="cm-plan">
        <h5>${p.id} · ${p.name}${tags(p)}</h5>
        ${sc.dims.map(([key, label]) => `<div class="cm-row"><span>${label}</span><p>${key === 'evidence' ? p.status.label : sc.dimVal(p, key)}</p></div>`).join('')}
      </div>`).join('')}
    </div>
  </div>`;
}

// ---------- 评论里怎么说（仅 vacuum 场景，hasReviews=true） ----------
function renderReviews(keyChoice) {
  const data = REVIEWS[keyChoice];
  if (!data) return '';
  const proItems = data.pro.map((t) => `
    <li class="rv-item rv-pro">
      <span class="rv-dot rv-dot-pro"></span>
      <p>${t}</p>
    </li>`).join('');
  const conItems = data.con.map((t) => `
    <li class="rv-item rv-con">
      <span class="rv-dot rv-dot-con"></span>
      <p>${t}</p>
    </li>`).join('');
  return `
  <div class="reviews-block">
    <div class="rv-head">
      <span class="rv-title">评论里怎么说</span>
      <span class="rv-disclaimer">演示评论，非真实电商数据</span>
    </div>
    <p class="rv-note">评论仅作补充参考，不改变证据状态判定</p>
    <ul class="rv-list">
      ${proItems}
      ${conItems}
    </ul>
    <p class="rv-cond">适用条件：${data.cond}</p>
  </div>`;
}

// ---------- 证据抽屉（数据来自分析引擎，引用可回跳） ----------
export function evidenceDrawerHtml(plan, sc) {
  const sec = (title, items, cls, role) => `
    <div class="ev-sec ${cls}">
      <h4>${title}</h4>
      <ul>
        ${items.map((it) => `
        <li>
          <p>${it.text}</p>
          <footer>
            ${tagChip(it.tag)}
            ${refChips(it.refs, { t: it.text, tag: it.tag, role, quotes: it.quotes, refs: it.refs })}
          </footer>
        </li>`).join('')}
      </ul>
    </div>`;
  return `
  <header class="drawer-head">
    <div>
      <p class="drawer-kicker">方案 ${plan.id} · 证据抽屉</p>
      <h3>${plan.name}</h3>
    </div>
    <button class="icon-btn" data-action="close-drawer" aria-label="关闭抽屉">${icon('x')}</button>
  </header>
  <div class="drawer-legend">
    ${['exact', 'synth', 'infer', 'verify'].map((t) => tagChip(t)).join('')}
  </div>
  <div class="drawer-body">
    ${sec('支持该结论的材料', plan.evidence.supporting, 'sup', 'supporting')}
    ${plan.evidence.opposing.length
      ? sec('与该结论相反的经验', plan.evidence.opposing, 'opp', 'opposing')
      : `<div class="ev-sec opp"><h4>与该结论相反的经验</h4><p class="ev-empty">当前资料中未发现充分反例。</p></div>`}
    ${sec('这些经验适合什么样的人', plan.evidence.fits, 'fits', 'verify')}
    ${sec('哪些信息可能已经过时', plan.evidence.outdated, 'old', 'outdated')}
    ${sec('哪些信息仍需' + (sc ? sc.verifyWord : '行动前') + '确认', plan.evidence.toConfirm, 'confirm', 'verify')}
  </div>
  <footer class="drawer-foot">
    <p>有据不把 AI 生成内容当作绝对事实——每条结论都标注了它的证据状态。</p>
  </footer>`;
}
