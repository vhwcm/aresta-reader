---
name: aresta-reader-backend
description: >-
  Guia técnico aprofundado do backend do aresta-reader (Express :3003, Prisma, PostgreSQL 16 na porta 5433).
  Use esta skill para desenvolver e depurar rotas de livros, upload multer, extração de capas,
  progresso de leitura (UserBook), sincronização de biblioteca, modelos de banco de dados,
  migrações Prisma e testes vitest.
---

# aresta-reader (Backend) — Express API, Prisma, Storage e Sincronização

Guia técnico do backend do leitor de ebooks (`aresta-reader/backend`), desenvolvido com Node.js, Express, TypeScript, Prisma ORM e PostgreSQL 16.

---

## 1. Arquitetura de Pastas

```
backend/
├── prisma/
│   ├── schema.prisma         # Modelos: Book, BookPublicInfo, UserBook, Theme, ThemeHierarchy, BookTheme
│   └── migrations/           # Histórico de migrações SQL
├── src/
│   ├── config/
│   │   ├── database.ts       # Instância do PrismaClient
│   │   └── services.config.ts# URLs dos microsserviços (auth, memory, ai)
│   ├── controllers/
│   │   ├── book.controller.ts     # Upload, listagem, remoção e metadados de livros
│   │   ├── userBook.controller.ts # Progresso de leitura, status, última página/CFI
│   │   └── sync.controller.ts     # Sincronização em lote com clientes offline (Tauri)
│   ├── middlewares/
│   │   └── jwt.middleware.ts      # Extrai e valida Bearer JWT (define req.user)
│   ├── routes/
│   │   ├── book.routes.ts         # /api/books
│   │   ├── userBook.routes.ts     # /api/user-books
│   │   └── sync.routes.ts         # /api/sync
│   ├── services/
│   │   ├── book.service.ts        # Extração de arquivos, validações e persistência
│   │   ├── userBook.service.ts    # Lógica de atualização de leitura e status
│   │   └── sync.service.ts        # Reconciliação de progresso offline
│   └── server.ts             # Inicialização do Express, middlewares globais e rotas
├── storage/                  # Armazenamento de arquivos binários (.epub, .pdf) e thumbnails
└── tests/                    # Suíte Vitest (book.test.ts, etc.)
```

---

## 2. Modelo de Banco de Dados (Prisma Schema)

O banco PostgreSQL dedicado roda na porta `5433`.

```prisma
model Book {
  id          Int             @id @default(autoincrement())
  title       String
  file_path   String
  cover_path  String?
  file_type   String          @default("epub")
  created_at  DateTime        @default(now())
  publicInfo  BookPublicInfo?
  userBooks   UserBook[]
  bookThemes  BookTheme[]

  @@map("books")
}

model BookPublicInfo {
  id         Int      @id @default(autoincrement())
  book_id    Int      @unique
  author     String
  summary    String?
  created_at DateTime @default(now())
  updated_at DateTime @default(now()) @updatedAt
  book       Book     @relation(fields: [book_id], references: [id], onDelete: Cascade)

  @@map("book_public_infos")
}

model UserBook {
  id               Int       @id @default(autoincrement())
  user_id          Int       // Referência externa ao User.id do aresta-auth
  book_id          Int
  status           String    @default("QUERO_LER") // LENDO, LIDO, QUERO_LER
  current_page     Int       @default(0)
  last_accessed_at DateTime?
  created_at       DateTime  @default(now())
  updated_at       DateTime  @default(now()) @updatedAt
  book             Book      @relation(fields: [book_id], references: [id], onDelete: Cascade)

  @@unique([user_id, book_id])
  @@map("user_books")
}

model Theme {
  id                Int               @id @default(autoincrement())
  name              String            @unique
  color             String?           @default("#E57B55")
  description       String?
  embedding         String?
  created_at        DateTime          @default(now())
  parentHierarchies ThemeHierarchy[]  @relation("ParentTheme")
  childHierarchies  ThemeHierarchy[]  @relation("ChildTheme")
  bookThemes        BookTheme[]

  @@map("themes")
}
```

---

## 3. Endpoints Principais

| Método | Rota | Autenticado | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/books` | Sim | Lista todos os livros da biblioteca do usuário autenticado. |
| `POST` | `/api/books` | Sim | Upload de arquivo `.epub` ou `.pdf` (via `multipart/form-data`). |
| `GET` | `/api/books/:id` | Sim | Obtém detalhes e metadados de um livro específico. |
| `GET` | `/api/books/:id/file` | Sim | Stream do arquivo binário (.epub/.pdf) para o leitor. |
| `GET` | `/api/books/:id/cover` | Não | Retorna o thumbnail da capa em imagem JPEG/PNG. |
| `DELETE` | `/api/books/:id` | Sim | Remove livro e seus arquivos associados do storage. |
| `GET` | `/api/user-books/:bookId` | Sim | Retorna o progresso atual de leitura do usuário. |
| `PATCH`| `/api/user-books/:bookId` | Sim | Atualiza página atual, percentual e status de leitura. |
| `POST` | `/api/sync/progress` | Sim | Endpoint de sincronização em lote de clientes offline. |

---

## 4. Manipulação de Arquivos e Storage

1. **Multer Storage:**
   Os uploads são validados para extensões permitidas (`.epub`, `.pdf`) e salvos no diretório configurado por `STORAGE_PATH` (padrão: `./storage`).
2. **Extração de Metadados:**
   Durante o upload de EPUB, o backend lê o arquivo de pacote `.opf` para extrair título, autor e extrair o arquivo de imagem da capa para `./storage/covers/`.
3. **Limpeza em Deleção:**
   Ao remover um livro (`DELETE /api/books/:id`), certifique-se de invocar `fs.unlinkSync` nos caminhos de `file_path` e `cover_path` para evitar arquivos órfãos.

---

## 5. Rotina de Desenvolvimento e Quality Gates

```bash
# Executar migrações Prisma:
npx prisma migrate dev --name <nome-da-migracao>

# Gerar Prisma Client:
npx prisma generate

# Executar backend em desenvolvimento (com auto-reload):
npm run dev

# Quality Gates Obrigatórios:
npm run build && npm run test
```
