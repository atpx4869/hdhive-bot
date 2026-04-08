export function formatResolution(values: string[]): string {
  return values.join(' / ') || '未知';
}

export function formatSource(values: string[]): string {
  return values.join(' / ') || '未知';
}

export function formatShareSize(value: string | null | undefined): string {
  if (!value) return '未知';
  const raw = String(value).trim();
  if (!raw) return '未知';

  // 已带常见单位时直接规范空格
  if (/[kKmMgGtTpP][bB]?$/u.test(raw)) {
    return raw
      .replace(/\s+/g, '')
      .replace(/([0-9.]+)([kKmMgGtTpP])([bB]?)/u, (_, num, unit, b) => `${num} ${String(unit).toUpperCase()}${b ? 'B' : 'B'}`);
  }

  // 纯数字默认补 GB
  if (/^[0-9]+(\.[0-9]+)?$/u.test(raw)) {
    return `${raw} GB`;
  }

  return raw;
}

export function formatSubtitle(languages: string[], types: string[]): string {
  const parts: string[] = [];
  if (languages.length) parts.push(languages.join(' / '));
  if (types.length) parts.push(types.join(' / '));
  return parts.join(' | ') || '无字幕';
}

export function formatUnlockText(isUnlocked: boolean, unlockPoints: number | null): string {
  if (isUnlocked) return '🔓 已解锁';
  if (!unlockPoints || unlockPoints === 0) return '🆓 免费';
  return `🔒 ${unlockPoints}积分`;
}

export function formatValidationText(status: string | null | undefined): string {
  switch (status) {
    case 'valid':    return '✅ 可用';
    case 'invalid':  return '❌ 已失效';
    case 'error':    return '⚠️ 验证出错';
    case 'checking': return '⏳ 检测中';
    default:         return '❔ 未检测';
  }
}

export function formatOriginText(isOfficial: boolean | null | undefined): string {
  if (isOfficial === true) return '🏛 官方';
  if (isOfficial === false) return '👤 用户分享';
  return '👤 用户分享';
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '未知';
  try {
    return new Date(iso).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  } catch {
    return iso;
  }
}

export function formatVipText(isVip: boolean, expirationDate?: string): string {
  if (!isVip) return '普通用户';
  if (!expirationDate) return 'VIP';
  const exp = new Date(expirationDate);
  const twentyYearsLater = new Date();
  twentyYearsLater.setFullYear(twentyYearsLater.getFullYear() + 20);
  if (exp > twentyYearsLater) return '永久 VIP';
  return `VIP（到期：${formatDate(expirationDate)}）`;
}
