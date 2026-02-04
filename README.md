# Efizion Factory API

API REST para orquestração de agentes de IA autônomos que realizam tarefas de codificação através do efizion-agent-runner.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Endpoints da API](#endpoints-da-api)
- [Autenticação](#autenticação)
- [Middlewares de Segurança](#middlewares-de-segurança)
  - [Rate Limiting](#rate-limiting)
  - [CORS](#cors)
  - [Timeout Global](#timeout-global)
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

## �️ Middlewares de Segurança

A API implementa múltiplas camadas de proteção para garantir segurança e estabilidade.

### Rate Limiting

**Proteção contra abuso e ataques de força bruta.**

**Limite:** 100 requisições por minuto por endereço IP

Quando o limite é excedido, a API retorna:

**Status Code:** `429 Too Many Requests`

**Resposta:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again after 60 seconds"
  },
  "timestamp": "2026-02-04T15:30:00.000Z",
  "path": "/tasks"
}
```

**Headers adicionais:**
- `X-RateLimit-Limit`: Limite máximo de requisições
- `X-RateLimit-Remaining`: Requisições restantes no período
- `X-RateLimit-Reset`: Timestamp quando o limite será resetado
- `Retry-After`: Segundos até poder fazer nova requisição

**Exemplo de uso:**
```bash
# Primeira requisição - OK
curl -H "x-api-key: $API_KEY" http://localhost:3000/tasks
# Headers: X-RateLimit-Remaining: 99

# Após 100 requisições em 1 minuto
curl -H "x-api-key: $API_KEY" http://localhost:3000/tasks
# Status: 429 Too Many Requests
# Headers: Retry-After: 45
```

### CORS

**Política de Compartilhamento de Recursos entre Origens.**

A API permite requisições apenas de domínios autorizados, configuráveis via variável de ambiente.

**Configuração:**

Adicione ao `.env`:
```env
CORS_ORIGINS=http://localhost:3000,http://localhost:3100,https://app.efizion.com
```

**Domínios padrão** (se `CORS_ORIGINS` não estiver definido):
- `http://localhost:3000`
- `http://localhost:3100`

**Comportamento:**
- ✅ Requisições de origens permitidas: Aceitas normalmente
- ✅ Requisições sem origin (cURL, Postman, etc): Sempre permitidas
- ❌ Requisições de origens não autorizadas: Bloqueadas pelo navegador

**Exemplo de preflight (OPTIONS):**
```bash
# Origem permitida
curl -X OPTIONS http://localhost:3000/tasks \
  -H "Origin: http://localhost:3100" \
  -H "Access-Control-Request-Method: GET"
# Response: 200/204 com headers CORS

# Origem bloqueada
curl -X OPTIONS http://localhost:3000/tasks \
  -H "Origin: http://malicious-site.com" \
  -H "Access-Control-Request-Method: GET"
# Response: Sem headers Access-Control-Allow-Origin
```

**Erro no navegador (origem bloqueada):**
```
Access to XMLHttpRequest at 'http://localhost:3000/tasks' from origin 
'http://unauthorized.com' has been blocked by CORS policy: Response to 
preflight request doesn't pass access control check: No 
'Access-Control-Allow-Origin' header is present on the requested resource.
```

### Timeout Global

**Proteção contra requisições lentas e travamentos.**

**Limite:** 10 segundos por requisição

Se qualquer requisição ultrapassar 10 segundos, a API retorna:

**Status Code:** `503 Service Unavailable`

**Resposta:**
```json
{
  "error": {
    "code": "TIMEOUT",
    "message": "Request timeout: tempo limite excedido"
  },
  "timestamp": "2026-02-04T15:30:10.000Z",
  "path": "/tasks/123/run"
}
```

**Quando ocorre:**
- Operações de banco de dados muito lentas
- Execução de tasks que demoram para iniciar
- Problemas de rede com serviços externos
- Processamento excessivamente complexo

**Como tratar no cliente:**
```javascript
try {
  const response = await fetch('http://localhost:3000/tasks/1/run', {
    method: 'POST',
    headers: { 'x-api-key': API_KEY },
    timeout: 11000, // Timeout do cliente > timeout do servidor
  });
  
  if (response.status === 503) {
    const error = await response.json();
    if (error.error.code === 'TIMEOUT') {
      console.error('Operação demorou mais de 10 segundos');
      // Implementar retry com backoff exponencial
    }
  }
} catch (error) {
  console.error('Erro na requisição:', error);
}
```

**⚠️ Importante:** Para operações que naturalmente demoram mais de 10 segundos (como execução de tasks), a API inicia o processo em background e retorna imediatamente o PID do runner. Use o endpoint `/tasks/:id/logs` para acompanhar o progresso.

## �📍 Endpoints da API

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
