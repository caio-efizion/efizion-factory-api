"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// ...toda a implementação robusta da API conforme especificação...
const fastify_1 = __importDefault(require("fastify"));
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const fastify_healthcheck_1 = __importDefault(require("fastify-healthcheck"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
const fastify = (0, fastify_1.default)({ logger: true });
exports.default = fastify;
const API_KEY = process.env.API_KEY || 'default-api-key';
// Register Swagger
fastify.register(swagger_1.default, {
    swagger: {
        info: {
            title: 'Task API',
            description: 'API for managing tasks',
            version: '1.0.0',
        },
    },
});
fastify.register(swagger_ui_1.default, {
    routePrefix: '/documentation',
    uiConfig: {
        docExpansion: 'full',
        deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
});
// Register Healthcheck
fastify.register(fastify_healthcheck_1.default);
// Middleware de autenticação manual por x-api-key
function verifyApiKey(request, reply, done) {
    const apiKey = request.headers['x-api-key'];
    if (!apiKey || apiKey !== API_KEY) {
        reply.code(401).send({ message: 'Invalid or missing API key' });
        return;
    }
    done();
}
// POST /tasks
fastify.post('/tasks', { preHandler: verifyApiKey }, async (request, reply) => {
    const { title, description } = request.body;
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
    const { id } = request.params;
    const task = await prisma.task.findUnique({
        where: { id: parseInt(id, 10) },
    });
    if (task) {
        reply.send(task);
    }
    else {
        reply.code(404).send({ message: 'Task not found' });
    }
});
// Integrate efizion-agent-runner
fastify.post('/tasks/:id/run', { preHandler: verifyApiKey }, async (request, reply) => {
    const { id } = request.params;
    const task = await prisma.task.findUnique({
        where: { id: parseInt(id, 10) },
    });
    if (!task) {
        return reply.code(404).send({ message: 'Task not found' });
    }
    // Caminho relativo para o runner
    const runnerPath = '../efizion-agent-runner';
    const runnerCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const runnerArgs = ['--prefix', runnerPath, 'efizion', task.title, task.description];
    const runner = (0, child_process_1.spawn)(runnerCmd, runnerArgs, {
        cwd: __dirname + '/../',
        shell: false,
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
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
