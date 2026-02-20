/**
 * Structured logger for WikiPortraits.
 *
 * In development, logs go to the console. In production, only warnings
 * and errors are emitted, keeping browser/server output clean.
 *
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.info('MyComponent', 'Loaded entity', { id });
 *   logger.error('UploadPane', 'Upload failed', error);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): number {
  if (typeof window !== 'undefined') {
    // Client-side
    return process.env.NODE_ENV === 'production' ? LOG_LEVELS.warn : LOG_LEVELS.debug;
  }
  // Server-side
  return process.env.NODE_ENV === 'production' ? LOG_LEVELS.warn : LOG_LEVELS.debug;
}

function formatMessage(level: LogLevel, context: string, message: string): string {
  return `[${level.toUpperCase()}] [${context}] ${message}`;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= getMinLevel();
}

export const logger = {
  debug(context: string, message: string, ...data: unknown[]) {
    if (!shouldLog('debug')) return;
    console.debug(formatMessage('debug', context, message), ...data);
  },

  info(context: string, message: string, ...data: unknown[]) {
    if (!shouldLog('info')) return;
    console.info(formatMessage('info', context, message), ...data);
  },

  warn(context: string, message: string, ...data: unknown[]) {
    if (!shouldLog('warn')) return;
    console.warn(formatMessage('warn', context, message), ...data);
  },

  error(context: string, message: string, ...data: unknown[]) {
    if (!shouldLog('error')) return;
    console.error(formatMessage('error', context, message), ...data);
  },
};
