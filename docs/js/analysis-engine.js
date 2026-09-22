// analysis-engine.js — 本地分析引擎（场景无关）
// 根据用户当前选中的材料、关键问题答案，动态生成：
//   共识 / 分歧 / 方案证据（过滤+降级）/ 证据状态（含判断依据）/ 资料不足提示
//   约束满足模型（meets / feasible / unmetHard / conflict）
//
// 证据状态规则（不使用百分比）：
//   证据充分  ≥3 份相对独立且非商业合作的资料支持，且无强反例
//   部分充分  2 份支持，或存在强反方经验
//   待验证    仅 1 份支持，或缺少实时信息
//
// 降级规则：
//   - 被取消的材料不再出现在任何引用中
//   - 共识依赖材料 <2 份时隐藏（不允许"单份材料达成共识"）
//   - 分歧任一方材料全部取消时隐藏
//   - "多份资料归纳"在有效引用 <2 份时降级为"AI 推断"
//   - 支持材料全部取消的证据条目隐藏；反方清空后显示占位说明
//   - 可能含商业合作的材料不计入独立证据计数（仍会展示，并注明）
//
// 约束满足规则：
//   每个方案的 meets[id] = { status: 'ok'|'warn'|'no', text }
//   unmetHard: 所有 hard 约束中 status 为 warn 或 no 的条目列表
//   feasible: unmetHard.length === 0（所有硬约束都 ok）
//   conflict: 方案被推荐（keyChoice 映射）且有 unmetHard
//   exploratory: insufficient === 'severe'（仅 1 份材料，证据不足）

import { getScenario } from './scenarios/index.js';

export function buildAnalysis(state, scenario) {
  const sc = scenario || getScenario(state.scenarioId);
  const active = new Set(state.selected);
  const mats = sc.mats.filter((m) => active.has(m.id));
  const matById = Object.fromEntries(sc.mats.map((m) => [m.id, m]));

  // ---- 资料不足状态 ----
  const insufficient = mats.length <= 1 ? 'severe' : mats.length === 2 ? 'light' : 'none';
  const insufficientText =
    mats.length <= 1
      ? '当前资料不足（仅选中 1 份材料），暂不能形成稳定结论，建议补充材料。'
      : mats.length === 2
        ? '仅选中 2 份材料，共识与方案支持被削弱，以下结果仅供参考。'
        : '';

  // ---- 探索性状态（severe 时降级推荐） ----
  const exploratory = insufficient === 'severe';

  // ---- 共识：依赖材料 ≥2 才显示 ----
  const consensus = sc.brief.consensus
    .map((c) => ({ ...c, refs: c.refs.filter((r) => active.has(r)) }))
    .filter((c) => c.refs.length >= 2)
    .map((c) => ({ ...c, src: `${c.refs.length} 份材料提到` }));

  // ---- 分歧：双方都至少保留 1 份材料 ----
  const disagreements = sc.brief.disagreements
    .map((d) => ({ ...d, sides: d.sides.map((s) => s.filter((r) => active.has(r))) }))
    .filter((d) => d.sides.every((s) => s.length >= 1));

  // ---- 方案证据过滤与降级 ----
  const filterList = (list) =>
    (list || [])
      .map((it) => {
        if (!it.refs || !it.refs.length) return { ...it };
        const refs = it.refs.filter((r) => active.has(r));
        if (!refs.length) return null; // 支持材料全部取消 → 隐藏
        let tag = it.tag;
        if (tag === 'synth' && refs.length < 2) tag = 'infer'; // 单份材料不能"归纳"
        return { ...it, refs, tag };
      })
      .filter(Boolean);

  // ---- 约束满足计算 ----
  const hardConstraints = (sc.constraints && sc.constraints.hard) || [];
  const backgroundConstraints = (sc.constraints && sc.constraints.background) || [];

  const plans = sc.plans.map((p) => {
    const ev = p.evidence;
    const supporting = filterList(ev.supporting);
    const opposing = filterList(ev.opposing);
    const outdated = filterList(ev.outdated);
    const fits = (ev.fits || []).map((it) => ({ ...it }));
    const toConfirm = (ev.toConfirm || []).map((it) => ({ ...it }));

    // 证据状态：商业材料不计入独立证据计数
    const supportRefs = [...new Set(supporting.flatMap((it) => it.refs || []))];
    const independentRefs = supportRefs.filter((id) => matById[id] && !matById[id].commercial);
    const strongCounters = (p.strongCounterRefs || []).filter((r) => active.has(r));
    let level;
    if (independentRefs.length < 2) level = 'wait';
    else if (independentRefs.length >= 3 && strongCounters.length === 0) level = 'ok';
    else level = 'mid';
    const label = level === 'ok' ? '证据充分' : level === 'mid' ? '部分充分' : '待验证';

    // 探索性标志
    const exploratoryPlan = exploratory;

    // 判断依据（可展开查看）
    const similarCount = supportRefs.filter((id) =>
      matById[id] && (matById[id].traits || []).some((t) => sc.similarTraits.includes(t))
    ).length;
    const commercialCount = supportRefs.filter((id) => matById[id] && matById[id].commercial).length;
    const basis = [];
    basis.push(
      independentRefs.length ? `${independentRefs.length} 份相对独立的经验支持` : '当前选中材料没有直接支持'
    );
    if (similarCount >= 2) basis.push(`其中 ${similarCount} 份来自相似处境（${sc.similarTraits.join(' / ')}）`);
    if (commercialCount > 0) basis.push(`其中 ${commercialCount} 份可能含商业合作，不计入独立证据`);
    if (strongCounters.length > 0) basis.push(`存在 ${strongCounters.length} 份强反方经验`);
    basis.push(sc.verifyNote);

    // ---- 约束满足 ----
    // meets 数据来自方案自身（scenarios 中定义），这里做汇总统计
    // 当 appliedConditions 包含 'budget' 且方案有 overrideRange 时，用调整后区间覆盖 budget meets
    const baseMeets = p.meets || {};
    const appliedConditions = state.appliedConditions;
    let meets = { ...baseMeets };
    if (appliedConditions && appliedConditions.has && appliedConditions.has('budget')) {
      const budgetDiff = sc.diffs && sc.diffs[p.id] && sc.diffs[p.id].budget;
      if (budgetDiff && budgetDiff.overrideRange) {
        const [lo, hi] = budgetDiff.overrideRange;
        const hardBudget = hardConstraints.find((c) => c.id === 'budget');
        const budgetLimit = hardBudget ? parseInt(hardBudget.text.replace(/\D/g, '')) : null;
        if (budgetLimit !== null && hi <= budgetLimit) {
          meets = { ...meets, budget: { status: 'ok', text: `预算已调整至 ${budgetDiff.budgetOverrideTotal}，上限 ${hi} 元满足 ${budgetLimit} 元约束` } };
        } else if (budgetLimit !== null) {
          meets = { ...meets, budget: { status: 'warn', text: `预算已调整至 ${budgetDiff.budgetOverrideTotal}，上限 ${hi} 元超出 ${budgetLimit} 元约束 ${hi - budgetLimit} 元——已改善但仍有风险` } };
        }
      }
    }

    // 统计 hard 约束的满足情况
    const unmetHard = hardConstraints
      .filter((c) => meets[c.id] && (meets[c.id].status === 'warn' || meets[c.id].status === 'no'))
      .map((c) => ({ ...c, meetStatus: meets[c.id].status, meetText: meets[c.id].text }));

    const feasible = unmetHard.length === 0;

    // 约束满足统计 label（基于 meets 动态计算）
    const allHardAndBg = [...hardConstraints, ...backgroundConstraints];
    let okCount = 0, warnCount = 0, noCount = 0;
    for (const c of allHardAndBg) {
      const m = meets[c.id];
      if (!m) continue;
      if (m.status === 'ok') okCount++;
      else if (m.status === 'warn') warnCount++;
      else if (m.status === 'no') noCount++;
    }
    const meetsTotal = okCount + warnCount + noCount;
    let constraintsLabel = '';
    if (meetsTotal > 0) {
      const parts = [];
      if (okCount > 0) parts.push(`${okCount} 项满足`);
      if (warnCount > 0) parts.push(`${warnCount} 项存在风险`);
      if (noCount > 0) parts.push(`${noCount} 项不满足`);
      constraintsLabel = parts.join('，');
    }

    return {
      ...p,
      evidence: { supporting, opposing, fits, outdated, toConfirm },
      status: { level, label, basis },
      supportRefs,
      meets,
      unmetHard,
      feasible,
      exploratoryPlan,
      constraintsLabel,
    };
  });

  // ---- 推荐逻辑 ----
  // exploratory 时不给确定性推荐（返回 null）
  const keyChoice = state.keyChoice;
  const rawRecommended = sc.keyFit[keyChoice] || null;
  const recommended = exploratory ? null : rawRecommended;

  // 检测推荐方案是否有硬约束冲突
  const recommendedPlan = rawRecommended ? plans.find((p) => p.id === rawRecommended) : null;
  const recommendedConflict = recommendedPlan && !exploratory ? recommendedPlan.unmetHard.length > 0 : false;

  // 完全满足硬约束的替代方案（用于冲突横幅）
  const feasibleAlternatives = rawRecommended
    ? plans.filter((p) => p.id !== rawRecommended && p.feasible).map((p) => p.id)
    : [];

  return {
    mats,
    insufficient,
    insufficientText,
    exploratory,
    consensus,
    disagreements,
    plans,
    recommended,
    recommendedConflict,
    feasibleAlternatives,
  };
}
