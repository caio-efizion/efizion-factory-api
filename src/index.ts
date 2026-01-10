import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyHealthcheck from 'fastify-healthcheck';
import fastifyAuth from 'fastify-auth';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const fastify = Fastify({ logger: true });

const API_KEY = process.env.API_KEY || 'default-api-key';

// Register Swagger
fastify.register(fastifySwagger, {
  swagger: {
    info: {
      title: 'Task API',
      description: 'API for managing tasks',
      version: '1.0.0',
    },
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


// Middleware de autenticação manual por x-api-key
fastify.decorate('verifyApiKey', async function(request: any, reply: any) {
  const apiKey = request.headers['x-api-key'];
  if (!apiKey || apiKey !== API_KEY) {
    reply.code(401).send({ message: 'Invalid or missing API key' });
    throw new Error('Unauthorized');
  }
});

// Define Task type
type Task = {
  id: number;
  title: string;
  description: string;
};

// POST /tasks
fastify.post('/tasks', { preHandler: fastify.verifyApiKey }, async (request, reply) => {
  const { title, description } = request.body as { title: string; description: string };
  const task = await prisma.task.create({
    data: {
      title,
      description,
    },
  });
  reply.code(201).send(task);
});

// GET /tasks
fastify.get('/tasks', { preHandler: fastify.verifyApiKey }, async (request, reply) => {
  const tasks = await prisma.task.findMany();
  reply.send(tasks);
});

// GET /tasks/:id
fastify.get('/tasks/:id', { preHandler: fastify.verifyApiKey }, async (request, reply) => {
  const { id } = request.params as { id: string };
  const task = await prisma.task.findUnique({
    where: { id: parseInt(id, 10) },
  });
  if (task) {
    reply.send(task);
  } else {
    reply.code(404).send({ message: 'Task not found' });
  }
});

// Integrate efizion-agent-runner
fastify.post('/tasks/:id/run', { preHandler: fastify.verifyApiKey }, async (request, reply) => {
  const { id } = request.params as { id: string };
  const task = await prisma.task.findUnique({
    where: { id: parseInt(id, 10) },
  });
  if (!task) {
    return reply.code(404).send({ message: 'Task not found' });
  }

  // Caminho relativo para o runner
  const runnerPath = '../efizion-agent-runner';
  // Use o binário "efizion" do runner (definido no package.json do runner)
  const runnerCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const runnerArgs = ['--prefix', runnerPath, 'efizion', task.title, task.description];

  const runner = spawn(runnerCmd, runnerArgs, {
    cwd: __dirname + '/../', // Garante execução do diretório da API
    stdio: 'inherit',
    shell: false,
  });

  runner.on('close', (code) => {
    fastify.log.info(`efizion-agent-runner exited with code ${code}`);
  });

  reply.send({ message: 'Task execution started' });
});

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.swagger();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();