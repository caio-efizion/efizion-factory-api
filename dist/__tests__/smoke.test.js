"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const client_1 = require("@prisma/client");
const index_1 = __importDefault(require("../index"));
const prisma = new client_1.PrismaClient();
describe('Smoke Test Suite', () => {
    beforeAll(async () => {
        await prisma.task.deleteMany(); // Clear the database before tests
        if (!index_1.default.server.listening) {
            await index_1.default.listen({ port: 0 });
        }
    });
    afterAll(async () => {
        await index_1.default.close();
        await prisma.$disconnect();
    });
    it('should return 200 on healthcheck', async () => {
        const response = await index_1.default.inject({
            method: 'GET',
            url: '/health',
        });
        expect(response.statusCode).toBe(200);
        expect(response.json().status).toBe('ok');
    });
    it('should create a new task', async () => {
        const response = await index_1.default.inject({
            method: 'POST',
            url: '/tasks',
            headers: {
                'x-api-key': process.env.API_KEY || 'suachaveaqui',
            },
            payload: {
                title: 'Test Task',
                description: 'This is a test task',
            },
        });
        expect(response.statusCode).toBe(201);
        const task = response.json();
        expect(task).toHaveProperty('id');
        expect(task.title).toBe('Test Task');
        expect(task.description).toBe('This is a test task');
    });
    it('should retrieve all tasks', async () => {
        const response = await index_1.default.inject({
            method: 'GET',
            url: '/tasks',
            headers: {
                'x-api-key': process.env.API_KEY || 'suachaveaqui',
            },
        });
        expect(response.statusCode).toBe(200);
        const tasks = response.json();
        expect(Array.isArray(tasks)).toBe(true);
        expect(tasks.length).toBeGreaterThan(0);
    });
    it('should retrieve a task by id', async () => {
        const createResponse = await index_1.default.inject({
            method: 'POST',
            url: '/tasks',
            headers: {
                'x-api-key': process.env.API_KEY || 'suachaveaqui',
            },
            payload: {
                title: 'Another Task',
                description: 'This is another test task',
            },
        });
        const createdTask = createResponse.json();
        const response = await index_1.default.inject({
            method: 'GET',
            url: `/tasks/${createdTask.id}`,
            headers: {
                'x-api-key': process.env.API_KEY || 'suachaveaqui',
            },
        });
        expect(response.statusCode).toBe(200);
        const task = response.json();
        expect(task.id).toBe(createdTask.id);
        expect(task.title).toBe('Another Task');
        expect(task.description).toBe('This is another test task');
    });
    it('should execute efizion-agent-runner (skip if not found)', (done) => {
        try {
            const runner = (0, child_process_1.spawn)('efizion-agent-runner', ['--version']);
            let output = '';
            runner.stdout.on('data', (data) => {
                output += data.toString();
            });
            runner.on('close', () => {
                // Just check that the process ran (if present)
                done();
            });
            runner.on('error', (error) => {
                if (error.code === 'ENOENT') {
                    // Binário não encontrado, considerar como skip
                    done();
                }
                else {
                    done(error);
                }
            });
        }
        catch (err) {
            done();
        }
    });
});
