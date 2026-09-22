// scenarios/index.js — 场景注册表
// 统一的「场景对象」契约：视图层（import/brief/deliberation/decision）与
// 分析引擎都从这里取数据；通用常量（编号、价值观、证据标签）也在此导出。

import * as travel from './travel.js';
import * as vacuum from './robot-vacuum.js';

// ---------- 通用常量 ----------
export const CIRCLED = travel.CIRCLED;
export const VALUES = travel.VALUES;
export const TAG_LABELS = travel.TAG_LABELS;

// 首页场景卡（有序）
export const SCENARIOS = [travel.SCENARIO, vacuum.SCENARIO];

// ---------- 场景构建 ----------
function buildScenario(d) {
  const meta = d.SCENARIO;
  return {
    ...meta,
    mats: d.MATERIALS,
    brief: d.BRIEF,
    constraints: d.CONSTRAINTS || null,
    keyQuestion: d.KEY_QUESTION,
    plans: d.PLANS,
    checklist: d.CHECKLIST,
    conditions: d.CONDITIONS,
    diffs: d.DIFFS,
    hasItinerary: meta.modules.includes('itinerary'),
    dims: meta.compareDims,
    // 对比表取值：budget 维度直接用方案预算行，其余从 compare 取
    dimVal(p, key) {
      if (key === 'budget') return p.budget;
      return (p.compare && p.compare[key]) || '—';
    },
    // 价格/预算行：应用「预算调整」类条件后显示划线原价 + 调整后
    pricePlain(p, applied) {
      const b = this.diffs[p.id] && this.diffs[p.id].budget;
      return applied && applied.has('budget') && b ? `${b.budgetOverrideTotal}（已调整）` : p.budget;
    },
    priceHtml(p, applied) {
      const b = this.diffs[p.id] && this.diffs[p.id].budget;
      const appliedBudget = applied && applied.has('budget') && b;
      return appliedBudget
        ? `<s>${p.budget}</s> ${b.budgetOverrideTotal}（已调整）`
        : p.budget;
    },
  };
}

const BUILT = { travel: buildScenario(travel), vacuum: buildScenario(vacuum) };

// ---------- 取场景（未注册时回退 travel） ----------
export function getScenario(id) {
  return BUILT[id] || BUILT.travel;
}
