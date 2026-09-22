// state.js — 应用状态与轻量订阅
import { getScenario } from './scenarios/index.js';

const state = {
  view: 'home',            // home | import | analyzing | brief | deliberation | decision
  scenarioId: 'travel',    // 当前场景：travel | vacuum
  importMode: 'sample',    // sample | custom（custom 为开发保留，Demo 主路径不暴露）
  customText: '',
  selected: new Set(getScenario('travel').mats.map((m) => m.id)),
  keyChoice: null,         // 关键问题答案（各场景不同，初始不默认选择）
  selectedPlan: null,      // 用户主动选择的方案（推荐 ≠ 选择，初始为空）
  accOpen: null,           // 折叠面板：'A:tradeoff' | 'A:notfor'
  itinOpen: null,          // 展开路线的方案 id（仅含路线模块的场景）
  basisOpen: null,         // 展开判断依据的方案 id
  condition: null,         // 当前预览的条件 id
  appliedConditions: new Set(), // 已应用至最终方案的条件
  checklist: new Set(),
  priceInputs: { jd: '', tb: '', pdd: '' }, // 下单前比价输入（仅 vacuum 场景使用）
};

let renderFn = null;

export function onRender(fn) {
  renderFn = fn;
}

export function getState() {
  return state;
}

export function setState(patch = {}) {
  const viewChanged = 'view' in patch;
  Object.assign(state, patch);
  if (renderFn) renderFn({ viewChanged });
}

// 进入（或切换）场景：清空该场景的全部过程状态，材料全选
export function enterScenario(id) {
  const sc = getScenario(id);
  state.scenarioId = sc.id;
  state.importMode = 'sample';
  state.customText = '';
  state.selected = new Set(sc.mats.map((m) => m.id));
  state.keyChoice = null;
  state.selectedPlan = null;
  state.accOpen = null;
  state.itinOpen = null;
  state.basisOpen = null;
  state.condition = null;
  state.appliedConditions = new Set();
  state.checklist = new Set();
  state.priceInputs = { jd: '', tb: '', pdd: '' };
  state.view = 'import';
}

export function resetState() {
  const sc = getScenario(state.scenarioId);
  state.view = 'home';
  state.importMode = 'sample';
  state.customText = '';
  state.selected = new Set(sc.mats.map((m) => m.id));
  state.keyChoice = null;
  state.selectedPlan = null;
  state.accOpen = null;
  state.itinOpen = null;
  state.basisOpen = null;
  state.condition = null;
  state.appliedConditions = new Set();
  state.checklist = new Set();
  state.priceInputs = { jd: '', tb: '', pdd: '' };
}
