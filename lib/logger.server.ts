import "server-only";

import { logger as triggerLogger } from "@trigger.dev/sdk/v3";
import type { AppLogger } from './logger.types';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const serializeError = (error: Error) => ({
  name: error.name,
  message: error.message,
  stack: error.stack,
  ...(error.cause === undefined ? {} : { cause: error.cause }),
});

const toSerializable = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (value instanceof Error) return serializeError(value);
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';

  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((entry) => toSerializable(entry, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, toSerializable(entry, seen)]),
  );
};

const writeLocalLog = (
  level: LogLevel,
  message: string,
  attributes: Record<string, unknown>,
) => {
  const record = {
    time: new Date().toISOString(),
    level,
    message,
    ...toSerializable(attributes) as Record<string, unknown>,
  };
  const line = `${JSON.stringify(record)}\n`;

  if (level === 'error' || level === 'warn') {
    process.stderr.write(line);
    return;
  }
  process.stdout.write(line);
};

const writeTriggerLog = (
  level: LogLevel,
  message: string,
  attributes: Record<string, unknown>,
) => {
  if (level === 'debug') {
    if (typeof (triggerLogger as { debug?: unknown }).debug === 'function') {
      (triggerLogger as { debug: (msg: string, data: Record<string, unknown>) => void })
        .debug(message, attributes);
      return;
    }
    triggerLogger.log(message, attributes);
    return;
  }

  triggerLogger[level](message, attributes);
};

const createLoggerInstance = (bindings: Record<string, unknown> = {}): AppLogger => {
  const formatData = (data: unknown): Record<string, unknown> => {
    if (data instanceof Error) {
      return { error: data, errorMessage: data.message };
    }
    if (data && typeof data === "object" && "error" in data && data.error instanceof Error) {
      return { ...data, errorMessage: data.error.message };
    }
    if (data && typeof data === "object") {
      return data as Record<string, unknown>;
    }
    return data === undefined ? {} : { value: data };
  };

  const mergeData = (data: unknown, action: string) => ({
    userId: "unknown",
    action,
    ...bindings,
    ...formatData(data),
  });

  const write = (
    level: LogLevel,
    message: string,
    data: unknown,
    action: string,
    thirdPartyRuntime = false,
  ) => {
    const attributes = mergeData(data, action);
    if (thirdPartyRuntime) {
      writeTriggerLog(level, message, attributes);
      return;
    }
    writeLocalLog(level, message, attributes);
  };

  return {
    info: (msg, data, thirdPartyRuntime) => {
      write('info', msg, data, 'log_info', thirdPartyRuntime);
    },
    warn: (msg, data, thirdPartyRuntime) => {
      write('warn', msg, data, 'log_warning', thirdPartyRuntime);
    },
    error: (msg, data, thirdPartyRuntime) => {
      write('error', msg, data, 'log_error', thirdPartyRuntime);
    },
    debug: (msg, data, thirdPartyRuntime) => {
      write('debug', msg, data, 'log_debug', thirdPartyRuntime);
    },
    phase: (phase, message, thirdPartyRuntime) => {
      const formatted = `>>> [${phase.toUpperCase()}] ${message}`;
      write('info', formatted, { phase }, `phase_${phase}`, thirdPartyRuntime);
    },
    child: (newBindings) =>
      createLoggerInstance({ ...bindings, ...newBindings }),
  };
};

export const logger = createLoggerInstance();
