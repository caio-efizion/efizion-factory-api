// src/types/index.ts

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PrismaClient, Task } from '@prisma/client';

// Define the shape of the request body for creating a task
export interface CreateTaskRequest {
  title: string;
  description?: string;
}

// Define the shape of the request parameters for fetching a task by ID
export interface TaskParams {
  id: string;
}

// Define a type for the Fastify instance with Prisma and logging
// Interface removida, não utilizada

// Define a type for the Fastify request with API key authentication
export interface FastifyRequestWithAuth extends FastifyRequest {
  headers: {
    'api-key': string;
  };
}

// Define a type for the Fastify reply
export type FastifyReplyWithLogging = FastifyReply & {
  log: {
    info: (msg: string, obj?: Record<string, unknown>) => void;
    error: (msg: string, obj?: Record<string, unknown>) => void;
  };
};

// Define the shape of a task object
export type TaskType = Task;