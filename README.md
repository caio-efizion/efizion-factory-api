# Efizion Factory API

API REST para orquestração de agentes de IA autônomos que realizam tarefas de codificação através do efizion-agent-runner.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Endpoints da API](#endpoints-da-api)
- [Autenticação](#autenticação)
- [Exemplos de Requisições](#exemplos-de-requisições)
- [Formato de Erros](#formato-de-erros)
- [Configuração](#configuração)
- [Execução](#execução)
- [Testes](#testes)

## 🎯 Visão Geral

A Efizion Factory API gerencia tarefas de desenvolvimento automatizadas, permitindo criar, executar e monitorar jobs que são processados por agentes de IA especializados.

**Tecnologias:**
- **Fastify 4.x** - Framework web de alta performance
- **Prisma** - ORM com SQLite
- **Zod** - Validação de schemas
- **TypeScript** - Type safety
- **Swagger/OpenAPI** - Documentação interativa

## 🔐 Autenticação

Todos os endpoints (exceto `/health` e `/documentation`) exigem autenticação via **API Key**.

### Header Obrigatório

```
x-api-key: sua-chave-api-aqui
```

### Configuração da API Key

1. Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```

2. Gere uma API key segura:
   ```bash
   openssl rand -hex 32
   ```

3. Adicione ao `.env`:
   ```
   API_KEY=sua_api_key_gerada_aqui
   GITHUB_TOKEN=seu_github_token_aqui
   ```

### Erros de Autenticação

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API key"
  },
  "timestamp": "2026-02-04T14:00:00.000Z",
  "path": "/tasks"
}
```

**Status Code:** `401 Unauthorized`

## 📍 Endpoints da API

### 1. Health Check

Verifica o status da API.

**Endpoint:** `GET /health`

**Autenticação:** ❌ Não requerida

**Resposta 200:**
```json
{
  "status": "ok"
}
```

### 2. Documentação Swagger

Documentação interativa da API.

**Endpoint:** `GET /documentation`

**Autenticação:** ❌ Não requerida

### 3. Criar Task

Cria uma nova task no sistema.

**Endpoint:** `POST /tasks`

**Autenticação:** ✅ Requerida

**Headers:**
```
Content-Type: application/json
x-api-key: sua-chave-api
```

**Body:**
```json
{
  "title": "Fix authentication bug",
  "description": "Fix login issue in user authentication flow. Repo: https://github.com/user/repo"
}
```

**Validações:**
- `title`: String, 3-200 caracteres (obrigatório)
- `description`: String, 10-5000 caracteres (opcional)

**Resposta 201:**
```json
{
  "id": 1,
  "title": "Fix authentication bug",
  "description": "Fix login issue in user authentication flow. Repo: https://github.com/user/repo",
  "status": "pending",
  "createdAt": "2026-02-04T14:00:00.000Z",
  "updatedAt": "2026-02-04T14:00:00.000Z",
  "runnerPid": null,
  "output": null
}
```

**Erro 400 (Validação):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      "title: Title must be at least 3 characters"
    ]
  },
  "timestamp": "2026-02-04T14:00:00.000Z",
  "path": "/tasks"
}
```

### 4. Listar Tasks

Retorna todas as tasks cadastradas.

**Endpoint:** `GET /tasks`

**Autenticação:** ✅ Requerida

**Headers:**
```
x-api-key: sua-chave-api
```

**Resposta 200:**
```json
[
  {
    "id": 1,
    "title": "Fix authentication bug",
    "description": "Fix login issue...",
    "status": "done",
    "createdAt": "2026-02-04T14:00:00.000Z",
    "updatedAt": "2026-02-04T14:05:00.000Z",
    "runnerPid": 12345,
    "output": "Task completed successfully"
  },
  {
    "id": 2,
    "title": "Add new feature",
    "description": "Implement user dashboard...",
    "status": "pending",
    "createdAt": "2026-02-04T14:10:00.000Z",
    "updatedAt": "2026-02-04T14:10:00.000Z",
    "runnerPid": null,
    "output": null
  }
]
```

### 5. Obter Task por ID

Retorna detalhes de uma task específica.

**Endpoint:** `GET /tasks/:id`

**Autenticação:** ✅ Requerida

**Headers:**
```
x-api-key: sua-chave-api
```

**Parâmetros:**
- `id`: ID numérico da task

**Resposta 200:**
```json
{
  "id": 1,
  "title": "Fix authentication bug",
  "description": "Fix login issue...",
  "status": "done",
  "createdAt": "2026-02-04T14:00:00.000Z",
  "updatedAt": "2026-02-04T14:05:00.000Z",
  "runnerPid": 12345,
  "output": "Task completed successfully..."
}
```

**Erro 404:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Task with id '999' not found"
  },
  "timestamp": "2026-02-04T14:00:00.000Z",
  "path": "/tasks/999"
}
```

### 6. Obter Logs da Task

Retorna os logs de execução de uma task.

**Endpoint:** `GET /tasks/:id/logs`

**Autenticação:** ✅ Requerida

**Headers:**
```
x-api-key: sua-chave-api
```

**Parâmetros:**
- `id`: ID numérico da task

**Resposta 200:**
```json
{
  "logs": [
    "[2026-02-04 14:00:00] Starting task execution",
    "[2026-02-04 14:00:15] Cloning repository...",
    "[2026-02-04 14:00:30] Running planner agent...",
    "[2026-02-04 14:02:00] Task completed successfully"
  ],
  "status": "done",
  "runnerPid": 12345
}
```

### 7. Executar Task

Inicia a execução de uma task com o efizion-agent-runner.

**Endpoint:** `POST /tasks/:id/run`

**Autenticação:** ✅ Requerida

**Headers:**
```
x-api-key: sua-chave-api
```

**Parâmetros:**
- `id`: ID numérico da task

**Pré-requisitos:**
- Task deve ter status `pending` ou `error`
- Description deve conter URL válida do GitHub (formato: `https://github.com/user/repo`)
- Variável `GITHUB_TOKEN` deve estar configurada no ambiente

**Resposta 200:**
```json
{
  "message": "Task execution started",
  "runnerPid": 12345,
  "taskId": 1
}
```

**Erro 400 (URL ausente):**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Task description must include a GitHub repo URL (https://github.com/...)"
  },
  "timestamp": "2026-02-04T14:00:00.000Z",
  "path": "/tasks/1/run"
}
```

**Erro 409 (Task já rodando):**
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Task is already running"
  },
  "timestamp": "2026-02-04T14:00:00.000Z",
  "path": "/tasks/1/run"
}
```

## ⚠️ Formato de Erros

Todos os erros seguem o formato padronizado:

```json
{
  "error": {
    "code": "CODIGO_DO_ERRO",
    "message": "Mensagem descritiva do erro",
    "details": {}  // Opcional: detalhes adicionais
  },
  "timestamp": "2026-02-04T14:00:00.000Z",
  "path": "/endpoint-da-requisicao"
}
```

### Códigos de Erro

| Código | Status | Descrição |
|--------|--------|-----------|
| `UNAUTHORIZED` | 401 | API key inválida ou ausente |
| `NOT_FOUND` | 404 | Recurso não encontrado |
| `VALIDATION_ERROR` | 400 | Dados de entrada inválidos |
| `BAD_REQUEST` | 400 | Requisição malformada |
| `CONFLICT` | 409 | Conflito de estado (ex: task já rodando) |
| `INTERNAL_ERROR` | 500 | Erro interno do servidor |

## 🔧 Configuração

### Variáveis de Ambiente

```env
# API Configuration
API_KEY=sua_api_key_segura_aqui
PORT=3000

# Database
DATABASE_URL="file:./dev.db"

# GitHub Integration
GITHUB_TOKEN=ghp_seu_token_github_aqui

# Runner Configuration (opcional)
WORKSPACE_ROOT=/workspaces
```

### Requisitos

- Node.js 20.x ou superior
- npm/yarn/pnpm
- SQLite3

## 🚀 Execução

### Instalação

```bash
npm install
```

### Migrações do Banco de Dados

```bash
npx prisma migrate dev
```

### Desenvolvimento

```bash
npm run dev
```

API estará disponível em: `http://localhost:3000`

Documentação Swagger: `http://localhost:3000/documentation`

### Produção

```bash
npm run build
npm start
```

### Docker

```bash
docker-compose up -d
```

## 🧪 Testes

### Executar Todos os Testes

```bash
npm test
```

### Testes com Cobertura

```bash
npm run coverage
```

### Cobertura Atual

- **Statements:** > 80%
- **Branches:** > 75%
- **Functions:** > 80%
- **Lines:** > 80%

## 📦 Exemplos de Uso

### cURL

#### Criar Task
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua-api-key" \
  -d '{
    "title": "Implementar feature X",
    "description": "Adicionar funcionalidade de export. Repo: https://github.com/user/repo"
  }'
```

#### Listar Tasks
```bash
curl http://localhost:3000/tasks \
  -H "x-api-key: sua-api-key"
```

#### Executar Task
```bash
curl -X POST http://localhost:3000/tasks/1/run \
  -H "x-api-key: sua-api-key"
```

#### Obter Logs
```bash
curl http://localhost:3000/tasks/1/logs \
  -H "x-api-key: sua-api-key"
```

### JavaScript/TypeScript

```typescript
const API_KEY = 'sua-api-key';
const BASE_URL = 'http://localhost:3000';

async function createTask(title: string, description: string) {
  const response = await fetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({ title, description }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API Error: ${error.error.message}`);
  }
  
  return response.json();
}

async function runTask(taskId: number) {
  const response = await fetch(`${BASE_URL}/tasks/${taskId}/run`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
    },
  });
  
  return response.json();
}

// Uso
const task = await createTask(
  'Fix bug in authentication',
  'Fix the login timeout issue. Repo: https://github.com/user/repo'
);
console.log('Task created:', task.id);

const execution = await runTask(task.id);
console.log('Execution started:', execution.runnerPid);
```

### Python

```python
import requests

API_KEY = 'sua-api-key'
BASE_URL = 'http://localhost:3000'

headers = {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json'
}

# Criar task
response = requests.post(
    f'{BASE_URL}/tasks',
    headers=headers,
    json={
        'title': 'Implementar API endpoint',
        'description': 'Criar endpoint de relatórios. Repo: https://github.com/user/repo'
    }
)
task = response.json()
print(f"Task criada: {task['id']}")

# Executar task
response = requests.post(
    f"{BASE_URL}/tasks/{task['id']}/run",
    headers=headers
)
execution = response.json()
print(f"Execução iniciada: PID {execution['runnerPid']}")

# Obter logs
response = requests.get(
    f"{BASE_URL}/tasks/{task['id']}/logs",
    headers=headers
)
logs_data = response.json()
for log in logs_data['logs']:
    print(log)
```

## 🔒 Segurança

### Boas Práticas

1. **Nunca commite** o arquivo `.env` com API keys reais
2. Use **HTTPS** em produção
3. Rotacione **API keys** periodicamente
4. Implemente **rate limiting** para prevenir abuso
5. Monitore **logs de acesso** para detectar atividades suspeitas
6. Use **secrets management** (AWS Secrets Manager, HashiCorp Vault, etc)

### Headers de Segurança Recomendados

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

## 📚 Recursos Adicionais

- [Documentação Fastify](https://www.fastify.io/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Zod Documentation](https://zod.dev/)
- [Swagger/OpenAPI](https://swagger.io/)

## 📄 Licença

MIT

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor, abra uma issue ou PR no repositório.
