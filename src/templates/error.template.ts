import { Icon } from './icons.js';

export const errorTemplate = {
  noPermission() {
    return `${Icon.warn} 你暂无权限使用此机器人。\n如需开通，请联系管理员。`;
  },
  adminOnly() {
    return `${Icon.block} 你没有权限使用此功能。`;
  },
  privateUnlockOnly() {
    return `${Icon.warn} 请私聊机器人解锁资源。`;
  },
  noKeyword() {
    return `${Icon.search} 请输入要搜索的关键词。\n\n示例：\n· Fight Club\n· 仙逆`;
  },
  noCandidate() {
    return [
      `${Icon.warn} 未找到相关影视条目`,
      '',
      '你可以试试：',
      '· 简化关键词',
      '· 试试原名 / 英文名',
      '· 发送 /help 查看示例',
    ].join('\n');
  },
  tmdbUnavailable() {
    return `${Icon.err} 影视信息检索失败\n请稍后重试。`;
  },
  hdhiveUnavailable() {
    return `${Icon.err} 资源列表获取失败\n请稍后重试。`;
  },
  resourceClassifyTimeout() {
    return `${Icon.warn} 网盘类型识别较慢，已先返回当前可识别结果。可稍后翻页重试。`;
  },
  noResource() {
    return [
      `${Icon.warn} 已找到影视条目，但当前暂无可用资源`,
      '',
      '你可以：',
      '· 返回选择其他候选条目',
      '· 稍后再试',
    ].join('\n');
  },
  invalidCandidateSelection() {
    return `${Icon.warn} 当前候选条目不存在，请重新选择。`;
  },
  invalidResourceSelection() {
    return `${Icon.warn} 当前资源条目不存在，请返回列表后重新选择。`;
  },
  sessionExpired() {
    return [
      `${Icon.warn} 会话已过期`,
      '',
      '可发送 /search 关键词 重新开始，或发送 /help 查看示例。',
    ].join('\n');
  },
  generic() {
    return `${Icon.err} 服务暂时不可用，请稍后再试。`;
  },
  badParam(example: string) {
    return `${Icon.warn} 参数错误。\n\n示例：\n${example}`;
  },
};
