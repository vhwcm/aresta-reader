---
name: aresta-memory-guide
description: >-
  Guia de desenvolvimento do serviço aresta-memory (:3005, DB :5435). Use esta skill para trabalhar com
  anotações e highlights vetoriais (PostgreSQL 16 com extensão pgvector), algoritmo SM-2 de repetição
  espaçada para flashcards, deck diário de revisão, grafo de temas e apostilas didáticas.
---

# aresta-memory — Memória Semântica, pgvector, Repetição Espaçada SM-2 e Grafo

Guia técnico do serviço de memória e retenção de conhecimento do ecossistema Aresta (`aresta-memory`), construído com Express, TypeScript, Prisma ORM e PostgreSQL 16 com a extensão **`pgvector`**.

---

## 1. Responsabilidades e Arquitetura

- **Porta HTTP:** `3005`
- **Banco de Dados:** PostgreSQL 16 na porta `5435` (`aresta_memory_db`) com extensão `vector`.
- **Dependência de Runtime:** `aresta-ai` (:3002) para geração de embeddings vetoriais (1536d) via `text-embedding-004`.
- **Funcionalidades Centrais:**
  1. Anotações (highlights) com busca semântica por similaridade de cosseno.
  2. Flashcards com o algoritmo clássico de repetição espaçada SuperMemo 2 (SM-2).
  3. Grafo conceitual de temas, tópicos e disciplinas conectadas.
  4. Agregação de livretos didáticos para estudos guiados.

---

## 2. Busca Semântica com `pgvector`

O campo de embedding é tipado como `vector(1536)` no PostgreSQL. O Prisma não possui suporte nativo completo ao tipo de dados do pgvector, portanto consultas de similaridade utilizam SQL bruto via `prisma.$queryRaw`:

```ts
// Exemplo de busca semântica por proximidade de cosseno (<=>)
const similarAnnotations = await prisma.$queryRaw`
  SELECT id, content, color, book_id,
         1 - (embedding <=> ${vectorStr}::vector) as similarity
  FROM annotations
  WHERE user_id = ${userId}
  ORDER BY embedding <=> ${vectorStr}::vector
  LIMIT 5;
`;
```

---

## 3. Algoritmo SM-2 de Repetição Espaçada

O serviço implementa a fórmula clássica do SM-2 para atualizar os cartões após a resposta do leitor (`quality` de 0 a 5):

- Se `quality >= 3`:
  - Se `repetitions == 0` ➔ `interval = 1` dia
  - Se `repetitions == 1` ➔ `interval = 6` dias
  - Se `repetitions > 1` ➔ `interval = round(interval * easeFactor)`
  - `repetitions = repetitions + 1`
- Se `quality < 3`:
  - `repetitions = 0`
  - `interval = 1` dia
- Novo fator de facilidade:
  $$EF' = EF + (0.1 - (5 - quality) \times (0.08 + (5 - quality) \times 0.02))$$
  (Limitado ao mínimo de $1.3$).

---

## 4. Endpoints Principais

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/api/annotations` | Salva anotação, chama `aresta-ai` para calcular embedding e persiste no banco. |
| `GET` | `/api/annotations/search` | Busca anotações semanticamente próximas a um termo ou pergunta. |
| `GET` | `/api/flashcards/due` | Retorna o deck diário de cartões pendentes de revisão para hoje. |
| `POST` | `/api/flashcards/:id/review` | Registra a nota (0-5) da revisão e recalcula o agendamento SM-2. |
| `GET` | `/api/themes/graph` | Retorna nós e arestas do grafo conceitual de conhecimento do usuário. |
| `GET` | `/api/didactic` | Lista apostilas didáticas geradas para consolidação de aprendizado. |

---

## 5. Variáveis de Ambiente (`aresta-memory/.env`)

```env
NODE_ENV=development
PORT=3005
DATABASE_URL=postgresql://aresta:password@localhost:5435/aresta_memory_db
JWT_SECRET=sua-chave-jwt-secreta-compartilhada
AI_SERVICE_URL=http://localhost:3002
```

---

## 6. Quality Gates e Comandos de Execução

```bash
cd aresta-memory

# Subir contêiner com pgvector:
docker compose up -d memory-db

# Rodar migrações e seeds:
npx prisma migrate dev --name init
npx prisma db seed

# Iniciar em modo dev:
npm run dev

# Quality Gate Obrigatório (100% verde antes de qualquer commit):
npm run build && npm run test
```
