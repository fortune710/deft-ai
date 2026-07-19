export interface AppLogger {
  info: (msg: string, data?: unknown, thirdPartyRuntime?: boolean) => void;
  warn: (msg: string, data?: unknown, thirdPartyRuntime?: boolean) => void;
  error: (msg: string, data?: unknown, thirdPartyRuntime?: boolean) => void;
  debug: (msg: string, data?: unknown, thirdPartyRuntime?: boolean) => void;
  phase: (phase: string, message: string, thirdPartyRuntime?: boolean) => void;
  child: (bindings: Record<string, unknown>) => AppLogger;
}
