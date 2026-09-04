# Diagrama de Objetos — aresta-reader

Este documento retrata um cenário real de tempo de execução durante uma sessão ativa de leitura de um livro digital EPUB com persistência local e renderização 3D.

```mermaid
classDiagram
    direction TB

    object "activeBook : Book" as b1 {
        id = 42
        title = "Neuromancer"
        file_path = "uploads/books/42_neuromancer.epub"
        cover_path = "uploads/covers/42_cover.jpg"
        file_type = "epub"
        created_at = "2026-08-15T10:00:00Z"
    }

    object "bookMeta : BookPublicInfo" as bp1 {
        id = 15
        book_id = 42
        author = "William Gibson"
        summary = "Obra seminal do cyberpunk focada em Case e na inteligência artificial Wintermute."
    }

    object "userReadingProgress : UserBook" as ub1 {
        id = 89
        user_id = 1
        book_id = 42
        status = "LENDO"
        current_page = 134
        last_accessed_at = "2026-09-03T21:40:00Z"
    }

    object "epubAdapterInstance : EpubDocumentAdapter" as adapter {
        currentLocationCfi = "epubcfi(/6/14[ch04]!/4/2/12/1:45)"
        totalPages = 318
        zoomScale = 1.0
        isTwoPageSpread = false
    }

    object "pageCurlEngine : UsePageCurl3D" as curl {
        curlAngle = 45.2
        curlProgress = 0.62
        isDragging = true
        lightIntensity = 0.85
        shadowOpacity = 0.4
    }

    object "localDbManager : DatabaseManager" as dbMan {
        adapterType = "TauriSqliteAdapter"
        isOnline = true
        pendingMutationsCount = 1
    }

    object "pendingSync : SyncQueueEntry" as syncItem {
        id = "mut_89a_992"
        entity = "user_books"
        operation = "UPDATE"
        payload = "{ current_page: 134, status: 'LENDO' }"
        retryCount = 0
    }

    b1 *-- bp1 : publicInfo
    b1 *-- ub1 : userBooks[0]
    adapter ..> b1 : decodifica arquivo
    curl ..> adapter : captura textura de página
    dbMan *-- syncItem : enfileira mutação
    dbMan ..> ub1 : replica estado
```
