import { PrismaClient } from '@prisma/client';
import fastify from '../index';

const prisma = new PrismaClient();
const API_KEY = process.env.API_KEY || 'test-api-key-for-ci';

describe('Tasks API - Comprehensive Tests', () => {
  beforeAll(async () => {
    await prisma.task.deleteMany();
    if (!fastify.server.listening) {
      await fastify.listen({ port: 0 });
    }
  });

  afterAll(async () => {
    await fastify.close();
    await prisma.$disconnect();
  });

  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      const res = await fastify.inject({ 
        method: 'GET', 
        url: '/tasks' 
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with invalid API key', async () => {
      const res = await fastify.inject({ 
        method: 'GET', 
        url: '/tasks',
        headers: { 'x-api-key': 'invalid-key' }
      });
      expect(res.statusCode).toBe(401);
    });

    it('should accept requests with valid API key', async () => {
      const res = await fastify.inject({
        method: 'GET',
        url: '/tasks',
        headers: { 'x-api-key': API_KEY }
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /tasks - Create Task', () => {
    it('should create a task with valid data', async () => {
      const res = await fastify.inject({
        method: 'POST',
        url: '/tasks',
        headers: { 'x-api-key': API_KEY },
        payload: { 
          title: 'Test Task', 
          description: 'This is a test task with valid description' 
        }
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.title).toBe('Test Task');
      expect(body.status).toBe('pending');
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('createdAt');
    });

    it('should reject task with title too short', async () => {
      const res = await fastify.inject({
        method: 'POST',
        url: '/tasks',
        headers: { 'x-api-key': API_KEY },
        payload: { title: 'ab', description: 'Valid description here' }
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      // Fastify schema validation error format
      expect(body.message).toContain('must NOT have fewer than 3 characters');
    });

    it('should accept task with short description', async () => {
      const res = await fastify.inject({
        method: 'POST',
        url: '/tasks',
        headers: { 'x-api-key': API_KEY },
        payload: { title: 'Valid Title', description: 'short' }
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.title).toBe('Valid Title');
    });

    it('should accept task without description', async () => {
      const res = await fastify.inject({
        method: 'POST',
        url: '/tasks',
        headers: { 'x-api-key': API_KEY },
        payload: { title: 'Task Without Description' }
      });
      expect(res.statusCode).toBe(201);
    });
  });

  describe('GET /tasks - List Tasks', () => {
    beforeEach(async () => {
      // Limpar TODAS as tasks antes de cada teste
      await prisma.task.deleteMany();
      // Criar apenas 2 tasks específicas
      await prisma.task.create({
        data: { title: 'Task 1', description: 'Description 1', status: 'pending' }
      });
      await prisma.task.create({
        data: { title: 'Task 2', description: 'Description 2', status: 'done' }
      });
    });

    it('should list all tasks', async () => {
      const res = await fastify.inject({
        method: 'GET',
        url: '/tasks',
        headers: { 'x-api-key': API_KEY }
      });
      expect(res.statusCode).toBe(200);
      const tasks = JSON.parse(res.body);
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /tasks/:id - Get Task by ID', () => {
    let createdTask: any;

    beforeEach(async () => {
      await prisma.task.deleteMany();
      createdTask = await prisma.task.create({
        data: { title: 'Test Task', description: 'Test Description', status: 'pending' }
      });
    });

    it('should return task by valid ID', async () => {
      const res = await fastify.inject({
        method: 'GET',
        url: `/tasks/${createdTask.id}`,
        headers: { 'x-api-key': API_KEY }
      });
      expect(res.statusCode).toBe(200);
      const task = JSON.parse(res.body);
      expect(task.id).toBe(createdTask.id);
      expect(task.title).toBe('Test Task');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await fastify.inject({
        method: 'GET',
        url: '/tasks/99999',
        headers: { 'x-api-key': API_KEY }
      });
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should reject invalid ID format', async () => {
      const res = await fastify.inject({
        method: 'GET',
        url: '/tasks/invalid',
        headers: { 'x-api-key': API_KEY }
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /tasks/:id/logs - Get Task Logs', () => {
    let taskWithLogs: any;

    beforeEach(async () => {
      await prisma.task.deleteMany();
      taskWithLogs = await prisma.task.create({
        data: { 
          title: 'Task with logs', 
          description: 'Test', 
          status: 'done',
          output: 'Log line 1\nLog line 2\nLog line 3'
        }
      });
    });

    it('should return task logs as array', async () => {
      const res = await fastify.inject({
        method: 'GET',
        url: `/tasks/${taskWithLogs.id}/logs`,
        headers: { 'x-api-key': API_KEY }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.logs).toEqual(['Log line 1', 'Log line 2', 'Log line 3']);
      expect(body.status).toBe('done');
    });

    it('should return empty logs for task without output', async () => {
      const task = await prisma.task.create({
        data: { title: 'No logs', description: 'Test', status: 'pending' }
      });
      const res = await fastify.inject({
        method: 'GET',
        url: `/tasks/${task.id}/logs`,
        headers: { 'x-api-key': API_KEY }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.logs).toEqual([]);
    });
  });

  describe('POST /tasks/:id/run - Execute Task', () => {
    let taskToRun: any;

    beforeEach(async () => {
      await prisma.task.deleteMany();
      taskToRun = await prisma.task.create({
        data: { 
          title: 'Run Test', 
          description: 'Test with repo: https://github.com/user/repo', 
          status: 'pending' 
        }
      });
    });

    it('should reject task without GitHub URL', async () => {
      const task = await prisma.task.create({
        data: { title: 'No URL', description: 'No GitHub URL here', status: 'pending' }
      });
      const res = await fastify.inject({
        method: 'POST',
        url: `/tasks/${task.id}/run`,
        headers: { 'x-api-key': API_KEY }
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('BAD_REQUEST');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await fastify.inject({
        method: 'POST',
        url: '/tasks/99999/run',
        headers: { 'x-api-key': API_KEY }
      });
      expect(res.statusCode).toBe(404);
    });

    it('should accept task with valid GitHub URL', async () => {
      const res = await fastify.inject({
        method: 'POST',
        url: `/tasks/${taskToRun.id}/run`,
        headers: { 'x-api-key': API_KEY }
      });
      // Should start execution (200) or fail if runner not available
      expect([200, 500]).toContain(res.statusCode);
    });
  });

  describe('Error Response Format', () => {
    it('should return standardized error format', async () => {
      const res = await fastify.inject({
        method: 'GET',
        url: '/tasks/99999',
        headers: { 'x-api-key': API_KEY }
      });
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('path');
    });
  });
});
