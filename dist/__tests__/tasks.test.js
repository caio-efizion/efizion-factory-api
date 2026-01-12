"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const index_1 = __importDefault(require("../index"));
const prisma = new client_1.PrismaClient();
const API_KEY = process.env.API_KEY || 'suachaveaqui';
describe('Tasks API', () => {
    beforeAll(async () => {
        await prisma.task.deleteMany();
        if (!index_1.default.server.listening) {
            await index_1.default.listen({ port: 0 });
        }
    });
    afterAll(async () => {
        await index_1.default.close();
        await prisma.$disconnect();
    });
    it('should require x-api-key', async () => {
        const res = await index_1.default.inject({ method: 'GET', url: '/tasks' });
        expect(res.statusCode).toBe(401);
    });
    it('should create a task', async () => {
        const res = await index_1.default.inject({
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
        const res = await index_1.default.inject({
            method: 'GET',
            url: '/tasks',
            headers: { 'x-api-key': API_KEY }
        });
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(JSON.parse(res.body))).toBe(true);
    });
});
