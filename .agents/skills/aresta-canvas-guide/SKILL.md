---
name: aresta-canvas-guide
description: >-
  Guia de desenvolvimento e operação do projeto aresta-canvas (Back :3004, Front :3011). Use esta
  skill para trabalhar no quadro infinito (infinite visual canvas), editor de notas Markdown dinâmico,
  banco SQLite 3 local (aresta_canvas.db), prevenção de ciclos em referências bidirecionais e
  sincronização offline com Tauri.
---

# aresta-canvas — Quadro Infinito, Notas em Markdown e SQLite Local

Guia técnico do aplicativo de quadro visual e notas conectadas do ecossistema Aresta (`aresta-canvas`), composto por backend Express (`:3004`) e frontend Nuxt 3 (`:3011`).

---

## 1. Responsabilidades e Arquitetura

- **Backend API:** `http://localhost:3004`
- **Frontend Dev:** `http://localhost:3011`
- **Banco de Dados do Backend:** **SQLite 3** (`aresta_canvas.db`), sem necessidade de container Docker!
- **Banco Local Offline:** `@tauri-apps/plugin-sql` com `sqlite:aresta-canvas.db` no cliente desktop/Android.
- **Conexões do Ecossistema:**
  - `aresta-auth` (:3001) para autenticação JWT.
  - `aresta-memory` (:3005) para vincular notas a nós do grafo conceitual.
  - `aresta-ai` (:3002) para expansão de notas com auxílio de IA.

---

## 2. Conceitos Centrais do Canvas

1. **Quadro Infinito (Visual Canvas):**
   - Espaço bidimensional livre com suporte a zoom infinito, pan contínuo e viewport dinâmico.
   - Nós de múltiplos tipos: `NOTE` (texto markdown), `CANVAS` (sub-quadro embutido), `BOOK` (card de livro do `aresta-reader`) e `LINK`.
2. **Prevenção Rigorosa de Ciclos (Cycle Detection):**
   - Ao conectar dois nós ou embutir um canvas dentro de outro, o backend e frontend executam algoritmo de detecção de ciclo (busca em profundidade - DFS) para evitar referências circulares infinitas:
     $$\text{detectCycle}(u, v) \implies \text{rejeita aresta se } v \rightsquigarrow u$$
3. **Persistência Leve em SQLite:**
   - O backend utiliza o SQLite via Prisma, armazenando o banco diretamente no disco local ou volume Docker (`./data/aresta_canvas.db`).

---

## 3. Endpoints Principais da API (:3004)

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/canvases` | Lista os quadros visuais pertencentes ao usuário. |
| `POST` | `/api/canvases` | Cria um novo canvas com título, tema de cor e dimensões iniciais. |
| `GET` | `/api/canvases/:id` | Retorna todos os nós (`nodes`) e arestas (`edges`) do canvas. |
| `PUT` | `/api/canvases/:id/viewport` | Salva o estado atual de coordenadas `(x, y)` e escala de zoom (`zoom`). |
| `POST` | `/api/nodes` | Adiciona um nó ao canvas (com validação anti-ciclo). |
| `PATCH`| `/api/nodes/:id` | Atualiza posição `(x, y)`, tamanho ou conteúdo em Markdown do nó. |
| `POST` | `/api/edges` | Cria aresta direcionada conectando dois nós. |

---

## 4. Variáveis de Ambiente (`aresta-canvas/backend/.env`)

```env
NODE_ENV=development
PORT=3004
DATABASE_URL=file:./data/aresta_canvas.db
JWT_SECRET=sua-chave-jwt-secreta-compartilhada
AUTH_SERVICE_URL=http://localhost:3001
MEMORY_SERVICE_URL=http://localhost:3005
AI_SERVICE_URL=http://localhost:3002
```

---

## 5. Rotina de Desenvolvimento e Quality Gates

```bash
# 1. Backend:
cd aresta-canvas/backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev

# 2. Frontend Web:
cd ../front
npm install
npm run dev
# Acesse em http://localhost:3011

# Quality Gates Obrigatórios:
# Backend:
cd ../backend && npm run build && npm run test
# Frontend:
cd ../front && npm run lint && npm run typecheck && npm run test
```
