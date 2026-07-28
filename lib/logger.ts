import type { AppLogger } from './logger.types';

export type { AppLogger } from './logger.types';

const createClientLogger = (bindings: Record<string, unknown> = {}): AppLogger => {
  const discard = (..._entries: unknown[]) => undefined;

  return {
    info: discard,
    warn: discard,
    error: discard,
    debug: discard,
    phase: discard,
    child: (newBindings) => createClientLogger({ ...bindings, ...newBindings }),
  };
};

export const logger = createClientLogger();
