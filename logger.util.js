import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { env } from 'node:process';
import fs from 'node:fs';
import path from 'node:path';

const LOG_DIR = env.LOG_DIR || 'logs';
const LOG_DEFAULT_LEVEL = env.LOG_DEFAULT_LEVEL || 'info';
const LOG_FILENAME_PATTERN = env.LOG_FILENAME_PATTERN || '%DATE%-service.log';
const LOG_DATE_PATTERN = env.LOG_DATE_PATTERN || 'YYYY-MM-DD';
const LOG_MAX_SIZE = env.LOG_MAX_SIZE || '20m';
const LOG_MAX_FILES = env.LOG_MAX_FILES || '14d';

const logDirPath = path.resolve(LOG_DIR);

if (!fs.existsSync(logDirPath)) {
  try {
    fs.mkdirSync(logDirPath, { recursive: true });
    console.log(`Log directory created: ${logDirPath}`);
  } catch (error) {
    console.error(`Error creating log directory ${logDirPath}:`, error);
  }
}

/**
 * Creates a Winston logger instance configured for the application.
 * Uses environment variables for configuration overrides.
 * Includes console transport and daily rotating file transport.
 *
 * @module logger
 * @param {string} label - A label to identify the source of the log messages.
 * @returns {winston.Logger} Configured Winston logger instance.
 */
export default (label = 'app') => {
  const serviceLogLevel = env[`LOG_LEVEL_${label.toUpperCase()}`] || LOG_DEFAULT_LEVEL;

  const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  );

  const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf((data) => `[${data.timestamp}][${label}] (${data.level}): ${data.message}`)
  );

  const transports = [
    new winston.transports.Console({
      format: consoleFormat,
      level: serviceLogLevel,
      handleExceptions: true,
    }),
  ];

  if (fs.existsSync(logDirPath)) {
    transports.push(
      new DailyRotateFile({
        level: serviceLogLevel,
        dirname: logDirPath,
        filename: LOG_FILENAME_PATTERN.replace('%DATE%', label + '-%DATE%'),
        datePattern: LOG_DATE_PATTERN,
        zippedArchive: true,
        maxSize: LOG_MAX_SIZE,
        maxFiles: LOG_MAX_FILES,
        format: fileFormat,
        handleExceptions: true,
        handleRejections: true,
      })
    );
  } else {
     console.error(`Log directory ${logDirPath} not accessible. File logging disabled.`);
  }


  const logger = winston.createLogger({
    level: serviceLogLevel,
    format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.timestamp(),
        winston.format.json(),
    ),
    transports: transports,
    exitOnError: false,
  });

  logger.transports.forEach(transport => {
    transport.on('error', error => {
      console.error(`Error occurred in logger transport ${transport.name}:`, error);
    });
  });

  return logger;
};
