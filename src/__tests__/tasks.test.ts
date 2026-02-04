import { PrismaClient } from '@prisma/client';
import fastify from '../index';

const prisma = new PrismaClient();
// API_KEY deve estar definida no ambiente de teste
const API_KEY = process.env.API_KEY || 'test-api-key-for-ci';

describe('Tasks API', () => {
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
  it('should require x-api-key', async () => {
    const res = await fastify.inject({ method: 'GET', url: '/tasks' });
    expect(res.statusCode).toBe(401);
  });
  it('should create a task', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/tasks',
      headers: { 'x-api-key': API_KEY },
      payload: { title: 'Test', description: 'Desc' }
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.title).toBe('Test');
    expect(body.status).toBe('pending');
    expect(body.runnerPid).toBeNull();
    expect(body.output).toBeNull();
  });
  it('should list tasks', async () => {
    const res = await fastify.inject({
      method: 'GET',
      url: '/tasks',
      headers: { 'x-api-key': API_KEY }
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(JSON.parse(res.body))).toBe(true);
  });
});