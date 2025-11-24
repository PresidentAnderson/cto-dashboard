/**
 * Centralized Logger for CTO Dashboard
 *
 * Provides structured logging with different levels for
 * development and production environments.
 */

import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define which logs to print based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console(),
  // Error log file
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  // All logs file
  new winston.transports.File({ filename: 'logs/combined.log' }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

/**
 * Structured logging helpers for specific contexts
 */
export const loggers = {
  csvIngestion: (message: string, metadata?: any) => {
    logger.info(`[CSV Ingestion] ${message}`, metadata);
  },

  githubSync: (message: string, metadata?: any) => {
    logger.info(`[GitHub Sync] ${message}`, metadata);
  },

  manualEntry: (message: string, metadata?: any) => {
    logger.info(`[Manual Entry] ${message}`, metadata);
  },

  pipelineOrchestrator: (message: string, metadata?: any) => {
    logger.info(`[Pipeline] ${message}`, metadata);
  },

  error: (context: string, error: Error, metadata?: any) => {
    logger.error(`[${context}] ${error.message}`, {
      error: error.stack,
      ...metadata,
    });
  },

  warn: (context: string, message: string, metadata?: any) => {
    logger.warn(`[${context}] ${message}`, metadata);
  },

  debug: (context: string, message: string, metadata?: any) => {
    logger.debug(`[${context}] ${message}`, metadata);
  },
};

export default logger;
