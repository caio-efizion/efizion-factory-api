import { spawn } from 'child_process';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { build } from '../app';

const prisma = new PrismaClient();

describe('Smoke Test Suite', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await build();
    await prisma.task.deleteMany(); // Clear the database before tests
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('should return 200 on healthcheck', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('should create a new task', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: {
        'api-key': 'test-api-key',
      },
      payload: {
        name: 'Test Task',
        description: 'This is a test task',
      },
    });

    expect(response.statusCode).toBe(201);
    const task = response.json();
    expect(task).toHaveProperty('id');
    expect(task.name).toBe('Test Task');
    expect(task.description).toBe('This is a test task');
  });

  it('should retrieve all tasks', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/tasks',
      headers: {
        'api-key': 'test-api-key',
      },
    });

    expect(response.statusCode).toBe(200);
    const tasks = response.json();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBeGreaterThan(0);
  });

  it('should retrieve a task by id', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: {
        'api-key': 'test-api-key',
      },
      payload: {
        name: 'Another Task',
        description: 'This is another test task',
      },
    });

    const createdTask = createResponse.json();

    const response = await app.inject({
      method: 'GET',
      url: `/tasks/${createdTask.id}`,
      headers: {
        'api-key': 'test-api-key',
      },
    });

    expect(response.statusCode).toBe(200);
    const task = response.json();
    expect(task.id).toBe(createdTask.id);
    expect(task.name).toBe('Another Task');
    expect(task.description).toBe('This is another test task');
  });

  it('should execute efizion-agent-runner', (done) => {
    const runner = spawn('efizion-agent-runner', ['--version']);

    runner.stdout.on('data', (data) => {
      expect(data.toString()).toContain('efizion-agent-runner version');
      done();
    });

    runner.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    runner.on('error', (error) => {
      console.error(`error: ${error.message}`);
      done(error);
    });
  });
});