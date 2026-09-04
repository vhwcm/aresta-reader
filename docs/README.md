# Documentação de Arquitetura — aresta-reader

Bem-vindo à documentação de arquitetura do **aresta-reader**, o aplicativo de leitura de livros digitais (EPUB, PDF, apostilas didáticas) com animação de virada de página WebGL 3D e sincronização offline-first.

## Diagramas Arquiteturais Disponíveis

1. [**Diagrama de Classes**](./classes.md)
   - Modelos relacionais Prisma (`Book`, `UserBook`, `Theme`), adaptadores de documento polimórficos (`IDocumentAdapter`, `EpubDocumentAdapter`, `PdfDocumentAdapter`), motor 3D de folheamento e persistência offline (`DatabaseManager`).
2. [**Diagrama de Estados**](./states.md)
   - Ciclo de vida do livro (`QUERO_LER` ➔ `LENDO` ➔ `LIDO`), máquina de estados da física e shader de curvatura de página WebGL 3D, e fila de sincronização offline-first com resolução de conflitos (LWW).
3. [**Diagrama de Objetos**](./objects.md)
   - Cenário de instâncias em tempo de execução contendo livro ativo, progresso de leitura, adaptação de renderizador e mutações pendentes na fila local.
4. [**Diagrama de Pacotes**](./packages.md)
   - Separação entre os subsistemas `backend/` (Express :3003, Prisma, uploads) e `front/` (Nuxt 3 :3010, adaptadores, stores Pinia, WebGL e motor offline).
