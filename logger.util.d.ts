import { Logger } from 'winston';

declare module './logger.util.js' {
  /**
   * Creates a Winston logger instance configured for the application.
   *
   * @param {string} [label='app'] - An optional label to identify the source of the log messages (e.g., 'data-fetcher'). Defaults to 'app'.
   * @returns {Logger} Configured Winston logger instance.
   */
  export default function createLogger(label?: string): Logger;
}
