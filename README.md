## Subindo tudo com Docker Compose

No diretório `efizion-factory-api`, rode:

```sh
docker-compose up --build
```

Isso irá subir runner, API e banco de dados integrados, respeitando os caminhos relativos do monorepo.

# Integração Efizion Factory

Este monorepo contém três projetos principais:

- **efizion-agent-runner**: Núcleo de execução de agentes autônomos
- **efizion-factory-api**: API Fastify para orquestração e integração
- **efizion-factory-ui**: Interface web (UI)

## Estrutura de Diretórios

```
~/efizion-factory/
├── efizion-agent-runner/
├── efizion-factory-api/
└── efizion-factory-ui/
```

## Como rodar tudo localmente

1. **Clone o repositório e instale dependências:**

```sh
cd ~/efizion-factory/efizion-agent-runner
npm install
cd ../efizion-factory-api
npm install
cd ../efizion-factory-ui
# (instale dependências da UI se aplicável)
```

2. **Build e start do runner:**

```sh
cd ~/efizion-factory/efizion-agent-runner
npm run build
npm start
```

3. **Start da API (referenciando o runner):**

```sh
cd ~/efizion-factory/efizion-factory-api
npm run build # se aplicável
npm start
```

A API utiliza o runner via comando CLI, usando o caminho relativo `../efizion-agent-runner`.

4. **Start da UI:**

```sh
cd ~/efizion-factory/efizion-factory-ui
# npm start ou comando equivalente
```

## Observações importantes

- Certifique-se de que a API tem permissão de leitura/execução no diretório do runner (`../efizion-agent-runner`).
- Se usar Docker, monte os volumes corretamente para que runner, API e UI compartilhem arquivos se necessário.
- Ajuste variáveis de ambiente em `.env` conforme necessário.

## Scripts úteis

- `npm start` — inicia a API
- `npm run build` — builda a API (se aplicável)

## Exemplo de chamada à API

```sh
curl -X POST http://localhost:3000/tasks/1/run -H "api-key: <SUA_API_KEY>"
```

---

Consulte os READMEs de cada subprojeto para detalhes específicos.