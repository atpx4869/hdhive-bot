/**
 * 集中管理 bot 内所有视觉符号，避免 emoji 散落各处。
 * 修改这里即可全局换肤。
 */

export const Icon = {
  // 品牌主色：高级感操作 / 主成功状态
  brand: '💎',

  // 媒体
  movie: '🎬',
  tv: '📺',

  // 网盘
  pan115: '💾',
  panAli: '☁️',
  panOther: '📦',

  // 资源元信息
  size: '📦',
  resolution: '🎞',
  source: '📡',
  subtitle: '🈸',
  unlock: '💰',
  validation: '🔍',
  origin: '🏷',
  users: '👥',
  time: '🕒',
  remark: '📝',
  free: '🆓',

  // 状态
  ok: '✅',
  warn: '⚠️',
  err: '❌',
  block: '⛔',
  battery: '🪫',

  // 操作 / 导航
  refresh: '🔄',
  back: '↩️',
  forward: '🚀',
  search: '🔍',
  help: '❓',
  account: '👤',
  quota: '📊',
  apiKey: '🔐',
  users2: '👥',

  // 加载
  loading: '⏳',
  fetch: '📚',
};

/** 通用细分隔线 */
export const Divider = '─────────────';

/** 在两个块之间换行 + 分隔 */
export function section(): string {
  return `\n${Divider}\n`;
}

/** 弱化的页脚（统一品牌签名） */
export function brandFooter(): string {
  return `\n<i>${Icon.brand} HDHive · 资源搜索机器人</i>`;
}

/** 把 panType 归一化成「图标 + 名称」 */
export function formatPanLabel(panType: string | null | undefined): string {
  if (!panType) return `${Icon.panOther} 未知`;
  const v = panType.toLowerCase();
  if (v === '115') return `${Icon.pan115} 115`;
  if (v.includes('ali')) return `${Icon.panAli} 阿里云`;
  return `${Icon.panOther} ${panType}`;
}

/** 详细版 panType（用于详情页） */
export function formatPanLabelDetail(panType: string | null | undefined): string {
  if (!panType) return `${Icon.panOther} 未知网盘`;
  const v = panType.toLowerCase();
  if (v === '115') return `${Icon.pan115} 115 网盘`;
  if (v.includes('ali')) return `${Icon.panAli} 阿里云盘`;
  return `${Icon.panOther} ${panType}`;
}

/** 把 1/5 渲染成 ●●○○○ 1/5 */
export function paginationBar(page: number, totalPages: number, max = 8): string {
  if (totalPages <= 1) return `${page}/${totalPages}`;
  const filled = '●';
  const empty = '○';
  if (totalPages <= max) {
    const dots = Array.from({ length: totalPages }, (_, i) => (i + 1 === page ? filled : empty)).join('');
    return `${dots}  ${page}/${totalPages}`;
  }
  // 总页较多时省略中段
  const head = page <= 3;
  const tail = page >= totalPages - 2;
  let bar = '';
  if (head) {
    for (let i = 1; i <= 4; i++) bar += i === page ? filled : empty;
    bar += '…' + (totalPages === page ? filled : empty);
  } else if (tail) {
    bar = (page === 1 ? filled : empty) + '…';
    for (let i = totalPages - 3; i <= totalPages; i++) bar += i === page ? filled : empty;
  } else {
    bar = empty + '…' + filled + '…' + empty;
  }
  return `${bar}  ${page}/${totalPages}`;
}
