export const errorTemplate = {
  noPermission() {
    return '你暂无权限使用此机器人。\n如需开通，请联系管理员。';
  },
  adminOnly() {
    return '⛔ 你没有权限使用此功能。';
  },
  privateUnlockOnly() {
    return '请私聊机器人解锁资源。';
  },
  noKeyword() {
    return '请输入要搜索的关键词。\n\n示例：\nFight Club\n仙逆';
  },
  noCandidate() {
    return '未找到相关影视条目，请换个关键词试试。\n\n你也可以：\n1. 简化关键词\n2. 试试原名 / 英文名\n3. 发送 /help 查看示例';
  },
  tmdbUnavailable() {
    return '影视信息检索失败，请稍后重试。';
  },
  hdhiveUnavailable() {
    return '资源列表获取失败，请稍后重试。';
  },
  resourceClassifyTimeout() {
    return '网盘类型识别较慢，已先返回当前可识别结果。可稍后翻页重试。';
  },
  noResource() {
    return '已找到影视条目，但当前暂无可用资源。\n\n你可以：\n1. 返回选择其他候选条目\n2. 稍后再试';
  },
  invalidCandidateSelection() {
    return '当前候选条目不存在，请重新选择。';
  },
  invalidResourceSelection() {
    return '当前资源条目不存在，请返回列表后重新选择。';
  },
  sessionExpired() {
    return '会话已过期，请重新搜索。\n\n可发送 /search 关键词 重新开始，或发送 /help 查看示例。';
  },
  generic() {
    return '服务暂时不可用，请稍后再试。';
  },
  badParam(example: string) {
    return `参数错误。\n\n示例：\n${example}`;
  },
};
