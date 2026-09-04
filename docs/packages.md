# Diagrama de Pacotes — aresta-reader

Este documento descreve a divisão dos pacotes e subsistemas do `aresta-reader`, integrando o ecossistema do Backend (Express/Prisma) e do Frontend (Nuxt 3/Tauri/WebGL).

```mermaid
graph TD
    subgraph ArestaReaderFullstack["aresta-reader"]
        
        %% BACKEND
        subgraph BackendPkg["backend/ (Express :3003)"]
            ServerBack["server.ts"]
            
            subgraph BackControllers["src/controllers/"]
                BookController["book.controller.ts"]
                UserBookController["userBook.controller.ts"]
                SyncController["sync.controller.ts"]
            end

            subgraph BackServices["src/services/"]
                BookService["book.service.ts"]
                UserBookService["userBook.service.ts"]
                SyncService["sync.service.ts"]
            end

            subgraph BackPrisma["prisma/"]
                PrismaSchema["schema.prisma"]
                MigrationsReader["migrations/"]
            end

            subgraph UploadsFolder["uploads/"]
                EpubStorage["books/*.epub"]
                CoverStorage["covers/*.jpg"]
            end
        end

        %% FRONTEND
        subgraph FrontendPkg["front/ (Nuxt 3 :3010)"]
            AppVue["app/app.vue"]

            subgraph AdaptersLayer["app/adapters/"]
                EpubAdapter["EpubDocumentAdapter.ts (foliate-js)"]
                PdfAdapter["PdfDocumentAdapter.ts (pdfjs-dist)"]
                DidacticAdapter["DidacticDocumentAdapter.ts"]
            end

            subgraph StoresLayer["app/stores/"]
                ReaderStore["reader.store.ts (Pinia)"]
                SyncStore["sync.store.ts (Pinia)"]
            end

            subgraph ComposablesLayer["app/composables/"]
                UsePageCurl["usePageCurl3D.ts (WebGL Engine)"]
                UseReaderNav["useReaderNavigation.ts"]
                UseAIAssistant["useAIAssistant.ts"]
            end

            subgraph ComponentsLayer["app/components/"]
                ReaderView["ReaderView.vue"]
                PageCurlCanvas["PageCurlCanvas.vue"]
                ShelfGrid["BookShelf.vue"]
                NoteModal["AnnotationModal.vue"]
            end

            subgraph OfflineEngine["app/lib/ (Offline-First)"]
                DatabaseManager["DatabaseManager.ts"]
                TauriSqlite["TauriSqliteAdapter.ts"]
                DexieDb["DexieAdapter.ts"]
                StorageManager["StorageManager.ts (OPFS/FS)"]
            end
        end
    end

    subgraph EcosystemAPIs["Microsserviços Externos"]
        AuthServiceAPI["aresta-auth (:3001)"]
        AiServiceAPI["aresta-ai (:3002)"]
        MemoryServiceAPI["aresta-memory (:3005)"]
    end

    subgraph DatabaseReader["Banco de Dados Relacional"]
        PostgresReader[("PostgreSQL 16 (:5433)\naresta_reader")]
    end

    %% Relações Frontend
    AppVue --> ComponentsLayer
    ComponentsLayer --> ComposablesLayer
    ComponentsLayer --> AdaptersLayer
    ComponentsLayer --> StoresLayer
    StoresLayer --> OfflineEngine
    OfflineEngine -->|Sincronização REST| BackControllers

    %% Relações Backend
    ServerBack --> BackControllers
    BackControllers --> BackServices
    BackServices --> BackPrisma
    BackServices --> UploadsFolder
    BackPrisma --> PostgresReader

    %% Integrações do ecossistema
    UseAIAssistant --> AiServiceAPI
    NoteModal --> MemoryServiceAPI
    BackControllers --> AuthServiceAPI
```
