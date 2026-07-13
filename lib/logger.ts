import pino, { Logger as PinoLogger } from "pino";
import { logger as triggerLogger } from "@trigger.dev/sdk/v3";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Configure Pino for standard environments (Next.js server/API)
 */
const rootPino = isProduction
  ? pino({
    level: "info",
    base: { env: process.env.NODE_ENV },
    // Minimal properties for structured logging
    timestamp: pino.stdTimeFunctions.isoTime,
  })
  : pino({
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        ignore: 'pid,hostname',
      },
    },
    level: "debug",
  });

export interface AppLogger {
  info: (msg: string, data?: any, thirdPartyRuntime?: boolean) => void;
  warn: (msg: string, data?: any, thirdPartyRuntime?: boolean) => void;
  error: (msg: string, data?: any, thirdPartyRuntime?: boolean) => void;
  debug: (msg: string, data?: any, thirdPartyRuntime?: boolean) => void;
  phase: (phase: string, message: string, thirdPartyRuntime?: boolean) => void;
  child: (bindings: any) => AppLogger;
}

/**
 * Factory to create a logger instance that handles both Pino and Trigger.dev
 */
const createLoggerInstance = (pino: PinoLogger, bindings: any = {}): AppLogger => {
  const formatData = (data: any) => {
    if (data instanceof Error) {
      return { err: data };
    }
    if (data && typeof data === 'object' && 'error' in data && data.error instanceof Error) {
      return { ...data, err: data.error };
    }
    return data;
  };

  return {
    info: (msg, data, thirdPartyRuntime = false) => {
      const formattedData = formatData(data);
      const mergedData = { ...bindings, ...formattedData };
      if (thirdPartyRuntime) {
        triggerLogger.info(msg, mergedData);
      } else {
        pino.info(mergedData, msg);
      }
    },
    warn: (msg, data, thirdPartyRuntime = false) => {
      const formattedData = formatData(data);
      const mergedData = { ...bindings, ...formattedData };
      if (thirdPartyRuntime) {
        triggerLogger.warn(msg, mergedData);
      } else {
        pino.warn(mergedData, msg);
      }
    },
    error: (msg, data, thirdPartyRuntime = false) => {
      const formattedData = formatData(data);
      const mergedData = { ...bindings, ...formattedData };
      if (thirdPartyRuntime) {
        triggerLogger.error(msg, mergedData);
      } else {
        pino.error(mergedData, msg);
      }
    },
    debug: (msg, data, thirdPartyRuntime = false) => {
      const formattedData = formatData(data);
      const mergedData = { ...bindings, ...formattedData };
      if (thirdPartyRuntime) {
        if (typeof (triggerLogger as any).debug === 'function') {
          (triggerLogger as any).debug(msg, mergedData);
        } else {
          triggerLogger.log(msg, mergedData);
        }
      } else {
        pino.debug(mergedData, msg);
      }
    },
    phase: (phase, message, thirdPartyRuntime = false) => {
      const formatted = `>>> [${phase.toUpperCase()}] ${message}`;
      const mergedData = { ...bindings, phase };
      if (thirdPartyRuntime) {
        triggerLogger.log(formatted, mergedData);
      } else {
        pino.info(mergedData, formatted);
      }
    },
    child: (newBindings) => createLoggerInstance(pino.child(newBindings), { ...bindings, ...newBindings }),
  };
};

/**
 * Unified logger utility with support for structured logging, child loggers, and Trigger.dev.
 */
export const logger = createLoggerInstance(rootPino);
