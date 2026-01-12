"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logTokenGeneration = logTokenGeneration;
exports.logTokenUsage = logTokenUsage;
exports.logTokenValidation = logTokenValidation;
const pino_1 = __importDefault(require("pino"));
// Create a logger instance with structured logging
const logger = (0, pino_1.default)({
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
function logTokenGeneration(tokenId) {
    logger.info(`Token generated with ID: ${tokenId}`);
}
/**
 * Logs the usage of a token.
 * @param {string} tokenId - The ID of the token being used.
 * @param {string} endpoint - The endpoint where the token is being used.
 */
function logTokenUsage(tokenId, endpoint) {
    logger.info(`Token with ID: ${tokenId} used at endpoint: ${endpoint}`);
}
/**
 * Logs the validation of a token.
 * @param {string} tokenId - The ID of the token being validated.
 * @param {boolean} isValid - The result of the validation.
 */
function logTokenValidation(tokenId, isValid) {
    if (isValid) {
        logger.info(`Token with ID: ${tokenId} is valid.`);
    }
    else {
        logger.warn(`Token with ID: ${tokenId} is invalid.`);
    }
}
exports.default = logger;
