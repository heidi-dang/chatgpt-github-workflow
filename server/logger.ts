/**
 * High-frequency logger that uses process.stdout.write directly to minimize
 * formatting overhead.
 */
export function fastLog(message: string): void {
  process.stdout.write(`${message}\n`);
}

/**
 * Standard logger with levels and timestamps.
 */
export const logger = {
  info: (msg: string) => {
    process.stdout.write(`${new Date().toISOString()} [INFO] ${msg}\n`);
  },
  warn: (msg: string) => {
    process.stdout.write(`${new Date().toISOString()} [WARN] ${msg}\n`);
  },
  error: (msg: string, error?: any) => {
    let errorDetail = "";
    if (error) {
      if (error instanceof Error) {
        errorDetail = ` - ${error.stack || error.message}`;
      } else if (typeof error === 'object') {
        try {
          // Avoid circular structures and keep it readable
          errorDetail = ` - ${JSON.stringify(error)}`;
        } catch {
          errorDetail = ` - ${String(error)}`;
        }
      } else {
        errorDetail = ` - ${String(error)}`;
      }
    }
    process.stderr.write(`${new Date().toISOString()} [ERROR] ${msg}${errorDetail}\n`);
  }
};
