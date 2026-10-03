export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  organizationId?: string;
  route?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export class Logger {
  private serviceName: string;

  constructor(serviceName: string = 'metameet-backend') {
    this.serviceName = serviceName;
  }

  private sanitize(data?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!data) return undefined;
    const sanitized = { ...data };
    const forbiddenKeys = ['password', 'secret', 'token', 'signatureData', 'rawKey', 'cookie'];

    for (const key of Object.keys(sanitized)) {
      if (forbiddenKeys.some(forbidden => key.toLowerCase().includes(forbidden))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    return sanitized;
  }

  private log(level: LogLevel, message: string, meta?: Partial<StructuredLog>) {
    const entry: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: meta?.requestId,
      userId: meta?.userId,
      organizationId: meta?.organizationId,
      route: meta?.route,
      durationMs: meta?.durationMs,
      metadata: this.sanitize(meta?.metadata),
    };

    const formatted = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${this.serviceName}] ${entry.message} ${
      entry.route ? `(${entry.route} ${entry.durationMs ?? 0}ms)` : ''
    }`;

    if (level === 'error') {
      console.error(formatted, entry.metadata || '');
    } else if (level === 'warn') {
      console.warn(formatted, entry.metadata || '');
    } else {
      console.log(formatted, entry.metadata || '');
    }
  }

  info(msg: string, meta?: Partial<StructuredLog>) {
    this.log('info', msg, meta);
  }

  warn(msg: string, meta?: Partial<StructuredLog>) {
    this.log('warn', msg, meta);
  }

  error(msg: string, meta?: Partial<StructuredLog>) {
    this.log('error', msg, meta);
  }

  debug(msg: string, meta?: Partial<StructuredLog>) {
    this.log('debug', msg, meta);
  }
}

export const logger = new Logger('metameet-server');
