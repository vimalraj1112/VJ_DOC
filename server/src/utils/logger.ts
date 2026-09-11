/* Tiny dependency-free logger so we control exactly what reaches stdout. */

const colours = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
} as const;

function timestamp(): string {
  return new Date().toISOString().slice(11, 19);
}

function write(colour: string, tag: string, args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log(`${colours.dim}${timestamp()}${colours.reset} ${colour}${tag}${colours.reset}`, ...args);
}

export const logger = {
  info: (...args: unknown[]) => write(colours.blue, 'info ', args),
  success: (...args: unknown[]) => write(colours.green, 'ready', args),
  warn: (...args: unknown[]) => write(colours.yellow, 'warn ', args),
  error: (...args: unknown[]) => write(colours.red, 'error', args),
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') write(colours.magenta, 'debug', args);
  },
  job: (...args: unknown[]) => write(colours.cyan, 'job  ', args),
};
