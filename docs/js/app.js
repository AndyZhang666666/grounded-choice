// app.js — 入口：状态渲染、事件分发、流程编排
import { getState, setState, resetState, enterScenario, onRender } from './state.js';
import { getScenario } from './scenarios/index.js';
import { provider, setScenario as setProviderScenario } from './providers/mock-provider.js';
import { buildAnalysis } from './analysis-engine.js';
import { toast, icon, openDrawer, closeDrawer, openModal, closeModal, isDrawerOpen, isModalOpen } from './ui.js';
import { buildSourceDrawerHtml } from './components/source-drawer.js';
import { downloadDecisionCard } from './card-export.js';
import { renderHome } from './views/home.js';
import { renderImport } from './views/import.js';
import { renderAnalyzing, runAnalyzeSequence } from './views/analyze.js';
import { renderBrief } from './views/brief.js';
import { renderDeliberation, evidenceDrawerHtml } from './views/deliberation.js';
import { renderDecision, decisionCardHtml } from './views/decision.js';

const VIEWS = {
  home: renderHome,
  import: renderImport,
  analyzing: renderAnalyzing,
  brief: renderBrief,
  deliberation: renderDeliberation,
  decision: renderDecision,
};

const STEP_LABELS = { import: '导入经验', brief: '理解需求', deliberation: '审议方案', decision: '形成决定' };
const VIEW_STEP = { home: -1, import: 0, analyzing: 1, brief: 1, deliberation: 2, decision: 3 };
const BACK = { home: null, import: 'home', analyzing: 'import', brief: 'import', deliberation: 'brief', decision: 'deliberation' };

// ---------- 顶部导航 ----------
function renderNav() {
  const cur = VIEW_STEP[getState().view];
  const steps = Object.keys(STEP_LABELS).map((k, i) => ({ k, i, st: i < cur ? 'done' : i === cur ? 'current' : 'todo' }));
  document.getElementById('steps').innerHTML = steps.map((s) => `
    <button class="step s-${s.st}" data-action="nav-step" data-step="${s.k}" ${s.st === 'todo' ? 'disabled' : ''} title="${STEP_LABELS[s.k]}">
      <span class="step-no">${String(s.i + 1).padStart(2, '0')}</span>
      <span class="step-label">${STEP_LABELS[s.k]}</span>
      ${s.st === 'done' ? icon('check') : ''}
    </button>`).join('');
}

// ---------- 主渲染 ----------
onRender((info) => renderApp({ animate: info.viewChanged, scroll: info.viewChanged }));

function renderApp(opts = {}) {
  renderNav();
  const state = getState();
  const A = buildAnalysis(state);
  const app = document.getElementById('app');
  app.innerHTML = VIEWS[state.view](state, A);
  const v = app.querySelector('.view');
  if (v && !opts.animate) v.style.animation = 'none';
  if (opts.scroll) window.scrollTo(0, 0);
  if (state.view === 'analyzing') {
    runAnalyzeSequence(() => {
      if (getState().view === 'analyzing') setState({ view: 'brief' });
    });
  }
}

// 进入场景（状态 + 数据源同步切换）
function enter(id) {
  enterScenario(id);
  setProviderScenario(id);
  setState({ view: 'import' });
}

// ---------- 动作分发 ----------
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  const s = getState();

  switch (a) {
    case 'brand':
      e.preventDefault();
      closeDrawer(); closeModal();
      setState({ view: 'home' });
      break;

    // 首页"选择决策场景"按钮 → 滚动到场景卡并闪烁高亮
    case 'scroll-to-scenes': {
      e.preventDefault();
      const cards = document.getElementById('scene-cards');
      if (cards) {
        cards.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // 一次性短暂高亮两张卡片
        const scCards = cards.querySelectorAll('.scene-card');
        scCards.forEach((card) => {
          card.classList.add('sc-flash');
          setTimeout(() => card.classList.remove('sc-flash'), 1200);
        });
      }
      break;
    }

    case 'start-sample':
      enter('travel');
      break;

    // 从首页场景卡进入某个场景
    case 'enter-scenario':
      enter(el.dataset.sc || 'travel');
      break;

    // 开发保留入口：自由输入（Demo 主路径不暴露）
    case 'start-custom':
      setState({ view: 'import', importMode: 'custom' });
      break;

    case 'toggle-material': {
      if (s.selected.has(el.dataset.id)) s.selected.delete(el.dataset.id);
      else s.selected.add(el.dataset.id);
      setState({});
      break;
    }

    case 'select-all': {
      const sc = getScenario(s.scenarioId);
      setState({ selected: new Set(sc.mats.map((m) => m.id)) });
      break;
    }

    case 'select-none':
      setState({ selected: new Set() });
      break;

    case 'analyze':
      setState({ view: 'analyzing' });
      break;

    case 'key-choice':
      if (s.keyChoice !== el.dataset.val) setState({ keyChoice: el.dataset.val });
      break;

    case 'goto-deliberation': {
      const sc = getScenario(s.scenarioId);
      if (!s.keyChoice) { toast(sc.keyQuestion.note); break; }
      setState({ view: 'deliberation', accOpen: null });
      break;
    }

    case 'select-plan': {
      const id = el.dataset.plan;
      if (s.selectedPlan !== id) {
        const patch = { selectedPlan: id };
        if (s.appliedConditions.size > 0) {
          patch.appliedConditions = new Set();
          patch.condition = null;
          toast('已切换方案，上一方案的局部调整未被保留。');
        }
        setState(patch);
      }
      break;
    }

    case 'acc': {
      const key = `${el.dataset.plan}:${el.dataset.acc}`;
      setState({ accOpen: s.accOpen === key ? null : key });
      break;
    }

    case 'itin':
      setState({ itinOpen: s.itinOpen === el.dataset.plan ? null : el.dataset.plan });
      break;

    case 'basis':
      setState({ basisOpen: s.basisOpen === el.dataset.plan ? null : el.dataset.plan });
      break;

    case 'open-evidence': {
      const A = buildAnalysis(s);
      const plan = A.plans.find((p) => p.id === el.dataset.plan);
      if (plan) openDrawer(evidenceDrawerHtml(plan, getScenario(s.scenarioId)));
      break;
    }

    // 材料编号 → 来源详情抽屉（可多材料切换）
    case 'open-source': {
      let ctx = {};
      try { ctx = JSON.parse(el.dataset.ev || '{}'); } catch (_) { /* 忽略损坏上下文 */ }
      openDrawer(buildSourceDrawerHtml(el.dataset.mid, ctx));
      break;
    }

    case 'close-drawer':
      closeDrawer();
      break;

    case 'confirm-plan':
      if (!s.selectedPlan) { toast('请先选择一个方案。'); break; }
      setState({ view: 'decision', condition: null });
      break;

    case 'condition':
      setState({ condition: s.condition === el.dataset.cond ? null : el.dataset.cond });
      break;

    case 'apply-condition': {
      s.appliedConditions.add(el.dataset.cond);
      setState({});
      toast('已将调整纳入最终方案。');
      break;
    }

    case 'keep-condition':
      setState({ condition: null });
      break;

    case 'withdraw-condition': {
      s.appliedConditions.delete(el.dataset.cond);
      setState({});
      toast('已撤销该调整，恢复原方案。');
      break;
    }

    case 'check':
      // 由 change 事件处理
      break;

    case 'open-card':
      openCard();
      break;

    case 'close-card':
      if (el.classList.contains('modal-overlay') && e.target !== el) break;
      closeModal();
      break;

    // 真实生成并下载 PNG（失败时回退 SVG）
    case 'download-card': {
      const sc = getScenario(s.scenarioId);
      const A = buildAnalysis(s);
      const plan = A.plans.find((p) => p.id === s.selectedPlan);
      if (!plan) break;
      const d = plan.decision;
      const DIFFS = sc.diffs || {};
      const applied = [...s.appliedConditions].map((c) => DIFFS[plan.id]?.[c]).filter(Boolean);
      const budgetApplied = s.appliedConditions.has('budget');
      const budgetStr = budgetApplied && DIFFS[plan.id]?.budget
        ? `${DIFFS[plan.id].budget.budgetOverrideTotal}（已调整）`
        : plan.budget;
      const now = new Date();
      const p2 = (n) => String(n).padStart(2, '0');
      const dateStr = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日`;
      downloadDecisionCard({
        title: sc.cardTitle,
        subtitle: '有据 Grounded Choice · 生活决策审议台',
        goal: sc.goalText,
        choice: `方案 ${plan.id} · ${plan.name}`,
        choiceSub: `${plan.sub} · 预算 ${budgetStr} · ${plan.status.label}`,
        reasons: d.reasons,
        tradeoffs: d.gaveUp,
        applied: applied.map((x) => `${x.title}：${x.after.text}`),
        risks: [...d.risks, ...applied.map((x) => x.risk.text)],
        toConfirms: [...d.toConfirm, ...applied.map((x) => x.toConfirmAdd).filter(Boolean)],
        evidence: `${plan.status.label}（${plan.status.basis[0]}）`,
        unmetHard: plan.unmetHard || [],
        exploratory: A.exploratory,
        dateStr,
        disclaimer: sc.disclaimer,
      }, `有据-${sc.cardName}-${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`)
        .then((fmt) => toast(fmt === 'png' ? '决策卡已下载（PNG）' : '决策卡已下载（SVG）'));
      break;
    }

    case 'readjust':
      closeModal();
      document.getElementById('conditions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;

    case 'restart':
      closeDrawer(); closeModal();
      resetState();
      setState({ view: 'home' });
      toast('已恢复初始状态');
      break;

    case 'back': {
      const t = BACK[s.view];
      if (t) setState({ view: t });
      break;
    }

    case 'nav-step': {
      const step = el.dataset.step;
      const sc = getScenario(s.scenarioId);
      // 前置条件守卫：审议需要关键问题答案，决定需要已选方案
      if (step === 'deliberation' && !s.keyChoice) {
        setState({ view: 'brief' });
        toast(sc.keyQuestion.note);
        break;
      }
      if (step === 'decision' && !s.selectedPlan) {
        setState({ view: s.keyChoice ? 'deliberation' : 'brief' });
        toast('请先选择一个方案。');
        break;
      }
      closeDrawer(); closeModal();
      setState({ view: step, accOpen: null });
      break;
    }
  }
});

// 勾选行动清单
document.addEventListener('change', (e) => {
  if (e.target.matches('input[data-action="check"]')) {
    const s = getState();
    if (e.target.checked) s.checklist.add(e.target.dataset.id);
    else s.checklist.delete(e.target.dataset.id);
    setState({});
  }
});

// 开发保留：自由输入（Demo 主路径不暴露）
document.addEventListener('input', (e) => {
  if (e.target.id === 'custom-input') {
    getState().customText = e.target.value;
  }
  // 比价输入（仅 vacuum 场景）
  if (e.target.dataset.action === 'price-input') {
    e.stopPropagation();
    const platform = e.target.dataset.platform;
    if (platform) {
      const s = getState();
      if (!s.priceInputs) s.priceInputs = { jd: '', tb: '', pdd: '' };
      s.priceInputs[platform] = e.target.value;
      setState({});
    }
  }
});

// ---------- 决策卡弹层 ----------
function openCard() {
  const s = getState();
  const A = buildAnalysis(s);
  openModal(`
    ${decisionCardHtml(s, A)}
    <div class="modal-actions">
      <button class="btn btn-primary" data-action="download-card">下载决策卡</button>
      <button class="btn btn-secondary" data-action="readjust">重新调整条件</button>
    </div>
    <button class="icon-btn modal-close" data-action="close-card" aria-label="关闭决策卡">${icon('x')}</button>
  `);
}

// ---------- 键盘 ----------
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (isDrawerOpen()) closeDrawer();
    else if (isModalOpen()) closeModal();
  }
});

// 初始渲染
renderApp({ animate: false, scroll: false });
