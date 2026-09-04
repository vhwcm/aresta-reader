# Diagrama de Estados — aresta-reader

Este documento descreve as máquinas de estado presentes no `aresta-reader`, contemplando o status de leitura do usuário, o ciclo do motor de virada de página WebGL 3D e o sincronizador offline-first.

## 1. Ciclo de Vida do Livro (Status de Leitura do Usuário)

```mermaid
stateDiagram-v2
    [*] --> QueroLer : Livro adicionado à biblioteca

    QueroLer --> Lendo : Primeiro acesso ao leitor / primeira página folheada
    
    state Lendo {
        [*] --> EmProgresso
        EmProgresso --> EmProgresso : Atualização de página / CFI
        EmProgresso --> Pausado : Sessão de leitura interrompida
        Pausado --> EmProgresso : Retorno à leitura
    }

    Lendo --> Lido : Última página alcançada ou marcação explícita
    Lendo --> Abandonado : Usuário interrompe leitura por longo período / arquivamento

    Abandonado --> Lendo : Retomada da leitura
    Lido --> Lendo : Releitura iniciada
    Lido --> [*]
```

## 2. Máquina de Estados da Animação de Virada de Página (WebGL 3D Curl)

```mermaid
stateDiagram-v2
    [*] --> Idle : Página estática exibida no viewport

    Idle --> TouchDetected : Início de gesto de arrasto (Touch/Pointer Down na borda)
    
    state Dragging {
        [*] --> CalculatingCurlDeformation
        CalculatingCurlDeformation --> UpdatingShaders : Injeção de uniformes (curlAngle, spineOffset)
        UpdatingShaders --> CalculatingCurlDeformation : Movimento contínuo do ponteiro
    }

    TouchDetected --> Dragging : Deslocamento de arrasto > 5px
    
    Dragging --> ReleaseGesture : Ponteiro liberado (Touch/Pointer Up)

    state EvaluatingRelease {
        [*] --> CheckThreshold
        CheckThreshold --> CompleteTurn : Deslocamento > 35% da largura da tela OU velocidade rápida
        CheckThreshold --> CancelTurn : Deslocamento < 35% da largura e velocidade baixa
    }

    ReleaseGesture --> EvaluatingRelease
    
    CompleteTurn --> AnimatingFlip : Interpolação até 100% da curva
    CancelTurn --> AnimatingSnapBack : Interpolação de volta para 0%

    AnimatingFlip --> PageSwitched : Incrementa índice de página e inverte texturas do buffer
    AnimatingSnapBack --> Idle : Mantém página original
    PageSwitched --> Idle : Renderização da nova página concluída
```

## 3. Máquina de Estados da Sincronização Offline-First

```mermaid
stateDiagram-v2
    [*] --> LocalDatabaseIdle : Leitura ocorrendo no cliente

    LocalDatabaseIdle --> MutationQueued : Marcação de página / highlight criado offline
    MutationQueued --> StoragePersisted : Salvo no SQLite/Dexie local

    StoragePersisted --> CheckingConnectivity : Disparo periódico ou evento online

    state CheckingConnectivity {
        [*] --> PingServer
        PingServer --> Connected : Backend :3003 respondeu com sucesso
        PingServer --> Disconnected : Sem rede ou timeout
    }

    Disconnected --> StoragePersisted : Aguarda restabelecimento da conexão
    Connected --> PushingMutations : Envia lote de mutações da fila (POST /api/sync/push)

    state ResolvingPayload {
        [*] --> ProcessBatch
        ProcessBatch --> SuccessClean : Servidor confirmou timestamp mais recente
        ProcessBatch --> ConflictFound : Versão do servidor é posterior à versão local
        ConflictFound --> LastWriteWinsResolution : Resolução via LWW (Last-Write-Wins)
        LastWriteWinsResolution --> SuccessClean
    }

    PushingMutations --> ResolvingPayload
    SuccessClean --> LocalDatabaseIdle : Fila de sincronização esvaziada
```
