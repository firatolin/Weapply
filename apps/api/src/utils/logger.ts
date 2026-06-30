import { config } from '../config/index.js';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export class Logger {
  private static instance: Logger;
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  info(message: string, meta?: any): void {
    console.log(this.formatMessage('info', message, meta));
  }

  warn(message: string, meta?: any): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  error(message: string, error?: any, meta?: any): void {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      ...meta
    } : meta;
    console.error(this.formatMessage('error', message, errorDetails));
  }

  debug(message: string, meta?: any): void {
    if (config.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }
}

export const logger = Logger.getInstance();
