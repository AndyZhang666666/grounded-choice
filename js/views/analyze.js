// views/analyze.js — 第二步 · 分层分析动画
import { CIRCLED } from '../scenarios/index.js';
import { getScenario } from '../scenarios/index.js';

const STEP_PER_MS = 440;

function stepTexts(state) {
  return [
    '正在识别决策约束',
    `正在比较 ${state.selected.size} 份经验`,
    '正在寻找意见冲突',
    '正在检查风险和缺失信息',
  ];
}

export function renderAnalyzing(state) {
  const texts = stepTexts(state);
  const chips = CIRCLED.slice(0, getScenario(state.scenarioId).mats.length);
  return `
  <section class="view analyzing">
    <div class="wrap wrap-narrow">
      <div class="analyze-card">
        <p class="kicker center">第二步 · 理解需求</p>
        <h2 class="analyze-title">正在为你的决定做准备</h2>
        <div class="analyze-steps">
          ${texts.map((t, i) => `
          <div class="a-step" data-i="${i}">
            <span class="a-dot"></span>
            <span class="a-text">${t}</span>
            <span class="a-state">待处理</span>
          </div>`).join('')}
        </div>
        <div class="analyze-bar"><i id="analyze-progress"></i></div>
        <div class="analyze-chips" aria-hidden="true">
          ${chips.map((c) => `<span class="a-chip">${c}</span>`).join('')}
        </div>
        <p class="analyze-note">演示环境 · 使用内置分析结果，无需等待真实模型</p>
        <button class="back-link center" data-action="back">取消并返回</button>
      </div>
    </div>
  </section>`;
}

// 依次点亮四个分析阶段（总时长约 2 秒），完成后回调
export function runAnalyzeSequence(onDone) {
  const stepEls = Array.from(document.querySelectorAll('.a-step'));
  const chipEls = Array.from(document.querySelectorAll('.a-chip'));
  const bar = document.getElementById('analyze-progress');
  const total = STEP_PER_MS * 4;

  if (bar) {
    bar.style.transition = `width ${total}ms linear`;
    requestAnimationFrame(() => { if (bar.isConnected) bar.style.width = '100%'; });
  }
  stepEls.forEach((el, i) => {
    setTimeout(() => {
      if (!el.isConnected) return;
      el.classList.add('active');
      el.querySelector('.a-state').textContent = '进行中';
    }, i * STEP_PER_MS);
    setTimeout(() => {
      if (!el.isConnected) return;
      el.classList.remove('active');
      el.classList.add('done');
      el.querySelector('.a-state').textContent = '完成';
    }, (i + 1) * STEP_PER_MS - 100);
  });
  // 第二阶段进行时，材料编号逐个点亮
  chipEls.forEach((c, i) => {
    setTimeout(() => { if (c.isConnected) c.classList.add('on'); }, STEP_PER_MS + 120 + i * 90);
  });

  return setTimeout(onDone, total + 340);
}
