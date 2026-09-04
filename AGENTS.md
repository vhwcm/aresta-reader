# aresta-reader — Ebook Reader App

Aplicativo de leitura de livros digitais do ecossistema Aresta.
Disponível como app web, desktop (Tauri) e APK Android.

## Estrutura
- `backend/` — Express API (porta 3003) com PostgreSQL 16 via Prisma
- `front/` — Nuxt/Vue (porta 3010 em dev) + Tauri (desktop + APK Android)

## Portas
- Backend API: 3003
- Frontend dev: 3010

## Banco: PostgreSQL 16 (`aresta_reader_db`)

## Banco Local (Offline-First)
O frontend Tauri usa `@tauri-apps/plugin-sql` com `sqlite:aresta-reader.db`
para armazenar progresso de leitura, anotações pendentes e flashcards localmente.

## Formatos suportados: EPUB (foliate-js) e PDF (pdfjs-dist)

## Dependências de Runtime
- aresta-auth (:3001) — valida JWT
- aresta-memory (:3005) — anotações, flashcards, grafo
- aresta-ai (:3002) — tradução, sumarizar, gerar flashcards

## Regra Inegociável de Quality Gates
É **MANDATÓRIO** e **INEGOCIÁVEL** verificar e garantir que todos os Quality Gates abaixo estejam passando (100% verde) antes de concluir qualquer tarefa ou realizar qualquer commit/push. Nunca finalize uma alteração sem validar:
```bash
# Backend
cd backend && npm run build && npm run test
# Frontend
cd front && npm run lint && npm run typecheck && npm run test
```

