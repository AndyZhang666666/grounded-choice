// views/brief.js — 第二步 · 决策简报（数据来自分析引擎）
import { getScenario } from '../scenarios/index.js';
import { icon, matNo, refChips } from '../ui.js';

export function renderBrief(state, A) {
  const sc = getScenario(state.scenarioId);
  const KQ = sc.keyQuestion;
  const answered = Boolean(state.keyChoice);
  const hasBackground = sc.brief.background && sc.brief.background.length > 0;
  return `
  <section class="view brief">
    <div class="wrap">
      <div class="page-head">
        <p class="kicker">第二步 · 理解需求</p>
        <h2>决策简报</h2>
        <p class="page-sub">基于当前选中的 ${A.mats.length} 份材料交叉整理</p>
      </div>

      ${A.insufficient !== 'none' ? `
      <div class="notice ${A.insufficient === 'severe' ? 'severe' : ''}">
        ${icon('alert')}
        <p>${A.insufficientText}</p>
      </div>` : ''}

      <div class="brief-grid">
        <div class="brief-col hard">
          <h3 class="bc-title">${icon('lock')}硬约束<span>不可妥协</span></h3>
          <ul class="brief-list">
            ${sc.brief.hard.map((x) => `<li><b>${x.text}</b><span>${x.note}</span></li>`).join('')}
          </ul>
        </div>
        <div class="brief-col soft">
          <h3 class="bc-title">${icon('sliders')}软偏好<span>尽量满足</span></h3>
          <ul class="brief-list">
            ${sc.brief.soft.map((x) => `<li><b>${x.text}</b><span>${x.note}</span></li>`).join('')}
          </ul>
        </div>
        ${hasBackground ? `
        <div class="brief-col background">
          <h3 class="bc-title">${icon('info')}使用背景<span>影响匹配，非门槛</span></h3>
          <p class="bc-note">以下为背景信息，会影响方案匹配程度，但不是不可妥协的条件。</p>
          <ul class="brief-list brief-list-bg">
            ${sc.brief.background.map((x) => `<li><b>${x.text}</b><span>${x.note}</span></li>`).join('')}
          </ul>
        </div>` : ''}
        <div class="brief-col missing">
          <h3 class="bc-title">${icon('alert')}待确认信息<span>会改变方案走向</span></h3>
          <ul class="brief-list missing-list">
            ${sc.brief.missing.map((x) => `<li><b>${x.text}</b><span>${x.note}</span></li>`).join('')}
          </ul>
        </div>
      </div>

      <div class="cross-row">
        <div class="cross consensus">
          <h4>经验之间的共识</h4>
          ${A.consensus.length ? `<ul>
            ${A.consensus.map((x) => `
            <li>
              <p>${x.text}</p>
              <span class="ev-src-line">${x.src} ·
                ${refChips(x.refs, { t: x.text, tag: 'synth', role: 'consensus', quotes: x.quotes, refs: x.refs })}
              </span>
            </li>`).join('')}
          </ul>` : `<p class="cross-empty">当前选中材料不足以形成共识。</p>`}
        </div>
        <div class="cross disagree">
          <h4>经验之间的分歧</h4>
          ${A.disagreements.length ? `<ul>
            ${A.disagreements.map((x) => `
            <li>
              <p>${x.text}</p>
              <span class="ev-src-line">
                ${x.sides[0].map(matNo).join('')} vs ${x.sides[1].map(matNo).join('')} ·
                ${refChips(x.sides.flat(), { t: x.text, tag: 'exact', role: 'disagreement', quotes: x.quotes, refs: x.sides.flat() })}
              </span>
            </li>`).join('')}
          </ul>` : `<p class="cross-empty">当前选中材料之间未发现明显分歧。</p>`}
        </div>
      </div>

      <div class="key-q">
        <p class="kq-kicker">先回答影响最大的一个问题</p>
        <h3 class="kq-title">${KQ.title}</h3>
        <div class="kq-options">
          ${KQ.options.map((o) => `
          <button class="kq-row ${o.id === state.keyChoice ? 'on' : ''}" data-action="key-choice" data-val="${o.id}">
            <i class="kq-radio" aria-hidden="true"></i>
            <span class="kq-t"><b>${o.label}</b><i>${o.note}</i></span>
          </button>`).join('')}
        </div>
        <p class="kq-note ${answered ? '' : 'warn'}" id="kq-hint">${answered ? '你的选择决定下一步的推荐方案，之后可以回来修改。' : KQ.note}</p>
        <button class="btn btn-primary btn-lg" data-action="goto-deliberation" ${answered ? '' : 'disabled'}>进入方案审议</button>
      </div>

      <div class="view-foot">
        <button class="back-link" data-action="back">${icon('arrow', 'flip')} 返回上一步</button>
      </div>
    </div>
  </section>`;
}
