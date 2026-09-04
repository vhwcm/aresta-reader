---
name: aresta-reader-offline-sync
description: >-
  Guia de persistência offline-first e sincronização de dados do aresta-reader. Use esta skill para
  mexer no DatabaseManager, adaptadores de banco local (TauriSqliteAdapter via @tauri-apps/plugin-sql,
  DexieAdapter para Web/IndexedDB, InMemoryAdapter para testes), StorageManager (OPFS e Tauri FS),
  fila de sincronização (SyncQueue) e resolução de conflitos.
---

# aresta-reader — Persistência Offline-First e Sincronização de Dados

O **aresta-reader** foi projetado com uma arquitetura **offline-first**, permitindo que leitores acessem livros, marquem destaques, criem anotações e revisem flashcards mesmo em ambientes sem conectividade com a internet.

---

## 1. Arquitetura Polimórfica de Banco de Dados (`DatabaseManager`)

O frontend em Nuxt 3 detecta o ambiente de execução em runtime para carregar o adaptador adequado:

```
                          ┌───────────────────────────┐
                          │      DatabaseManager      │
                          └─────────────┬─────────────┘
                                        │
                 ┌──────────────────────┼──────────────────────┐
                 ▼                      ▼                      ▼
      ┌─────────────────────┐┌─────────────────────┐┌─────────────────────┐
      │ TauriSqliteAdapter  ││    DexieAdapter     ││   InMemoryAdapter   │
      │   Desktop & APK     ││     Navegador Web   ││    Testes Unitários │
      │   SQLite nativo     ││      IndexedDB      ││       (Mock RAM)    │
      │ @tauri-apps/plugin- ││                     ││                     │
      │         sql         ││                     ││                     │
      └─────────────────────┘└─────────────────────┘└─────────────────────┘
```

Localização dos arquivos:
- `front/app/adapters/database/DatabaseManager.ts`
- `front/app/adapters/database/TauriSqliteAdapter.ts`
- `front/app/adapters/database/DexieAdapter.ts`
- `front/app/adapters/database/InMemoryAdapter.ts`
- `front/app/adapters/database/types.ts`

---

## 2. Tabelas e Entidades do Banco Local

Tanto no SQLite (`sqlite:aresta-reader.db`) quanto no Dexie, as entidades mantidas localmente são:

| Tabela / Store | Descrição |
| :--- | :--- |
| `books` | Metadados dos livros baixados localmente (id, título, autor, formato, caminho local do binário). |
| `reading_progress` | Posição atual de leitura (book_id, cfi_or_page, percentual, updated_at). |
| `pending_annotations` | Fila de anotações criadas offline aguardando sincronização com `aresta-memory`. |
| `offline_flashcards` | Flashcards baixados para revisão em trânsito com algoritmo SM-2 local. |

---

## 3. Armazenamento de Arquivos Binários (`StorageManager`)

Para guardar arquivos `.epub` e `.pdf` volumosos localmente:

1. **Ambiente Tauri (Desktop e Android):**
   - Usa `TauriFsStorageAdapter` via `@tauri-apps/plugin-fs`.
   - Salva os arquivos no diretório de dados da aplicação (`AppLocalData` ou pasta interna no Android).
2. **Ambiente Navegador Web:**
   - Usa `OpfsStorageAdapter` aproveitando a API **OPFS** (*Origin Private File System*), permitindo alto desempenho de leitura e escrita sem limitações rígidas de LocalStorage.

---

## 4. Fila de Sincronização (`SyncQueue`) e Resolução de Conflitos

Quando a conexão com a internet é restabelecida (`navigator.onLine === true`):

1. **Estratégia Last-Write-Wins (LWW):**
   Para progresso de leitura, o registro com o `updated_at` mais recente tem precedência entre o banco local e o backend.
2. **Despacho em Lote da Fila:**
   - Lê todas as anotações com `sync_status = 'PENDING'` da tabela `pending_annotations`.
   - Envia requisição em lote para `POST /api/sync/progress` no `aresta-reader/backend` e `POST /api/annotations/batch` no `aresta-memory`.
   - Em caso de sucesso (`200 OK`), atualiza o status para `'SYNCED'`.
   - Em caso de erro temporário (timeout, 5xx), implementa *exponential backoff* para nova tentativa posterior.

---

## 5. Como Testar Persistência Local

```bash
# Executar suíte de testes de persistência e adaptadores de banco:
cd front
npx vitest run tests/unit/database/
```
