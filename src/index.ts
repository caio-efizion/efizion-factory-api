import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyHealthcheck from 'fastify-healthcheck';
import fastifyAuth from 'fastify-auth';
import fastifyApiKey from 'fastify-api-key';
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

// Register API Key Authentication
fastify.register(fastifyApiKey, { apiKeys: new Set([API_KEY]) });

// Define Task type
type Task = {
  id: number;
  title: string;
  description: string;
};

// POST /tasks
fastify.post('/tasks', { preHandler: fastify.auth([fastify.verifyApiKey]) }, async (request, reply) => {
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
fastify.get('/tasks', { preHandler: fastify.auth([fastify.verifyApiKey]) }, async (request, reply) => {
  const tasks = await prisma.task.findMany();
  reply.send(tasks);
});

// GET /tasks/:id
fastify.get('/tasks/:id', { preHandler: fastify.auth([fastify.verifyApiKey]) }, async (request, reply) => {
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
fastify.post('/tasks/:id/run', { preHandler: fastify.auth([fastify.verifyApiKey]) }, async (request, reply) => {
  const { id } = request.params as { id: string };
  const task = await prisma.task.findUnique({
    where: { id: parseInt(id, 10) },
  });
  if (!task) {
    return reply.code(404).send({ message: 'Task not found' });
  }

  const runner = spawn('efizion-agent-runner', [task.title, task.description]);

  runner.stdout.on('data', (data) => {
    fastify.log.info(`stdout: ${data}`);
  });

  runner.stderr.on('data', (data) => {
    fastify.log.error(`stderr: ${data}`);
  });

  runner.on('close', (code) => {
    fastify.log.info(`child process exited with code ${code}`);
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