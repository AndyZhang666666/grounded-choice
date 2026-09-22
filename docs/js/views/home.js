// views/home.js — 首页（重设计版）
import { SCENARIOS } from '../scenarios/index.js';

// 五步机制数据
const MECHANISM = [
  {
    no: '01',
    title: '经验输入',
    desc: '汇集多份经验材料',
    example: '8 份模拟旅行经验',
  },
  {
    no: '02',
    title: '识别共识/分歧',
    desc: '标出哪些结论一致、哪些有争议',
    example: '「低海拔适应」是共识；绕路分歧',
  },
  {
    no: '03',
    title: '对照个人约束',
    desc: '把你的条件带入，过滤不适用方案',
    example: '预算 3500 · 5 天 · 不自驾',
  },
  {
    no: '04',
    title: '比较方案与代价',
    desc: '列出每种选择的得与失',
    example: '超预算方案会被明确标出',
  },
  {
    no: '05',
    title: '用户决定',
    desc: '你来选，附带待核实清单',
    example: '选择后保留待核实清单',
  },
];

export function renderHome() {
  const [travel, vacuum] = SCENARIOS;

  return `
  <section class="view home">
    <div class="wrap">

      <!-- ① 首屏双栏：左=定位，右=场景入口 -->
      <div class="home-hero" id="scenarios">
        <!-- 左栏：定位 + 价值主张 -->
        <div class="home-hero-left">
          <p class="home-kicker">生活决策审议台 · Grounded Choice</p>
          <h1 class="home-title">把<em>经验材料</em>，<br>变成<em>敢做的决定</em>。</h1>
          <p class="home-sub">有据从多份经验材料中识别共识、分歧和适用条件，帮你看清每种选择的代价与约束——最终由你来做决定。</p>
          <ul class="home-values-inline" aria-label="核心价值">
            <li>经验证据驱动</li>
            <li>显示代价与取舍</li>
            <li>保留你的判断权</li>
          </ul>
          <div class="home-cta-area">
            <p class="home-choose-label">选择一个场景开始体验</p>
            <button class="btn btn-primary" id="scroll-to-scenes-btn" data-action="scroll-to-scenes">选择决策场景</button>
          </div>
        </div>

        <!-- 右栏：两张场景入口卡 -->
        <div class="home-hero-right" id="scene-cards">

          <!-- 场景卡一：川西旅行（长链路，主卡样式） -->
          <button class="scene-card scene-card--travel" data-action="enter-scenario" data-sc="${travel.id}" tabindex="0">
            <div class="sc-header">
              <span class="sc-meta-tag">${travel.meta}</span>
              <span class="sc-count-tag">8 份经验</span>
            </div>
            <h3 class="sc-name">${travel.name}</h3>
            <p class="sc-desc">${travel.desc}</p>
            <div class="sc-dims" aria-label="关键维度">
              <span class="sc-dim">预算</span>
              <span class="sc-dim">行程强度</span>
              <span class="sc-dim">高反风险</span>
            </div>
            <div class="sc-footer">
              <span class="sc-type-label">多因素行程规划</span>
              <span class="sc-enter-hint">进入案例 →</span>
            </div>
          </button>

          <!-- 场景卡二：扫地机（快决策，次卡样式） -->
          <button class="scene-card scene-card--vacuum" data-action="enter-scenario" data-sc="${vacuum.id}" tabindex="0">
            <div class="sc-header">
              <span class="sc-meta-tag sc-meta-tag--quick">${vacuum.meta}</span>
              <span class="sc-count-tag">6 份体验</span>
            </div>
            <h3 class="sc-name">${vacuum.name}</h3>
            <p class="sc-desc">${vacuum.desc}</p>
            <div class="sc-dims" aria-label="关键维度">
              <span class="sc-dim">防缠</span>
              <span class="sc-dim">噪音</span>
              <span class="sc-dim">价格</span>
            </div>
            <div class="sc-footer">
              <span class="sc-type-label sc-type-label--quick">商品条件比较</span>
              <span class="sc-enter-hint">进入案例 →</span>
            </div>
          </button>

        </div>
      </div>

      <!-- ② 机制区：有据如何帮助你做决定 -->
      <section class="home-mechanism" aria-labelledby="mechanism-title">
        <div class="mechanism-header">
          <h2 id="mechanism-title" class="mechanism-title">有据如何帮助你做决定</h2>
          <p class="mechanism-note">以川西案例演示 · 所有材料为原创模拟资料</p>
        </div>
        <div class="mechanism-flow" role="list">
          ${MECHANISM.map((step, i) => `
          <div class="mf-node" role="listitem">
            <div class="mf-no">${step.no}</div>
            <div class="mf-body">
              <b class="mf-title">${step.title}</b>
              <p class="mf-desc">${step.desc}</p>
              <p class="mf-example">${step.example}</p>
            </div>
          </div>${i < MECHANISM.length - 1 ? '<div class="mf-arrow" aria-hidden="true"></div>' : ''}`).join('')}
        </div>
      </section>

      <!-- ③ Footer -->
      <footer class="home-foot">
        <p class="home-foot-disclaimer">健康与安全相关内容仅用于信息整理，不替代专业建议。</p>
        <p class="home-foot-note">演示应用 · 内容检索层可替换为平台搜索、收藏或用户导入数据 · 有据 Grounded Choice</p>
      </footer>

    </div>
  </section>`;
}
