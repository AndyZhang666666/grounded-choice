// 一体化验证：数据完整性 + 引擎行为（两场景）
import { getScenario, SCENARIOS } from '../js/scenarios/index.js';
import { buildAnalysis } from '../js/analysis-engine.js';

let fails = 0;
const t = (name, cond, extra = '') => {
  if (!cond) { fails++; console.log('FAIL |', name, extra); }
  else console.log('ok   |', name);
};

for (const sc of [getScenario('travel'), getScenario('vacuum')]) {
  // 1) quotes 必须是对应材料 summary 的精确子串
  for (const c of sc.brief.consensus) for (const [mid, q] of Object.entries(c.quotes || {})) {
    t(`${sc.id} 共识 quote ${mid}`, sc.mats.find(m => m.id === mid)?.summary.includes(q), `"${q}"`);
  }
  for (const d of sc.brief.disagreements) for (const [mid, q] of Object.entries(d.quotes || {})) {
    t(`${sc.id} 分歧 quote ${mid}`, sc.mats.find(m => m.id === mid)?.summary.includes(q), `"${q}"`);
  }
  for (const p of sc.plans) {
    for (const sec of ['supporting', 'opposing']) for (const it of p.evidence[sec]) {
      for (const [mid, q] of Object.entries(it.quotes || {})) {
        t(`${sc.id} ${p.id}.${sec} quote ${mid}`, sc.mats.find(m => m.id === mid)?.summary.includes(q), `"${q}"`);
      }
    }
    for (const [k, d] of Object.entries(sc.diffs[p.id] || {})) {
      for (const part of [d.reason, d.risk]) {
        for (const [mid, q] of Object.entries(part?.quotes || {})) {
          t(`${sc.id} ${p.id}.${k}.${part === d.reason ? 'reason' : 'risk'} quote ${mid}`, sc.mats.find(m => m.id === mid)?.summary.includes(q), `"${q}"`);
        }
      }
      if (d.budgetOverride) {
        const lo = d.budgetOverride.reduce((a, [, v]) => a + parseInt(v.split('～')[0].replace(/\D/g, '')), 0);
        const hi = d.budgetOverride.reduce((a, [, v]) => a + parseInt(v.split('～')[1].replace(/\D/g, '')), 0);
        t(`${sc.id} ${p.id}.${k} 预算拆分=总额`, d.budgetOverrideTotal === `${lo}～${hi} 元`, `${d.budgetOverrideTotal} vs ${lo}～${hi} 元`);
      }
    }
    if (p.budgetSplit) {
      const lo = p.budgetSplit.reduce((a, [, v]) => a + parseInt(v.split('～')[0].replace(/\D/g, '')), 0);
      const hi = p.budgetSplit.reduce((a, [, v]) => a + parseInt(v.split('～')[1].replace(/\D/g, '')), 0);
      t(`${sc.id} ${p.id} 预算拆分=总额`, p.budgetTotal === `${lo}～${hi} 元`, `${p.budgetTotal} vs ${lo}～${hi} 元`);
    }
  }
}

const mkState = (id, sel, keyChoice = null, extra = {}) => ({
  scenarioId: id, selected: new Set(sel), keyChoice, selectedPlan: null, appliedConditions: new Set(), ...extra,
});

// 2) travel 全选：A 充分 / B 部分充分 / C 部分充分；推荐映射
const sAll = mkState('travel', getScenario('travel').mats.map(m => m.id));
const at = buildAnalysis(sAll);
t('travel A 充分', at.plans.find(p => p.id === 'A').status.label === '证据充分', at.plans.find(p => p.id === 'A').status.label);
t('travel B 待验证（m2 移入反方后仅剩 m6 一份支持）', at.plans.find(p => p.id === 'B').status.label === '待验证', at.plans.find(p => p.id === 'B').status.label);
t('travel C 部分充分', at.plans.find(p => p.id === 'C').status.label === '部分充分', at.plans.find(p => p.id === 'C').status.label);
for (const [k, expect] of Object.entries({ missSpot: 'B', earlyRise: 'A', budget: 'C' })) {
  t(`travel keyFit ${k}->${expect}`, buildAnalysis(mkState('travel', sAll.selected, k)).recommended === expect);
}
t('travel 共识3', at.consensus.length === 3);
t('travel 分歧3', at.disagreements.length === 3);

// 3) travel 取消 m2,m6：B 支持材料消失 → 待验证；共识减半
const sFew = mkState('travel', ['m1', 'm3', 'm4', 'm5', 'm7', 'm8']);
const af = buildAnalysis(sFew);
const bPlan = af.plans.find(p => p.id === 'B');
t('travel 去m2m6 B 待验证', bPlan.status.label === '待验证', bPlan.status.label);
t('travel 去m2m6 B 支持条目隐藏', bPlan.evidence.supporting.length === 0, `remaining=${bPlan.evidence.supporting.length}`);
t('travel 去m2m6 共识3(c2仍剩m4m1)', af.consensus.length === 3, String(af.consensus.length));
t('travel 去m2m6 分歧2', af.disagreements.length === 2, String(af.disagreements.length));
const sNo46 = mkState('travel', ['m1', 'm2', 'm3', 'm5', 'm7', 'm8']);
const af2 = buildAnalysis(sNo46);
t('travel 去m4m6 共识2(c2依赖不足隐藏)', af2.consensus.length === 2, String(af2.consensus.length));

// 4) 只留 1 份 → severe 资料不足
const a1 = buildAnalysis(mkState('travel', ['m3']));
t('travel 1份 severe', a1.insufficient === 'severe' && a1.insufficientText.includes('资料不足'));

// 5) vacuum 全选：A 部分充分（商业降权）/ B 充分 / C 部分充分
const vAll = mkState('vacuum', getScenario('vacuum').mats.map(m => m.id));
const av = buildAnalysis(vAll);
t('vacuum A 部分充分', av.plans.find(p => p.id === 'A').status.label === '部分充分', av.plans.find(p => p.id === 'A').status.label + ' basis=' + JSON.stringify(av.plans.find(p => p.id === 'A').status.basis));
t('vacuum B 充分', av.plans.find(p => p.id === 'B').status.label === '证据充分', av.plans.find(p => p.id === 'B').status.label);
t('vacuum C 部分充分', av.plans.find(p => p.id === 'C').status.label === '部分充分', av.plans.find(p => p.id === 'C').status.label);
for (const [k, expect] of Object.entries({ tangle: 'A', noise: 'B', price: 'C' })) {
  t(`vacuum keyFit ${k}->${expect}`, buildAnalysis(mkState('vacuum', vAll.selected, k)).recommended === expect);
}
t('vacuum 共识3', av.consensus.length === 3);
t('vacuum 分歧3', av.disagreements.length === 3);
t('vacuum A 商业降权说明', av.plans.find(p => p.id === 'A').status.basis.some(b => b.includes('商业合作')));

// 6) vacuum 去掉 v1：A 支持剩 v4,v5 仍部分充分（不依赖商业材料）；分歧 vd1 隐藏
const vFew = mkState('vacuum', ['v2', 'v3', 'v4', 'v5', 'v6']);
const avf = buildAnalysis(vFew);
t('vacuum 去v1 A 部分充分', avf.plans.find(p => p.id === 'A').status.label === '部分充分', avf.plans.find(p => p.id === 'A').status.label);
t('vacuum 去v1 分歧2', avf.disagreements.length === 2, String(avf.disagreements.length));
t('vacuum 去v1 A 无v1引用', !avf.plans.find(p => p.id === 'A').evidence.supporting.some(it => it.refs.includes('v1')));

// 7) vacuum 只留 v1 → severe
t('vacuum 1份 severe', buildAnalysis(mkState('vacuum', ['v1'])).insufficient === 'severe');

// 8) 首年成本口径
const vsc = getScenario('vacuum');
t('vacuum A 首年区间', vsc.plans[0].budget.includes('2800～3100') && vsc.plans[0].budget.includes('3000～3350'), vsc.plans[0].budget);
t('vacuum 条件为空(无条件模拟)', vsc.conditions.length === 0 && Object.keys(vsc.diffs).length === 0);
t('vacuum hasItinerary=false', vsc.hasItinerary === false);
t('travel hasItinerary=true', getScenario('travel').hasItinerary === true);

// 9) 首页两张场景卡
t('SCENARIOS 两场景', SCENARIOS.length === 2 && SCENARIOS[0].id === 'travel' && SCENARIOS[1].id === 'vacuum');

// ============================================================
// 10) 首页渲染：含"选择决策场景"与两个 enter-scenario
// ============================================================
import { renderHome } from '../js/views/home.js';
const homeHtml = renderHome();
t('首页含"选择决策场景"', homeHtml.includes('选择决策场景'));
t('首页含 enter-scenario travel', homeHtml.includes('data-sc="travel"'));
t('首页含 enter-scenario vacuum', homeHtml.includes('data-sc="vacuum"'));
t('首页不再含 start-sample 主按钮直达', !homeHtml.includes('data-action="start-sample"'));
t('首页含 id=scenarios 锚点', homeHtml.includes('id="scenarios"'));

// ============================================================
// 11) 场景切换状态重置（enterScenario 已做，验证引擎结果）
// ============================================================
import { getState, enterScenario, setState } from '../js/state.js';
// travel → vacuum，检查 keyChoice/selectedPlan 都清空
enterScenario('travel');
getState().keyChoice = 'missSpot';
getState().selectedPlan = 'B';
enterScenario('vacuum');
const afterSwitch = getState();
t('切换场景后 keyChoice 清空', afterSwitch.keyChoice === null);
t('切换场景后 selectedPlan 清空', afterSwitch.selectedPlan === null);
t('切换场景后 scenarioId 更新', afterSwitch.scenarioId === 'vacuum');
t('切换场景后 selected 全选当前场景', afterSwitch.selected.size === getScenario('vacuum').mats.length);

// ============================================================
// 12) 硬约束冲突检测（引擎层 unmetHard/conflict）
// ============================================================
// 旅行 missSpot → B（预算 warn），earlyRise → A（无冲突），budget → C（无冲突）
const travelAllMats = getScenario('travel').mats.map(m => m.id);
const mkTravelState = (kc) => mkState('travel', travelAllMats, kc);
const atMiss = buildAnalysis(mkTravelState('missSpot'));
const planB_miss = atMiss.plans.find(p => p.id === 'B');
t('travel missSpot→B conflict=true', atMiss.recommendedConflict === true, `conflict=${atMiss.recommendedConflict}`);
t('travel missSpot→B B.unmetHard 包含 budget', planB_miss.unmetHard.some(c => c.id === 'budget'), JSON.stringify(planB_miss.unmetHard.map(c=>c.id)));
t('travel missSpot→B B.unmetHard status=warn', planB_miss.unmetHard.find(c=>c.id==='budget')?.meetStatus === 'warn');
t('travel missSpot→B feasibleAlternatives 含 A 或 C', atMiss.feasibleAlternatives.length > 0, JSON.stringify(atMiss.feasibleAlternatives));

const atEarly = buildAnalysis(mkTravelState('earlyRise'));
const planA_early = atEarly.plans.find(p => p.id === 'A');
t('travel earlyRise→A no conflict', atEarly.recommendedConflict === false, `conflict=${atEarly.recommendedConflict}`);
t('travel earlyRise→A A.feasible=true', planA_early.feasible === true, `feasible=${planA_early.feasible}`);

const atBudget = buildAnalysis(mkTravelState('budget'));
const planC_budget = atBudget.plans.find(p => p.id === 'C');
t('travel budget→C no conflict', atBudget.recommendedConflict === false, `conflict=${atBudget.recommendedConflict}`);
t('travel budget→C C.feasible=true', planC_budget.feasible === true, `feasible=${planC_budget.feasible}`);

// 扫地机：tangle→A（warn），noise→B（no），price→C（无冲突）
const vacuumAllMats = getScenario('vacuum').mats.map(m => m.id);
const mkVacState = (kc) => mkState('vacuum', vacuumAllMats, kc);
const avTangle = buildAnalysis(mkVacState('tangle'));
const planA_tangle = avTangle.plans.find(p => p.id === 'A');
t('vacuum tangle→A conflict=true', avTangle.recommendedConflict === true, `conflict=${avTangle.recommendedConflict}`);
t('vacuum tangle→A A.unmetHard 含 budget(warn)', planA_tangle.unmetHard.some(c=>c.id==='budget' && c.meetStatus==='warn'), JSON.stringify(planA_tangle.unmetHard.map(c=>`${c.id}:${c.meetStatus}`)));

const avNoise = buildAnalysis(mkVacState('noise'));
const planB_noise = avNoise.plans.find(p => p.id === 'B');
t('vacuum noise→B conflict=true', avNoise.recommendedConflict === true, `conflict=${avNoise.recommendedConflict}`);
t('vacuum noise→B B.unmetHard 含 budget(no)', planB_noise.unmetHard.some(c=>c.id==='budget' && c.meetStatus==='no'), JSON.stringify(planB_noise.unmetHard.map(c=>`${c.id}:${c.meetStatus}`)));
t('vacuum noise→B B.feasible=false', planB_noise.feasible === false);

const avPrice = buildAnalysis(mkVacState('price'));
const planC_price = avPrice.plans.find(p => p.id === 'C');
t('vacuum price→C conflict=true（C 门槛越障未实测）', avPrice.recommendedConflict === true, `conflict=${avPrice.recommendedConflict}`);
t('vacuum price→C C.feasible=false（threshold warn）', planC_price.feasible === false, `feasible=${planC_price.feasible}`);

// ============================================================
// 13) 探索性降级（1 份材料）
// ============================================================
const a1_travel = buildAnalysis(mkState('travel', ['m3']));
t('travel 1份 exploratory=true', a1_travel.exploratory === true);
t('travel 1份 recommended=null（不给确定推荐）', a1_travel.recommended === null);
const a1_vac = buildAnalysis(mkState('vacuum', ['v1']));
t('vacuum 1份 exploratory=true', a1_vac.exploratory === true);
t('vacuum 1份 recommended=null', a1_vac.recommended === null);

// ============================================================
// 14) 取消关键材料后引用与推荐状态联动
// ============================================================
// 旅行取消 m2（双桥沟/新都桥），B 的支持材料消失；但 B 可能仍被推荐，只是证据降级
const sNoM2 = mkState('travel', travelAllMats.filter(id => id !== 'm2'), 'missSpot');
const anNoM2 = buildAnalysis(sNoM2);
const planBNoM2 = anNoM2.plans.find(p => p.id === 'B');
t('travel 去m2 B 支持引用不含 m2', !planBNoM2.evidence.supporting.some(it => (it.refs||[]).includes('m2')));
t('travel 去m2 B fitWhy 不影响（在 state 层）', anNoM2.recommended === 'B'); // missSpot 仍映射 B

// ============================================================
// 15) 条件应用/撤销的数据层效果
// ============================================================
import { resetState as resetStateImport } from '../js/state.js';
// 模拟：选择方案 A，应用 budget 条件，验证 appliedConditions 状态
const condState = {
  scenarioId: 'travel', selected: new Set(travelAllMats),
  keyChoice: 'earlyRise', selectedPlan: 'A',
  appliedConditions: new Set(['budget']), checklist: new Set(),
};
const sc_travel = getScenario('travel');
const budgetDiff = sc_travel.diffs['A'].budget;
t('条件应用 appliedConditions.has(budget)', condState.appliedConditions.has('budget'));
t('条件应用 budgetDiff 存在', !!budgetDiff);
t('条件应用 budgetOverrideTotal 格式正确', budgetDiff.budgetOverrideTotal.includes('元'));
// 撤销
condState.appliedConditions.delete('budget');
t('条件撤销 appliedConditions.has(budget)=false', !condState.appliedConditions.has('budget'));

// ============================================================
// 16) decisionCardHtml 含未满足约束/证据状态区块
// ============================================================
import { decisionCardHtml } from '../js/views/decision.js';
// 旅行 missSpot→B：B 有预算 warn
const cardStateB = { ...mkTravelState('missSpot'), selectedPlan: 'B', appliedConditions: new Set(), checklist: new Set() };
const cardAnalysisB = buildAnalysis(cardStateB);
const cardHtmlB = decisionCardHtml(cardStateB, cardAnalysisB);
t('decisionCardHtml B 含未满足约束区块', cardHtmlB.includes('sc-unmet') || cardHtmlB.includes('未满足'));
t('decisionCardHtml B 含 unmet-warn', cardHtmlB.includes('unmet-warn') || cardHtmlB.includes('存在风险'));
t('decisionCardHtml B 含证据状态', cardHtmlB.includes('证据状态') || cardHtmlB.includes(cardAnalysisB.plans.find(p=>p.id==='B').status.label));

// 探索性状态下的决策卡
const cardState1 = { ...mkState('travel', ['m3'], 'earlyRise'), selectedPlan: 'A', appliedConditions: new Set(), checklist: new Set() };
const cardAnalysis1 = buildAnalysis(cardState1);
// 强制设 selectedPlan 使 decisionCardHtml 能找到方案
const cardHtml1 = decisionCardHtml(cardState1, cardAnalysis1);
t('decisionCardHtml 探索性状态含注记', cardHtml1.includes('探索性') || cardHtml1.includes('证据不足'));

// ============================================================
// 17) constraintsLabel 由 meets 动态计算（不写死）
// ============================================================
const planA_all = at.plans.find(p => p.id === 'A');
t('travel A constraintsLabel 非空', planA_all.constraintsLabel.length > 0, planA_all.constraintsLabel);
t('travel A constraintsLabel 含"满足"', planA_all.constraintsLabel.includes('满足'), planA_all.constraintsLabel);

const vacPlanC_price = avPrice.plans.find(p => p.id === 'C');
t('vacuum C constraintsLabel 非空', vacPlanC_price.constraintsLabel.length > 0, vacPlanC_price.constraintsLabel);

// ============================================================
// 18) BRIEF 含 background 字段
// ============================================================
const sc_vac = getScenario('vacuum');
t('vacuum brief 含 background 字段', Array.isArray(sc_vac.brief.background) && sc_vac.brief.background.length > 0);
t('vacuum brief.background 含夜间清扫', sc_vac.brief.background.some(b => b.text.includes('夜间')));
const sc_tr = getScenario('travel');
t('travel brief 含 background 字段', Array.isArray(sc_tr.brief.background) && sc_tr.brief.background.length > 0);
t('travel brief.background 含独自出行', sc_tr.brief.background.some(b => b.text.includes('独自出行')));

// ============================================================
// 19) m1/m2 标签已按内容区分
// ============================================================
const m1 = sc_tr.mats.find(m => m.id === 'm1');
const m2 = sc_tr.mats.find(m => m.id === 'm2');
t('m1 tag 不是"路线体验"（已改为内容描述）', m1.tag !== '路线体验', m1.tag);
t('m2 tag 不是"路线体验"（已改为内容描述）', m2.tag !== '路线体验', m2.tag);
t('m1 tag 与 m2 tag 不同', m1.tag !== m2.tag, `m1=${m1.tag} m2=${m2.tag}`);

// ============================================================
// 20) meets 结构完整性
// ============================================================
for (const sc of [getScenario('travel'), getScenario('vacuum')]) {
  for (const p of sc.plans) {
    t(`${sc.id} ${p.id} meets 存在`, !!p.meets, JSON.stringify(Object.keys(p.meets||{})));
    const meetsKeys = Object.keys(p.meets || {});
    t(`${sc.id} ${p.id} meets 非空`, meetsKeys.length > 0, `${meetsKeys.length} keys`);
    for (const [k, v] of Object.entries(p.meets || {})) {
      t(`${sc.id} ${p.id} meets.${k}.status 合法值`, ['ok','warn','no'].includes(v.status), v.status);
      t(`${sc.id} ${p.id} meets.${k}.text 非空`, typeof v.text === 'string' && v.text.length > 0);
    }
  }
}

// ============================================================
// 21) vacuum goalHtml 已更新为首年总成本口径
// ============================================================
t('vacuum goalHtml 含首年含耗材说明', sc_vac.goalHtml.includes('首年含耗材') || sc_vac.goalHtml.includes('首年'));

// ============================================================
// 22) 四项修复针对性断言
// ============================================================

// 22a) m2 在 B 中的角色：应出现在 opposing（含 m2 引用），不出现在 supporting
const bPlanAll = at.plans.find(p => p.id === 'B');
t('m2 不在 B 的 supporting 中', !bPlanAll.evidence.supporting.some(it => (it.refs||[]).includes('m2')));
t('m2 出现在 B 的 opposing 中', bPlanAll.evidence.opposing.some(it => (it.refs||[]).includes('m2')));
t('B opposing 含 infer 条目（方案推演）', bPlanAll.evidence.opposing.some(it => it.tag === 'infer'));

// 22b) 预算条件名已更新为 500
t('travel budget 条件名含 500', getScenario('travel').conditions.find(c => c.id === 'budget')?.label.includes('500'));
// appliedConditions 含 budget 时 B 的 unmetHard 为空（override 后上限 3400 ≤ 3500）
const stateWithBudget = mkState('travel', travelAllMats, 'missSpot');
stateWithBudget.appliedConditions = new Set(['budget']);
const analysisWithBudget = buildAnalysis(stateWithBudget);
const planBWithBudget = analysisWithBudget.plans.find(p => p.id === 'B');
t('B 应用 budget 条件后 unmetHard.budget 为空', !planBWithBudget.unmetHard.some(c => c.id === 'budget'));
// 撤销后恢复：不传 appliedConditions（或空 Set）时 B 仍有 budget warn
const stateNoBudget = mkState('travel', travelAllMats, 'missSpot');
stateNoBudget.appliedConditions = new Set();
const analysisNoBudget = buildAnalysis(stateNoBudget);
const planBNoBudget = analysisNoBudget.plans.find(p => p.id === 'B');
t('B 撤销 budget 条件后 unmetHard 含 budget warn', planBNoBudget.unmetHard.some(c => c.id === 'budget' && c.meetStatus === 'warn'));

// 22c) 扫地机 A/C 门槛为 warn，全场景无 feasible 方案
const vacAllMats2 = getScenario('vacuum').mats.map(m => m.id);
const avAll2 = buildAnalysis(mkState('vacuum', vacAllMats2));
const vPlanA = avAll2.plans.find(p => p.id === 'A');
const vPlanC = avAll2.plans.find(p => p.id === 'C');
t('vacuum A threshold 为 warn', vPlanA.meets.threshold.status === 'warn');
t('vacuum C threshold 为 warn', vPlanC.meets.threshold.status === 'warn');
t('vacuum 全场景无 feasible 方案', avAll2.plans.every(p => !p.feasible));

// 22d) home 按钮目标：不含 href="#scenarios"，不含「真实经验」
// renderHome 已在第 10 节导入，复用 homeHtml
t('首页按钮不指向 href="#scenarios"', !homeHtml.includes('href="#scenarios"'));
t('首页无「真实经验」字样', !homeHtml.includes('真实经验'));
t('首页无「真实证据驱动」字样', !homeHtml.includes('真实证据驱动'));

// ============================================================
// 23) REVIEWS 结构验证
// ============================================================
import { REVIEWS } from '../js/scenarios/robot-vacuum.js';
t('REVIEWS 三键齐备', ['tangle','noise','price'].every(k => k in REVIEWS), JSON.stringify(Object.keys(REVIEWS)));
for (const key of ['tangle','noise','price']) {
  t(`REVIEWS.${key}.pro 至少 2 条`, Array.isArray(REVIEWS[key].pro) && REVIEWS[key].pro.length >= 2, `${REVIEWS[key].pro.length}`);
  t(`REVIEWS.${key}.con 至少 1 条`, Array.isArray(REVIEWS[key].con) && REVIEWS[key].con.length >= 1, `${REVIEWS[key].con.length}`);
  t(`REVIEWS.${key}.cond 非空字符串`, typeof REVIEWS[key].cond === 'string' && REVIEWS[key].cond.length > 0);
}

// ============================================================
// 24) comparePrices 纯函数行为
// ============================================================
import { comparePrices } from '../js/views/decision.js';
// 空输入
const cp0 = comparePrices({ jd: '', tb: '', pdd: '' });
t('comparePrices 全空 min=null', cp0.min === null, JSON.stringify(cp0));
t('comparePrices 全空 platform=null', cp0.platform === null);
// 两项有效
const cp2 = comparePrices({ jd: '2899', tb: '2750', pdd: '' });
t('comparePrices 两项 min=2750', cp2.min === 2750, String(cp2.min));
t('comparePrices 两项 platform=淘宝', cp2.platform === '淘宝', cp2.platform);
// 含非法值（负数）
const cpBad = comparePrices({ jd: '-5', tb: '2750', pdd: '' });
t('comparePrices 含负数 min=2750', cpBad.min === 2750, String(cpBad.min));
t('comparePrices 含负数 entries 长度=1', cpBad.entries.length === 1, String(cpBad.entries.length));
// 一项
const cp1 = comparePrices({ jd: '3100', tb: '', pdd: '' });
t('comparePrices 单项 min=3100', cp1.min === 3100, String(cp1.min));
t('comparePrices 单项 platform=京东', cp1.platform === '京东', cp1.platform);

// ============================================================
// 25) vacuum hasReviews=true；travel 无该字段或为 false
// ============================================================
t('vacuum hasReviews=true', getScenario('vacuum').hasReviews === true);
t('travel hasReviews 不为 true', !getScenario('travel').hasReviews);

// ============================================================
// 26) renderDeliberation: vacuum+tangle 含评论块; travel 不含
// ============================================================
import { renderDeliberation } from '../js/views/deliberation.js';
const mkDelibState = (scenarioId, keyChoice) => ({
  scenarioId, keyChoice, selectedPlan: null, accOpen: null, itinOpen: null,
  basisOpen: null, selected: new Set(getScenario(scenarioId).mats.map(m => m.id)),
  appliedConditions: new Set(), checklist: new Set(), priceInputs: { jd:'', tb:'', pdd:'' },
});
const vacTangleState = mkDelibState('vacuum', 'tangle');
const vacTangleA = buildAnalysis(vacTangleState);
const vacDelibHtml = renderDeliberation(vacTangleState, vacTangleA);
t('vacuum tangle deliberation 含 reviews-block', vacDelibHtml.includes('reviews-block'));
t('vacuum tangle deliberation 含 tangle 相关内容', vacDelibHtml.includes('缠') || vacDelibHtml.includes('tangle') || vacDelibHtml.includes('胶刷'));

const vacNoiseState = mkDelibState('vacuum', 'noise');
const vacNoiseA = buildAnalysis(vacNoiseState);
const vacNoiseHtml = renderDeliberation(vacNoiseState, vacNoiseA);
t('vacuum noise deliberation 含评论里怎么说', vacNoiseHtml.includes('reviews-block'));
t('vacuum noise deliberation 含 noise 相关内容', vacNoiseHtml.includes('静音') || vacNoiseHtml.includes('噪音') || vacNoiseHtml.includes('夜间'));

const travelState = mkDelibState('travel', 'missSpot');
const travelA = buildAnalysis(travelState);
const travelDelibHtml = renderDeliberation(travelState, travelA);
t('travel deliberation 不含 reviews-block', !travelDelibHtml.includes('reviews-block'));

// ============================================================
// 27) renderDecision: vacuum 含比价卡; travel 不含
// ============================================================
import { renderDecision } from '../js/views/decision.js';
const mkDecState = (scenarioId, selectedPlan) => ({
  scenarioId, selectedPlan, keyChoice: scenarioId === 'vacuum' ? 'tangle' : 'earlyRise',
  accOpen: null, itinOpen: null, basisOpen: null,
  selected: new Set(getScenario(scenarioId).mats.map(m => m.id)),
  appliedConditions: new Set(), checklist: new Set(),
  condition: null,
  priceInputs: { jd: '', tb: '', pdd: '' },
});
const vacDecState = mkDecState('vacuum', 'A');
const vacDecA = buildAnalysis(vacDecState);
const vacDecHtml = renderDecision(vacDecState, vacDecA);
t('vacuum decision 含 price-compare', vacDecHtml.includes('price-compare'));
t('vacuum decision 含下单前比价标题', vacDecHtml.includes('下单前比价'));
t('vacuum decision 未输入时含暂无比较结果', vacDecHtml.includes('暂无比较结果'));
t('vacuum decision 含虚构型号标注', vacDecHtml.includes('虚构型号'));

const travelDecState = mkDecState('travel', 'A');
const travelDecA = buildAnalysis(travelDecState);
const travelDecHtml = renderDecision(travelDecState, travelDecA);
t('travel decision 不含 price-compare', !travelDecHtml.includes('price-compare'));

console.log(fails === 0 ? '\nALL CHECKS PASSED' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
