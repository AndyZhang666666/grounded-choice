// views/import.js — 第一步 · 导入经验（资料桌）
// 自由输入入口为开发保留（state.importMode），不在 Demo 主路径暴露。
import { getScenario } from '../scenarios/index.js';
import { icon } from '../ui.js';

export function renderImport(state) {
  const sc = getScenario(state.scenarioId);
  const total = sc.mats.length;
  const count = state.selected.size;
  const canAnalyze = count > 0;
  const hint = count > 0 ? `已选择 ${count} / ${total} 份材料` : '至少保留一份材料才能开始分析';

  return `
  <section class="view import">
    <div class="wrap">
      <div class="page-head">
        <p class="kicker">第一步 · 导入经验 · ${sc.shortName}</p>
        <h2>这次决策的全部材料</h2>
        <p class="page-sub">${total} 份演示用模拟资料 · 点击卡片可取消选择，取消后不参与分析</p>
      </div>
      <div class="import-layout">
        <div class="materials">
          <div class="materials-bar">
            <span class="materials-count">经验材料 <b>${count}</b> / ${total}</span>
            <span class="materials-tools">
              <button class="link-btn" data-action="select-all">全选</button><i>·</i>
              <button class="link-btn" data-action="select-none">清空</button>
            </span>
          </div>
          ${count === 0 ? `
          <div class="empty-state">
            ${icon('doc')}
            <p>已取消全部材料。<br>至少保留一份，才能开始分析。</p>
          </div>` : ''}
          <div class="material-list">
            ${sc.mats.map((m) => `
            <article class="material ${state.selected.has(m.id) ? 'sel' : ''}" data-action="toggle-material" data-id="${m.id}">
              <span class="m-check">${icon('check')}</span>
              <div class="m-body">
                <div class="m-meta">
                  <span class="m-type">${m.tag}${m.commercial ? ' · 可能含商业合作' : ''}</span>
                  <span class="m-time">${m.time}</span>
                </div>
                <h3 class="m-title">${m.title}</h3>
                <p class="m-summary">${m.summary}</p>
                <p class="m-traits">${m.traits.join(' · ')}</p>
              </div>
            </article>`).join('')}
          </div>
        </div>

        <aside class="goal-panel">
          <div class="goal-card">
            <p class="panel-kicker">本次决策目标</p>
            <p class="goal-text">${sc.goalHtml}</p>
          </div>
          <button class="btn btn-primary btn-block" data-action="analyze" ${canAnalyze ? '' : 'disabled'}>开始分析</button>
          <p class="analyze-hint ${canAnalyze ? '' : 'warn'}" id="analyze-hint">${hint}</p>
          <button class="back-link" data-action="back">${icon('arrow', 'flip')} 返回首页</button>
        </aside>
      </div>
    </div>
  </section>`;
}
