type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function timestamp(): string {
  return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

function write(level: LogLevel, module: string, msg: string, extra?: unknown): void {
  const prefix = `[${timestamp()}] [${level}] [${module}]`;
  if (extra !== undefined) {
    console.log(`${prefix} ${msg}`, extra);
  } else {
    console.log(`${prefix} ${msg}`);
  }
}

export const logger = {
  info: (module: string, msg: string, extra?: unknown) => write('INFO', module, msg, extra),
  warn: (module: string, msg: string, extra?: unknown) => write('WARN', module, msg, extra),
  error: (module: string, msg: string, extra?: unknown) => write('ERROR', module, msg, extra),
  debug: (module: string, msg: string, extra?: unknown) => write('DEBUG', module, msg, extra),
};
