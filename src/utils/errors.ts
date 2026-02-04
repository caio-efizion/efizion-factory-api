import { FastifyReply } from 'fastify';
import { ZodError, ZodIssue } from 'zod';

// Estrutura padronizada de erro
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: string[] | Record<string, unknown>;
  };
  timestamp: string;
  path?: string;
}

// Códigos de erro padronizados
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  CONFLICT: 'CONFLICT',
  TASK_EXECUTION_ERROR: 'TASK_EXECUTION_ERROR',
} as const;

// Helper para formatar erro do Zod
export function formatZodError(error: ZodError): string[] {
  return error.issues.map((err: ZodIssue) => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });
}

// Helper para enviar erro padronizado
export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: string[] | Record<string, unknown>
): void {
  const errorResponse: ErrorResponse = {
    error: {
      code,
      message,
    },
    timestamp: new Date().toISOString(),
    path: reply.request.url,
  };
  
  if (details) {
    errorResponse.error.details = details;
  }
  
  reply.code(statusCode).send(errorResponse);
}

// Handlers específicos para diferentes tipos de erro
export const ErrorHandlers = {
  unauthorized: (reply: FastifyReply, message = 'Invalid or missing API key') => {
    sendError(reply, 401, ErrorCodes.UNAUTHORIZED, message);
  },
  
  notFound: (reply: FastifyReply, resource = 'Resource', id?: string | number) => {
    const message = id 
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    sendError(reply, 404, ErrorCodes.NOT_FOUND, message);
  },
  
  validationError: (reply: FastifyReply, error: ZodError) => {
    const details = formatZodError(error);
    sendError(reply, 400, ErrorCodes.VALIDATION_ERROR, 'Validation failed', details);
  },
  
  badRequest: (reply: FastifyReply, message: string, details?: string[] | Record<string, unknown>) => {
    sendError(reply, 400, ErrorCodes.BAD_REQUEST, message, details);
  },
  
  internalError: (reply: FastifyReply, message = 'Internal server error', details?: string[] | Record<string, unknown>) => {
    sendError(reply, 500, ErrorCodes.INTERNAL_ERROR, message, details);
  },
  
  conflict: (reply: FastifyReply, message: string) => {
    sendError(reply, 409, ErrorCodes.CONFLICT, message);
  },
};
