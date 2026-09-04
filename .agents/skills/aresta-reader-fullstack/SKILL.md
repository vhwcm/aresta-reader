---
name: aresta-reader-fullstack
description: >-
  Guia arquitetural e operacional completo do projeto aresta-reader (backend Express :3003 e frontend
  Nuxt 3 :3010). Use esta skill para entender a estrutura de pastas do reader, fluxo de upload e
  leitura de EPUB/PDF, modelos de banco (Book, UserBook, Themes), adaptadores de leitura, persistência
  offline e execução dos quality gates do módulo.
---

# aresta-reader — Arquitetura Fullstack, Fluxos e Quality Gates

O **aresta-reader** é o aplicativo de leitura de ebooks digitais (EPUB e PDF) do ecossistema Aresta, com suporte a Web, Desktop (Tauri) e Android APK.

---

## 1. Estrutura de Diretórios

O módulo é composto por duas aplicações:

```
aresta-reader/
├── backend/                  # API Express (TypeScript) na porta 3003
│   ├── prisma/               # Schema e migrações PostgreSQL 16 (porta 5433)
│   ├── src/
│   │   ├── config/           # Conexão de banco e URLs de microsserviços
│   │   ├── controllers/      # book, userBook, sync
│   │   ├── middlewares/      # jwt.middleware.ts
│   │   ├── routes/           # Rotas REST
│   │   ├── services/         # Regras de negócio
│   │   └── server.ts         # Ponto de entrada Express
│   ├── storage/              # Armazenamento local de arquivos EPUB/PDF e capas
│   └── tests/                # Testes de integração e unitários com Vitest
└── front/                    # Interface Nuxt 3 (Vue 3, Pinia) na porta 3010
    ├── app/
    │   ├── adapters/         # Document adapters (EPUB foliate-js, PDF pdfjs-dist)
    │   │   ├── database/     # DatabaseManager (Tauri SQLite, Dexie/IndexedDB)
    │   │   └── storage/      # StorageManager (OPFS no browser, Tauri FS)
    │   ├── components/       # Componentes de leitura, anotações, grafo e modais
    │   ├── composables/      # Composables de leitura, virada de página e física
    │   ├── pages/            # Rotas da aplicação (/reader, /library, etc.)
    │   └── stores/           # Pinia stores (reader, library, annotations)
    └── src-tauri/            # Configurações do runtime Tauri v2 (Desktop & Mobile)
```

---

## 2. Portas e Dependências

- **Backend API:** `http://localhost:3003`
- **Frontend Dev:** `http://localhost:3010`
- **Banco de Dados:** PostgreSQL 16 na porta `5433` (`aresta_reader_db`)
- **Dependências de Rede:**
  - `aresta-auth` (:3001) — validação de JWT e tracking de leitura
  - `aresta-memory` (:3005) — sincronização de anotações e flashcards
  - `aresta-ai` (:3002) — tradução, resumos e tutor didático

---

## 3. Fluxo de Funcionamento: Upload e Leitura de Livros

```
[ Usuário faz Upload de EPUB / PDF no Frontend ]
                     │
                     ▼ POST /api/books (Multer multipart/form-data)
[ Backend armazena arquivo em ./storage/books/ ]
                     │
                     ├─▶ Extrai metadados (Título, Autor, Capa)
                     ├─▶ Salva registro na tabela 'books'
                     └─▶ Cria vínculo inicial em 'user_books' (status: "QUERO_LER")
                     │
                     ▼
[ Usuário abre o Livro na Rota /reader/:id ]
                     │
                     ├─▶ Frontend baixa o binário (ou recupera do OPFS/Tauri FS local)
                     ├─▶ BookDocumentFactory instancia EpubDocumentAdapter ou PdfDocumentAdapter
                     ├─▶ Carrega seção atual via CFI (EPUB) ou página numérica (PDF)
                     └─▶ Inicializa motor 3D de folheamento (Three.js WebGL)
```

---

## 4. Variáveis de Ambiente

### Backend (`aresta-reader/backend/.env`):
```env
PORT=3003
NODE_ENV=development
DATABASE_URL=postgresql://aresta:password@localhost:5433/aresta_reader_db
JWT_SECRET=sua-chave-jwt-secreta-compartilhada
AUTH_SERVICE_URL=http://localhost:3001
MEMORY_SERVICE_URL=http://localhost:3005
AI_SERVICE_URL=http://localhost:3002
STORAGE_PATH=./storage
```

### Frontend (`aresta-reader/front/.env`):
```env
NUXT_PUBLIC_READER_API_URL=http://localhost:3003
NUXT_PUBLIC_AUTH_API_URL=http://localhost:3001
NUXT_PUBLIC_MEMORY_API_URL=http://localhost:3005
NUXT_PUBLIC_AI_API_URL=http://localhost:3002
```

---

## 5. Comandos de Desenvolvimento

```bash
# Iniciar o banco de dados dedicado:
cd aresta-reader
docker compose up -d reader-db

# Rodar backend:
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev

# Rodar frontend web:
cd ../front
npm install
npm run dev

# Rodar frontend desktop (Tauri):
npm run tauri:dev
```

---

## 6. Regras Inegociáveis de Quality Gates

Sempre antes de concluir qualquer tarefa ou realizar commit/push:

```bash
# 1. Backend:
cd aresta-reader/backend
npm run build && npm run test

# 2. Frontend:
cd ../front
npm run lint && npm run typecheck && npm run test
```
