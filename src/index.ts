import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyHealthcheck from 'fastify-healthcheck';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { 
  createTaskSchema, 
  taskIdParamSchema,
  CreateTaskInput,
  TaskIdParam 
} from './schemas/task.schema';
import { ErrorHandlers, ErrorCodes } from './utils/errors';

dotenv.config();

const prisma = new PrismaClient();
const fastify = Fastify({ 
  logger: true,
  connectionTimeout: 10000, // 10 segundos de timeout global
  requestTimeout: 10000,
});

export default fastify;

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error('API_KEY environment variable is required');
}

// Register Rate Limiting
const rateMaxRequests = process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT_MAX
  ? parseInt(process.env.RATE_LIMIT_MAX)
  : 100;

fastify.register(rateLimit, {
  max: rateMaxRequests,
  timeWindow: '1 minute',
  errorResponseBuilder: (request, context) => {
    return {
      error: {
        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
        message: `Too many requests. Please try again after ${context.after}`,
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    };
  },
});

// Register CORS
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3100'];

fastify.register(cors, {
  origin: (origin, callback) => {
    // Permite requisições sem origin (ex: Postman, cURL)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
});

// Handler global de timeout
fastify.addHook('onTimeout', async (request, reply) => {
  ErrorHandlers.timeout(reply);
});

// Register Swagger
fastify.register(fastifySwagger, {
  swagger: {
    info: {
      title: 'Efizion Factory API',
      description: 'API for managing autonomous coding tasks with AI agents',
      version: '1.0.0',
    },
    host: 'localhost:3000',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
    securityDefinitions: {
      apiKey: {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'API Key for authentication',
      },
    },
    security: [{ apiKey: [] }],
  },
});

fastify.register(fastifySwaggerUi, {
  routePrefix: '/documentation',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false,
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
});

// Register Healthcheck
fastify.register(fastifyHealthcheck);

// Middleware de autenticação
async function verifyApiKey(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const apiKey = request.headers['x-api-key'];
  
  if (!apiKey) {
    ErrorHandlers.unauthorized(reply, 'Missing API key in x-api-key header');
    return;
  }
  
  if (apiKey !== API_KEY) {
    ErrorHandlers.unauthorized(reply, 'Invalid API key');
    return;
  }
}

// POST /tasks - Criar nova task
fastify.post<{ Body: CreateTaskInput }>(
  '/tasks',
  { 
    preHandler: verifyApiKey,
    schema: {
      description: 'Create a new task',
      tags: ['tasks'],
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 3, maxLength: 200 },
          description: { type: 'string', maxLength: 5000 },
        },
      },
      response: {
        201: {
          description: 'Task created successfully',
          type: 'object',
          properties: {
            id: { type: 'number' },
            title: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            runnerPid: { type: ['number', 'null'] },
            output: { type: ['string', 'null'] },
          },
        },
      },
    },
  },
  async (request, reply) => {
    try {
      // Validação com Zod
      const validatedData = createTaskSchema.parse(request.body);

      const task = await prisma.task.create({
        data: {
          title: validatedData.title,
          description: validatedData.description || '',
          status: 'pending',
        },
      });

      reply.code(201).send(task);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        ErrorHandlers.validationError(reply, error);
      } else {
        fastify.log.error(error);
        ErrorHandlers.internalError(reply, 'Failed to create task');
      }
    }
  }
);

// GET /tasks - Listar todas as tasks
fastify.get(
  '/tasks',
  { 
    preHandler: verifyApiKey,
    schema: {
      description: 'List all tasks',
      tags: ['tasks'],
      response: {
        200: {
          description: 'List of tasks',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              title: { type: 'string' },
              description: { type: 'string' },
              status: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
              runnerPid: { type: ['number', 'null'] },
              output: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
  },
  async (request, reply) => {
    try {
      const tasks = await prisma.task.findMany({
        orderBy: { createdAt: 'desc' },
      });
      reply.send(tasks);
    } catch (error: any) {
      fastify.log.error(error);
      ErrorHandlers.internalError(reply, 'Failed to fetch tasks');
    }
  }
);

// GET /tasks/:id - Obter task por ID
fastify.get<{ Params: TaskIdParam }>(
  '/tasks/:id',
  { 
    preHandler: verifyApiKey,
    schema: {
      description: 'Get task by ID',
      tags: ['tasks'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^\\d+$' },
        },
      },
      response: {
        200: {
          description: 'Task details',
          type: 'object',
          properties: {
            id: { type: 'number' },
            title: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            runnerPid: { type: ['number', 'null'] },
            output: { type: ['string', 'null'] },
          },
        },
      },
    },
  },
  async (request, reply) => {
    try {
      const { id } = taskIdParamSchema.parse(request.params);
      
      const task = await prisma.task.findUnique({
        where: { id: parseInt(id, 10) },
      });

      if (!task) {
        ErrorHandlers.notFound(reply, 'Task', id);
        return;
      }

      reply.send(task);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        ErrorHandlers.validationError(reply, error);
      } else {
        fastify.log.error(error);
        ErrorHandlers.internalError(reply, 'Failed to fetch task');
      }
    }
  }
);

// GET /tasks/:id/logs - Obter logs da task
fastify.get<{ Params: TaskIdParam }>(
  '/tasks/:id/logs',
  { 
    preHandler: verifyApiKey,
    schema: {
      description: 'Get task execution logs',
      tags: ['tasks'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^\\d+$' },
        },
      },
      response: {
        200: {
          description: 'Task logs',
          type: 'object',
          properties: {
            logs: { type: 'array', items: { type: 'string' } },
            status: { type: 'string' },
            runnerPid: { type: ['number', 'null'] },
          },
        },
      },
    },
  },
  async (request, reply) => {
    try {
      const { id } = taskIdParamSchema.parse(request.params);
      
      const task = await prisma.task.findUnique({
        where: { id: parseInt(id, 10) },
      });

      if (!task) {
        ErrorHandlers.notFound(reply, 'Task', id);
        return;
      }

      const logs = task.output ? task.output.split('\n') : [];
      reply.send({ 
        logs, 
        status: task.status, 
        runnerPid: task.runnerPid 
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        ErrorHandlers.validationError(reply, error);
      } else {
        fastify.log.error(error);
        ErrorHandlers.internalError(reply, 'Failed to fetch logs');
      }
    }
  }
);

// POST /tasks/:id/run - Executar task com efizion-agent-runner
fastify.post<{ Params: TaskIdParam }>(
  '/tasks/:id/run',
  { 
    preHandler: verifyApiKey,
    schema: {
      description: 'Execute task with efizion-agent-runner',
      tags: ['tasks'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^\\d+$' },
        },
      },
      response: {
        200: {
          description: 'Task execution started',
          type: 'object',
          properties: {
            message: { type: 'string' },
            runnerPid: { type: ['number', 'null'] },
            taskId: { type: 'number' },
          },
        },
      },
    },
  },
  async (request, reply) => {
    try {
      const { id } = taskIdParamSchema.parse(request.params);
      const taskId = parseInt(id, 10);
      
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        ErrorHandlers.notFound(reply, 'Task', id);
        return;
      }

      // Verificar se já está rodando
      if (task.status === 'running' && task.runnerPid) {
        ErrorHandlers.conflict(reply, 'Task is already running');
        return;
      }

      // Extrair repo URL da description
      const repoRegex = /(https:\/\/github\.com\/[\w\-]+\/[\w\-\.]+)/i;
      const match = task.description?.match(repoRegex);
      
      if (!match) {
        ErrorHandlers.badRequest(
          reply, 
          'Task description must include a GitHub repo URL (https://github.com/...)'
        );
        return;
      }

      const repoUrl = match[1];

      // Atualizar status para running
      await prisma.task.update({
        where: { id: taskId },
        data: { status: 'running' },
      });

      // Preparar execução do runner
      const runnerPath = '../efizion-agent-runner';
      const runnerCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

      const runnerArgs = [
        '--prefix', runnerPath,
        'efizion', 'run',
        '--repo', repoUrl
      ];
      
      if (task.title) runnerArgs.push('--title', task.title);
      if (task.description) runnerArgs.push('--description', task.description);

      const token = process.env.GITHUB_TOKEN;
      const maskedToken = token ? token.substring(0, 6) + '...' : undefined;
      
      fastify.log.info({
        taskId,
        envHasToken: !!token,
        tokenMasked: maskedToken,
        runnerArgs,
      }, 'Starting efizion-agent-runner');

      const runnerEnv = {
        ...process.env,
        GITHUB_TOKEN: process.env.GITHUB_TOKEN,
      };

      const runner = spawn(runnerCmd, runnerArgs, {
        cwd: __dirname + '/../',
        shell: false,
        env: runnerEnv,
      });

      // Salvar PID
      await prisma.task.update({ 
        where: { id: taskId }, 
        data: { runnerPid: runner.pid ?? null } 
      });

      let output = '';
      runner.stdout.on('data', (data) => { output += data.toString(); });
      runner.stderr.on('data', (data) => { output += data.toString(); });

      runner.on('close', async (code) => {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: code === 0 ? 'done' : 'error',
            output,
          },
        });
        fastify.log.info({ taskId, exitCode: code }, 'efizion-agent-runner finished');
      });

      runner.on('error', async (error) => {
        fastify.log.error({ taskId, error }, 'efizion-agent-runner failed to start');
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'error',
            output: `Failed to start runner: ${error.message}`,
          },
        });
      });

      reply.send({ 
        message: 'Task execution started', 
        runnerPid: runner.pid,
        taskId 
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        ErrorHandlers.validationError(reply, error);
      } else {
        fastify.log.error(error);
        ErrorHandlers.internalError(reply, 'Failed to execute task');
      }
    }
  }
);

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.log.info('API documentation available at http://localhost:3000/documentation');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Only start if not imported (for testing)
if (require.main === module) {
  start();
}
