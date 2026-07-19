import type { AppLogger } from './logger.types';

export type { AppLogger } from './logger.types';

type ClientLogLevel = 'debug' | 'info' | 'warn' | 'error';
const recentDebugLogs = new Map<string, number>();

const normalizeClientData = (data: unknown): Record<string, unknown> => {
  if (data instanceof Error) {
    return { error: { name: data.name, message: data.message, stack: data.stack } };
  }
  if (data && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value instanceof Error
          ? { name: value.name, message: value.message, stack: value.stack }
          : value,
      ]),
    );
  }
  return data === undefined ? {} : { value: data };
};

const sendClientLog = (
  level: ClientLogLevel,
  message: string,
  attributes: Record<string, unknown>,
) => {
  if (typeof window === 'undefined') return;

  const payload = { level, message, ...attributes };
  if (level === 'debug') {
    const key = JSON.stringify(payload);
    const now = Date.now();
    const lastSentAt = recentDebugLogs.get(key) ?? 0;
    if (now - lastSentAt < 2_000) return;
    recentDebugLogs.set(key, now);
  }

  void fetch('/api/log/client', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
};

const createClientLogger = (bindings: Record<string, unknown> = {}): AppLogger => {
  const write = (level: ClientLogLevel, message: string, data: unknown, action: string) => {
    sendClientLog(level, message, {
      userId: 'unknown',
      action,
      ...bindings,
      ...normalizeClientData(data),
    });
  };

  return {
    info: (message, data) => write('info', message, data, 'log_info'),
    warn: (message, data) => write('warn', message, data, 'log_warning'),
    error: (message, data) => write('error', message, data, 'log_error'),
    debug: (message, data) => write('debug', message, data, 'log_debug'),
    phase: (phase, message) => write(
      'info',
      `>>> [${phase.toUpperCase()}] ${message}`,
      { phase },
      `phase_${phase}`,
    ),
    child: (newBindings) => createClientLogger({ ...bindings, ...newBindings }),
  };
};

export const logger = createClientLogger();
