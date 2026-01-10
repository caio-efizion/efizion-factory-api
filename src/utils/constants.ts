// src/utils/constants.ts

// Constants for the application

// API Key for authentication
export const API_KEY = process.env.API_KEY || 'default-api-key';

// Database connection URL
export const DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';

// Swagger options
export const SWAGGER_OPTIONS = {
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
export const HEALTH_CHECK_ROUTE = '/health';

// Logger configuration
export const LOGGER_OPTIONS = {
  level: process.env.LOG_LEVEL || 'info',
  prettyPrint: process.env.NODE_ENV !== 'production',
};

// Task runner command
export const TASK_RUNNER_COMMAND = 'efizion-agent-runner';

// Docker-related constants
export const DOCKER_COMPOSE_FILE = 'docker-compose.yml';