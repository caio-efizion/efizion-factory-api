"use strict";
// src/utils/constants.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCKER_COMPOSE_FILE = exports.TASK_RUNNER_COMMAND = exports.LOGGER_OPTIONS = exports.HEALTH_CHECK_ROUTE = exports.SWAGGER_OPTIONS = exports.DATABASE_URL = exports.API_KEY = void 0;
// Constants for the application
// API Key for authentication
exports.API_KEY = process.env.API_KEY || 'default-api-key';
// Database connection URL
exports.DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';
// Swagger options
exports.SWAGGER_OPTIONS = {
    routePrefix: '/documentation',
    swagger: {
        info: {
            title: 'Task API',
            description: 'API documentation for the Task management system',
            version: '1.0.0',
        },
        externalDocs: {
            url: 'https://swagger.io',
            description: 'Find more info here',
        },
        host: 'localhost',
        schemes: ['http'],
        consumes: ['application/json'],
        produces: ['application/json'],
    },
    exposeRoute: true,
};
// Health check endpoint
exports.HEALTH_CHECK_ROUTE = '/health';
// Logger configuration
exports.LOGGER_OPTIONS = {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.NODE_ENV !== 'production',
};
// Task runner command
exports.TASK_RUNNER_COMMAND = 'efizion-agent-runner';
// Docker-related constants
exports.DOCKER_COMPOSE_FILE = 'docker-compose.yml';
