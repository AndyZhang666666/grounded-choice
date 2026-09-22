// internal-provider.example.js — 平台数据源接入示例（占位，不参与运行）
//
// 目标：把演示数据源替换为内容平台的真实检索能力，例如：
//   - 用户在平台内搜索/收藏的笔记、攻略、测评
//   - 用户主动导入的资料
//
// 本文件只定义接口形状与接入说明，不包含任何真实接口地址、
// 密钥或认证信息。接入时由服务端代理请求，前端不持有凭证。
//
// 接入步骤建议：
//   1. 服务端实现同形状接口（鉴权、限流、脱敏在服务端完成）
//   2. 前端将 mock-provider 替换为本实现的远程版本
//   3. 商业内容标记与原文片段由平台侧随材料一并返回
//   4. 分析引擎无需改动——它只依赖 provider 的返回结构

import { PROVIDER_METHODS } from './content-provider.js';

export class InternalProviderExample {
  constructor() {
    // 例如：由服务端注入的会话上下文（不要在前端存放密钥）
    this.ready = false;
  }

  // 占位实现：所有方法显式抛出，避免被误用为可用数据源
  _notImplemented(method) {
    throw new Error(`[internal-provider] “${method}” 未实现——此文件仅为接口占位示例。`);
  }
}

PROVIDER_METHODS.forEach((m) => {
  InternalProviderExample.prototype[m] = function () {
    this._notImplemented(m);
  };
});
