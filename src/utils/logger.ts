import pino from 'pino';

// Create a logger instance with structured logging
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

/**
 * Logs the generation of a token.
 * @param {string} tokenId - The ID of the token being generated.
 */
export function logTokenGeneration(tokenId: string) {
  logger.info(`Token generated with ID: ${tokenId}`);
}

/**
 * Logs the usage of a token.
 * @param {string} tokenId - The ID of the token being used.
 * @param {string} endpoint - The endpoint where the token is being used.
 */
export function logTokenUsage(tokenId: string, endpoint: string) {
  logger.info(`Token with ID: ${tokenId} used at endpoint: ${endpoint}`);
}

/**
 * Logs the validation of a token.
 * @param {string} tokenId - The ID of the token being validated.
 * @param {boolean} isValid - The result of the validation.
 */
export function logTokenValidation(tokenId: string, isValid: boolean) {
  if (isValid) {
    logger.info(`Token with ID: ${tokenId} is valid.`);
  } else {
    logger.warn(`Token with ID: ${tokenId} is invalid.`);
  }
}

export default logger;