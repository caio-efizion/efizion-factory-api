// ...toda a implementação robusta da API conforme especificação...
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyHealthcheck from 'fastify-healthcheck';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const fastify = Fastify({ logger: true });

export default fastify;

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
function verifyApiKey(request: any, reply: any, done: () => void) {
  const apiKey = request.headers['x-api-key'];
  if (!apiKey || apiKey !== API_KEY) {
    reply.code(401).send({ message: 'Invalid or missing API key' });
    return;
  }
  done();
}

// Define Task type
type Task = {
  id: number;
  title: string;
  description: string;
};

// POST /tasks
fastify.post('/tasks', { preHandler: verifyApiKey }, async (request, reply) => {
  const { title, description } = request.body as { title: string; description: string };
  // Cria task com status pending
  const task = await prisma.task.create({
    data: {
      title,
      description,
      status: 'pending',
    },
  });
  reply.code(201).send(task);
});

// GET /tasks
fastify.get('/tasks', { preHandler: verifyApiKey }, async (request, reply) => {
  const tasks = await prisma.task.findMany();
  reply.send(tasks);
});

// GET /tasks/:id
fastify.get('/tasks/:id', { preHandler: verifyApiKey }, async (request, reply) => {
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
fastify.post('/tasks/:id/run', { preHandler: verifyApiKey }, async (request, reply) => {
  const { id } = request.params as { id: string };
  const task = await prisma.task.findUnique({
    where: { id: parseInt(id, 10) },
  });
  if (!task) {
    reply.code(404).send({ message: 'Task not found' });
    return;
  }

  // Caminho relativo para o runner
  const runnerPath = '../efizion-agent-runner';
  const runnerCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  // EXTRAI O REPO DA DESCRIPTION (padrão: primeira linha com 'https://github.com')
  let repoUrl = '';
  const repoRegex = /(https:\/\/github\.com\/[\w\-]+\/[\w\-\.]+)/i;
  if (task.description) {
    const match = task.description.match(repoRegex);
    if (match) repoUrl = match[1];
  }
  if (!repoUrl) {
    // fallback: tente campo repo (futuro) ou retorne erro
    return reply.code(400).send({ message: 'Task description must include a GitHub repo URL (https://github.com/...)' });
  }

  // Monta argumentos CLI
  const runnerArgs = [
    '--prefix', runnerPath,
    'efizion', 'run',
    '--repo', repoUrl
  ];
  if (task.title) runnerArgs.push('--title', task.title);
  if (task.description) runnerArgs.push('--description', task.description);

  // Log seguro do GITHUB_TOKEN antes do spawn
  const token = process.env.GITHUB_TOKEN;
  const maskedToken = token ? token.substring(0, 6) + '...' : undefined;
  fastify.log.info({
    envHasToken: !!token,
    tokenMasked: maskedToken,
    runnerArgs,
    runnerEnvKeys: Object.keys(process.env),
  }, 'Preparando para spawn do runner: verificação de GITHUB_TOKEN no ambiente da API');

  const runnerEnv = {
    ...process.env,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  };
  // Log seguro do env passado ao runner
  fastify.log.info({
    runnerEnvHasToken: !!runnerEnv.GITHUB_TOKEN,
    runnerEnvMasked: runnerEnv.GITHUB_TOKEN ? runnerEnv.GITHUB_TOKEN.substring(0, 6) + '...' : undefined,
    runnerEnvKeys: Object.keys(runnerEnv),
  }, 'Env passado ao runner (mascarado)');

  const runner = spawn(runnerCmd, runnerArgs, {
    cwd: __dirname + '/../',
    shell: false,
    env: runnerEnv,
  });

  // Salva o PID do runner na task
  await prisma.task.update({ where: { id: task.id }, data: { runnerPid: runner.pid ?? null } });

  let output = '';
  runner.stdout.on('data', (data) => { output += data.toString(); });
  runner.stderr.on('data', (data) => { output += data.toString(); });

  runner.on('close', async (code) => {
    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: code === 0 ? 'done' : 'error',
        output,
      },
    });
    fastify.log.info(`efizion-agent-runner exited with code ${code}`);
  });

  reply.send({ message: 'Task execution started', runnerPid: runner.pid });
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