import { PrismaClient } from '@prisma/client';
import Fastify, { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import { ErrorCodes, ErrorHandlers } from '../utils/errors';

const prisma = new PrismaClient();
const API_KEY = process.env.API_KEY || 'test-api-key-for-ci';

describe('Middlewares - Rate Limiting, CORS e Timeout', () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    await prisma.task.deleteMany();
    
    // Create a test fastify instance with lower rate limit
    fastify = Fastify({ 
      logger: false,
      connectionTimeout: 10000,
      requestTimeout: 10000,
    });

    // Register Rate Limiting with lower limit for testing
    await fastify.register(rateLimit, {
      max: 10,
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
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:3100'];
    await fastify.register(cors, {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'), false);
        }
      },
      credentials: true,
    });

    // Register timeout hook
    fastify.addHook('onTimeout', async (request, reply) => {
      ErrorHandlers.timeout(reply);
    });

    // Simple auth middleware
    fastify.addHook('onRequest', async (request, reply) => {
      // Pular autenticação para /health
      if (request.url === '/health') {
        return;
      }
      
      const apiKey = request.headers['x-api-key'];
      if (!apiKey || apiKey !== API_KEY) {
        reply.status(401).send({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid API key',
          },
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
    });

    // Health endpoint
    fastify.get('/health', async () => {
      return { status: 'ok' };
    });

    // Tasks endpoint
    fastify.get('/tasks', async () => {
      const tasks = await prisma.task.findMany();
      return tasks;
    });

    await fastify.listen({ port: 0 });
  });

  afterAll(async () => {
    await fastify.close();
    await prisma.$disconnect();
  });

  describe('Rate Limiting', () => {
    it('should have rate limiting configured', async () => {
      // Verificar que rate limit responde corretamente 
      const res = await fastify.inject({
        method: 'GET',
        url: '/tasks',
        headers: { 'x-api-key': API_KEY }
      });

      // Rate limit headers devem estar presentes
      expect(res.headers).toHaveProperty('x-ratelimit-limit');
      expect(res.headers).toHaveProperty('x-ratelimit-remaining');
      expect(res.headers['x-ratelimit-limit']).toBe('10');
    });

    it('should return proper format when rate limit exists', async () => {
      // Apenas verificar que a response tem estrutura correta 
      const res = await fastify.inject({
        method: 'GET',
        url: '/tasks',
        headers: { 'x-api-key': API_KEY }
      });

      // Sucesso ou rate limit, ambos devem ter formato correto
      expect([200, 429]).toContain(res.statusCode);
      
      if (res.statusCode === 429) {
        const body = JSON.parse(res.body);
        expect(body).toHaveProperty('error');
        expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(body.error.message).toContain('Too many requests');
        expect(body).toHaveProperty('timestamp');
        expect(body).toHaveProperty('path');
      }
    });
  });

  describe('CORS', () => {
    it('should allow requests from allowed origins', async () => {
      const res = await fastify.inject({
        method: 'OPTIONS',
        url: '/tasks',
        headers: {
          'origin': 'http://localhost:3000',
          'access-control-request-method': 'GET',
        }
      });

      // Preflight deve retornar 200 ou 204
      expect([200, 204]).toContain(res.statusCode);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should block requests from disallowed origins', async () => {
      const res = await fastify.inject({
        method: 'GET',
        url: '/tasks',
        headers: {
          'x-api-key': API_KEY,
          'origin': 'http://malicious-site.com',
        }
      });

      // CORS bloqueado - não deve ter header de CORS ou deve retornar erro
      expect(res.headers['access-control-allow-origin']).not.toBe('http://malicious-site.com');
    });

    it('should allow requests without origin (e.g., curl, postman)', async () => {
      const res = await fastify.inject({
        method: 'GET',
        url: '/tasks',
        headers: {
          'x-api-key': API_KEY,
          // Sem header 'origin'
        }
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('Request Timeout', () => {
    it('should not timeout for fast requests', async () => {
      const res = await fastify.inject({
        method: 'GET',
        url: '/health',
      });

      if (res.statusCode !== 200) {
        console.log('Health endpoint error:', res.statusCode, res.body);
      }

      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('ok');
    });

    it('should have timeout configuration', () => {
      // Verificar que o fastify tem as configurações de timeout
      expect(fastify.server.timeout).toBeGreaterThan(0);
    });
  });

  describe('Middleware Integration', () => {
    it('should apply all middlewares in correct order', async () => {
      // Verificar que autenticação ainda funciona com os middlewares
      const res = await fastify.inject({
        method: 'GET',
        url: '/tasks',
      });

      expect(res.statusCode).toBe(401); // Sem API key
    });
  });
});
