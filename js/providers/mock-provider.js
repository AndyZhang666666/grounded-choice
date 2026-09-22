// mock-provider.js — 演示用模拟数据源
// 当前 Demo 的唯一数据源：内置两个场景的演示用模拟材料。
// 不发起任何网络请求，不包含任何真实用户内容或外部链接。

import { getScenario } from '../scenarios/index.js';
import { createProvider } from './content-provider.js';

let currentId = 'travel';

// 切换当前场景的数据源（由 app.js 在进入场景时调用）
export function setScenario(id) {
  currentId = id;
}

function data() {
  return getScenario(currentId);
}

export const provider = createProvider({
  getMaterials() {
    return data().mats;
  },

  searchMaterials(query) {
    const q = String(query || '').trim();
    const mats = data().mats;
    if (!q) return mats;
    return mats.filter((m) =>
      [m.title, m.summary, m.tag, ...(m.traits || [])].some((t) => t.includes(q))
    );
  },

  getMaterialDetail(id) {
    return data().mats.find((m) => m.id === id) || null;
  },

  getExcerpt(id, sentence) {
    const m = this.getMaterialDetail(id);
    if (!m) return null;
    // 模拟数据中，“原文片段”即摘要内的相关句子
    const s = sentence || m.summary.slice(0, 40);
    return { sentence: s, context: m.summary };
  },

  getPublishTime(id) {
    return this.getMaterialDetail(id)?.time || '时间未知';
  },

  getSourceInfo(id) {
    const m = this.getMaterialDetail(id);
    return m ? { byline: m.byline, platform: '演示数据' } : null;
  },

  getCommercialFlag(id) {
    return Boolean(this.getMaterialDetail(id)?.commercial);
  },

  getContentLink() {
    // 演示用模拟资料不提供外链；接入真实平台后返回原内容地址
    return null;
  },
}, 'mock-provider');
