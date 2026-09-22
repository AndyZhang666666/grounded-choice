// content-provider.js — 内容数据源接口契约
// 有据的结论全部来自“材料”。材料从哪来（平台搜索、收藏夹、用户导入、演示数据）
// 由 provider 决定，页面与分析引擎不关心具体来源。
//
// 实现方需提供以下方法（全部同步或返回 Promise 均可，演示实现为同步）：
//   getMaterials()                 -> Material[]          场景材料列表
//   searchMaterials(query)         -> Material[]          按标题/摘要/类型搜索
//   getMaterialDetail(id)          -> Material | null     材料详情
//   getExcerpt(id)                 -> { sentence, context } | null   原文片段（支撑结论的句子）
//   getPublishTime(id)             -> string              发布时间
//   getSourceInfo(id)              -> { byline, platform } 来源信息
//   getCommercialFlag(id)          -> boolean             是否可能含商业合作
//   getContentLink(id)             -> string | null       原内容链接（模拟数据为 null）
//
// Material 结构见 data.js：{ id, tag, byline, commercial, title, time, traits, summary }

export const PROVIDER_METHODS = [
  'getMaterials',
  'searchMaterials',
  'getMaterialDetail',
  'getExcerpt',
  'getPublishTime',
  'getSourceInfo',
  'getCommercialFlag',
  'getContentLink',
];

export function createProvider(impl, name = 'provider') {
  const missing = PROVIDER_METHODS.filter((m) => typeof impl[m] !== 'function');
  if (missing.length) {
    throw new Error(`[有据] 数据源 ${name} 缺少接口: ${missing.join(', ')}`);
  }
  return impl;
}
