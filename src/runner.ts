import { spawn } from 'child_process';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Task {
  id: number;
  command: string;
  status: string;
  output: string;
}

export async function runTask(command: string): Promise<Task> {
  return new Promise((resolve, reject) => {
    const taskProcess = spawn(command, { shell: true });

    let output = '';
    taskProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    taskProcess.stderr.on('data', (data) => {
      output += data.toString();
    });

    taskProcess.on('close', async (code) => {
      const status = code === 0 ? 'success' : 'failure';
      try {
        const task = await prisma.task.create({
          data: {
            command,
            status,
            output,
          },
        });
        resolve(task);
      } catch (error) {
        reject(error);
      }
    });

    taskProcess.on('error', (error) => {
      reject(error);
    });
  });
}

export async function registerRunnerRoutes(fastify: FastifyInstance) {
  fastify.post('/tasks', async (request, reply) => {
    const { command } = request.body as { command: string };
    try {
      const task = await runTask(command);
      reply.code(201).send(task);
    } catch (error) {
      reply.code(500).send({ error: 'Task execution failed' });
    }
  });

  fastify.get('/tasks', async (request, reply) => {
    try {
      const tasks = await prisma.task.findMany();
      reply.send(tasks);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to retrieve tasks' });
    }
  });

  fastify.get('/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const task = await prisma.task.findUnique({
        where: { id: parseInt(id, 10) },
      });
      if (task) {
        reply.send(task);
      } else {
        reply.code(404).send({ error: 'Task not found' });
      }
    } catch (error) {
      reply.code(500).send({ error: 'Failed to retrieve task' });
    }
  });
}