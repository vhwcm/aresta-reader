---
name: aresta-ecosystem
description: >-
  Guia completo de arquitetura, orquestração e desenvolvimento do ecossistema Aresta como um todo.
  Use esta skill para entender a integração global entre serviços (Hub :3000, Auth :3001, AI :3002,
  Reader :3003/:3010, Canvas :3004/:3011, Memory :3005), execução de docker-compose, scripts
  unificados na raiz, autenticação JWT descentralizada, fluxos de dados ponta a ponta,
  troubleshooting de portas e Quality Gates do monorepo.
---

# Ecossistema Aresta — Orquestração, Microsserviços e Monorepo

Este guia fornece a visão holística do **Ecossistema Aresta**, detalhando como os 6 microsserviços se comunicam, como inicializar o ambiente de desenvolvimento, como funciona a autenticação descentralizada e as regras inegociáveis de qualidade.

---

## 1. Visão Geral e Mapa de Serviços

O Ecossistema Aresta é uma plataforma modular voltada para leitura ativa, tomada de notas em canvas infinito e aprendizagem acelerada com repetição espaçada (SM-2) guiada por IA.

```
                                  ┌───────────────────────────┐
                                  │   aresta-hub (Porta 3000) │
                                  │   Portal Central & SSO    │
                                  └─────────────┬─────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
  ┌─────────────────────────────┐                               ┌─────────────────────────────┐
  │   aresta-reader             │                               │   aresta-canvas             │
  │   Back: :3003 | Front: :3010│                               │   Back: :3004 | Front: :3011│
  │   PostgreSQL 16 (:5433)     │                               │   SQLite local              │
  └───────┬──────────────┬──────┘                               └───────┬──────────────┬──────┘
          │              │                                              │              │
          │              └──────────────────────┬───────────────────────┘              │
          ▼                                     ▼                                      ▼
┌──────────────────┐                  ┌──────────────────┐                  ┌──────────────────┐
│   aresta-auth    │                  │  aresta-memory   │                  │    aresta-ai     │
│   Porta: 3001    │◀─────────────────│   Porta: 3005    │─────────────────▶│   Porta: 3002    │
│   Postgres :5431 │ (valida JWT)     │  Postgres :5435  │ (gera embedding) │   Stateless /    │
│   (Emissor JWT)  │                  │   (+ pgvector)   │                  │   Gemini API     │
└──────────────────┘                  └──────────────────┘                  └──────────────────┘
```

| Serviço | Tipo | Porta App / Dev | Porta Banco | Motor de Banco | Função Principal |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`aresta-hub`** | Frontend Nuxt 3 | `3000` | — | — | Portal central, dashboard unificado e launcher de aplicações. |
| **`aresta-auth`** | Backend Express | `3001` | `5431` | PostgreSQL 16 (`aresta_auth_db`) | Emissor do JWT, usuários, perfil, preferências e streaks de leitura. |
| **`aresta-ai`** | Backend Express | `3002` | — | Stateless (Sem banco) | Integração Gemini: embeddings 1536d, flashcards, tradução e resumos. |
| **`aresta-memory`** | Backend Express | `3005` | `5435` | PostgreSQL 16 + `pgvector` | Destaques semânticos, repetição espaçada SM-2 e grafo de conhecimento. |
| **`aresta-reader`** | Fullstack (Nuxt + Express) | Back: `3003`<br>Front: `3010` | `5433` | PostgreSQL 16 (`aresta_reader_db`) | Leitor EPUB/PDF com virada 3D Three.js e suporte offline Tauri/SQLite. |
| **`aresta-canvas`** | Fullstack (Nuxt + Express) | Back: `3004`<br>Front: `3011` | — | SQLite (`aresta_canvas.db`) | Quadro infinito visual, notas em Markdown e links bidirecionais. |

---

## 2. Autenticação Descentralizada (JWT Compartilhado)

Para evitar latência de rede entre microsserviços, o Aresta adota um padrão de **verificação descentralizada com segredo compartilhado**:

1. O usuário efetua login em `aresta-auth` (`POST http://localhost:3001/api/auth/login`).
2. O `aresta-auth` emite um Bearer Token assinado com o `JWT_SECRET`. O token contém payload `{ userId: number, email: string }`.
3. Todos os demais microsserviços (`aresta-ai`, `aresta-memory`, `aresta-reader`, `aresta-canvas`) leem a variável `JWT_SECRET` em seus arquivos `.env` e validam o token localmente via middleware `jsonwebtoken.verify()`.
4. **Regra de ouro:** A variável `JWT_SECRET` deve ser rigorosamente **idêntica** em todos os arquivos `.env` de todos os serviços.

---

## 3. Comandos Rápidos na Raiz (`aresta-projeto`)

A raiz do ecossistema possui um orquestrador unificado (`package.json`) com scripts úteis:

```bash
# ==========================================
# 1. SETUP INICIAL E BANCOS DE DADOS
# ==========================================
npm run setup          # Instala deps de tudo, sobe bancos no Docker e roda migrações Prisma
npm run db:up          # Sobe contêineres Docker: auth-db (:5431), memory-db (:5435) e reader-db (:5433)
npm run db:down        # Encerra contêineres de banco
npm run db:logs        # Acompanha logs dos contêineres

# ==========================================
# 2. INICIALIZAÇÃO DE AMBIENTE DEV
# ==========================================
npm run dev            # Inicia todos os serviços (Hub, 5 Backends e 2 Frontends)
npm run dev:all        # Sobe bancos Docker e inicia todos os serviços concorrentemente
npm run dev:backends   # Inicia apenas as 5 APIs (auth, ai, memory, reader-api, canvas-api)
npm run dev:frontends  # Inicia apenas as 3 interfaces web (hub :3000, reader :3010, canvas :3011)

# Iniciar módulos específicos:
npm run dev:reader     # Inicia reader-back (:3003) e reader-front (:3010)
npm run dev:canvas     # Inicia canvas-back (:3004) e canvas-front (:3011)
npm run dev:hub        # Inicia apenas o portal Hub (:3000)

# ==========================================
# 3. GERENCIAMENTO DE PROCESSOS E PORTAS
# ==========================================
npm run dev:kill       # Mata qualquer processo preso nas portas 3000..3005, 3010 e 3011
npm run dev:clean      # Libera portas travadas e reinicia todo o ecossistema
```

---

## 4. Fluxo de Dados Ponta a Ponta (End-to-End)

Exemplo prático do ciclo de leitura ativa integrando os serviços:

```
[ Usuário lê livro em aresta-reader (front :3010) ]
                       │
                       ▼ Seleciona texto relevante
[ aresta-reader dispara criação de anotação ]
                       │
                       ├──▶ POST :3005/api/annotations (aresta-memory)
                       │          │
                       │          ▼ Chama aresta-ai para vetorizar
                       │    POST :3002/api/ai/embed (vetor 1536d)
                       │          │
                       │          ▼ Salva no PostgreSQL 16 (pgvector)
                       │
                       ├──▶ Criação opcional de Flashcard
                       │          │
                       │          ▼ Gera pergunta/resposta com IA
                       │    POST :3002/api/ai/flashcard
                       │          │
                       │          ▼ Salva em aresta-memory com agendamento SM-2
                       │
                       └──▶ Atualiza streak de leitura
                                  │
                                  ▼ POST :3001/api/auth/streak (aresta-auth)
```

---

## 5. Resolução de Problemas (Troubleshooting)

- **Porta ocupada (`EADDRINUSE: 3000..3005, 3010, 3011`):**
  Rode na raiz `npm run dev:kill` para encerrar os processos zumbis que seguram as portas.
- **Erro de conexão com banco de dados:**
  Verifique se os contêineres Docker estão saudáveis executando `npm run db:logs` ou `docker ps`.
- **Erro no pgvector no `aresta-memory`:**
  O contêiner `memory-db` requer a imagem `pgvector/pgvector:pg16`. Certifique-se de que a extensão `CREATE EXTENSION IF NOT EXISTS vector;` foi executada.
- **Token JWT Inválido entre microsserviços:**
  Verifique se `JWT_SECRET` é exatamente o mesmo valor em todos os arquivos `.env` das aplicações.

---

## 6. Regras Inegociáveis de Quality Gates

Antes de qualquer conclusão de tarefa ou commit/push, execute:

```bash
# Execução de testes de todo o ecossistema na raiz:
npm run test

# Build de produção de todos os serviços:
npm run build
```
