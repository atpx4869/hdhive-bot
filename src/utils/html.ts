/**
 * 统一的 Telegram HTML 转义与渲染助手。
 * 所有把外部数据塞进 parse_mode=HTML 文本里时，都必须先经过 esc()。
 */

export function esc(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 包裹成可一键复制的等宽代码段 */
export function code(value: string | null | undefined): string {
  return `<code>${esc(value)}</code>`;
}

/** 包裹成 spoiler（点击展开） */
export function spoiler(value: string | null | undefined): string {
  return `<tg-spoiler>${esc(value)}</tg-spoiler>`;
}

/** 加粗 */
export function bold(value: string | null | undefined): string {
  return `<b>${esc(value)}</b>`;
}

/** 斜体（常用作弱化的脚注） */
export function italic(value: string | null | undefined): string {
  return `<i>${esc(value)}</i>`;
}

/** 引用块 */
export function quote(value: string | null | undefined): string {
  return `<blockquote>${esc(value)}</blockquote>`;
}

/** 截断长字符串（用于简介/备注的卡片摘要） */
export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}
