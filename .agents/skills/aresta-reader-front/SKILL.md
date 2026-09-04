---
name: aresta-reader-front
description: >-
  Guia técnico aprofundado da interface frontend do aresta-reader (Nuxt 3 :3010, Vue 3, Pinia, Tailwind CSS).
  Use esta skill para trabalhar nos componentes de leitor, adaptadores de documento (EpubDocumentAdapter
  com foliate-js, PdfDocumentAdapter com pdfjs-dist, DidacticDocumentAdapter), navegação, anotações,
  modais de IA e dicionário, temas e testes vitest.
---

# aresta-reader (Frontend) — Nuxt 3, Foliate-js, PDF.js e Componentes de Leitura

Guia técnico do frontend do leitor digital (`aresta-reader/front`), desenvolvido com Nuxt 3, Vue 3 Composition API, Pinia, Tailwind CSS, Three.js e suporte híbrido Desktop/Mobile via Tauri.

---

## 1. Estrutura de Diretórios de `front/app`

```
front/app/
├── adapters/
│   ├── BookDocumentFactory.ts        # Factory que seleciona o adapter pelo MIME/extensão
│   ├── IBookDocumentAdapter.ts       # Contrato unificado para renderização de páginas
│   ├── EpubDocumentAdapter.ts        # Renderização EPUB via biblioteca foliate-js
│   ├── PdfDocumentAdapter.ts         # Renderização PDF via pdfjs-dist
│   └── DidacticDocumentAdapter.ts    # Renderização de livretos pedagógicos / Markdown
├── components/
│   ├── reader/
│   │   ├── engine/
│   │   │   └── PageCurlCanvas.vue    # Orquestrador 3D/2D de virada de página
│   │   ├── ReaderTopBar.vue          # Barra superior (progresso, sumário, configurações)
│   │   ├── ReaderBottomBar.vue       # Barra inferior (slider de navegação, página atual)
│   │   ├── ReaderAnnotationDrawer.vue# Gaveta de destaques e anotações ativas
│   │   ├── ReaderAnnotationModal.vue # Modal de criação de nota / flashcard
│   │   ├── ReaderDictionaryCard.vue  # Card de definição de termos e dicionário
│   │   └── HandwritingCanvas.vue     # Canvas de anotações manuais sobre o livro
│   └── graph/
│       ├── BookAnnotationsDrawer.vue # Visualização das anotações em grafo
│       └── ThemeCanvasOverlay.vue    # Mapeamento de temas conceituais sobre as notas
├── composables/
│   ├── reader/
│   │   ├── usePageCurl3D.ts          # Engine Three.js, shaders GLSL de folheamento
│   │   └── usePagePhysics.ts         # Inércia, modelo de arraste e gestos de toque
│   └── useReaderSync.ts              # Sincronização de progresso e anotações
├── stores/
│   ├── reader.ts                     # Estado do livro aberto, página atual, modo (1 ou 2 páginas)
│   └── annotations.ts                # Destaques, cores de marcação e notas locais
└── pages/
    ├── index.vue                     # Tela inicial / vitrine
    ├── library.vue                   # Biblioteca de livros do usuário
    └── reader/[id].vue               # Visão imersiva do leitor
```

---

## 2. Padrão Factory de Documentos (`BookDocumentFactory`)

Para abstrair a complexidade de múltiplos formatos de leitura, a aplicação utiliza a interface `IBookDocumentAdapter`:

```ts
// Exemplo conceitual do contrato
export interface IBookDocumentAdapter {
  init(container: HTMLElement, binaryData: ArrayBuffer): Promise<void>;
  goToPage(pageOrCfi: string | number): Promise<void>;
  renderPageToElement(pageNumber: number, target: HTMLElement): Promise<void>;
  getTotalPages(): number;
  getCurrentLocation(): string | number;
  destroy(): void;
}
```

- **`EpubDocumentAdapter`:** Utiliza o motor `foliate-js` para manipular capítulos XHTML dentro do container EPUB, calculando fatias visuais (spreads) e gerando posições canônicas CFI (*Canonical Fragment Identifier*).
- **`PdfDocumentAdapter`:** Utiliza `pdfjs-dist` para desenhar páginas de documento em elementos `<canvas>` nativos, garantindo renderização nítida via `window.devicePixelRatio`.
- **`DidacticDocumentAdapter`:** Converte resumos e apostilas didáticas estruturadas geradas pelo `aresta-ai` / `aresta-memory` em páginas paginadas fluidas.

---

## 3. Seleção de Texto e Criação de Anotações

1. O leitor escuta eventos de seleção de texto no iframe do EPUB ou no canvas de texto do PDF.
2. Ao disparar `mouseup` ou `touchend`, o popup contextual é posicionado nas coordenadas da seleção.
3. O usuário pode escolher entre 4 ações rápidas:
   - **Destacar (Highlight):** Registra a cor escolhida e salva localmente no `annotationsStore`.
   - **Criar Flashcard:** Abre o `ReaderAnnotationModal` com preenchimento automático de pergunta/resposta via IA (`aresta-ai`).
   - **Traduzir:** Dispara requisição para o serviço de IA traduzir o trecho para o idioma de preferência do usuário.
   - **Dicionário:** Consulta termos desconhecidos no `ReaderDictionaryCard`.

---

## 4. Gerenciamento de Estado (Pinia)

- `reader.ts`: Mantém o livro ativo, formato, número total de páginas, modo de exibição (única página vs folha dupla), progresso percentual e configurações de tipografia (tamanho da fonte, tema sepia/escuro/claro, entrelinha).
- `annotations.ts`: Cache reativo de anotações do livro ativo. Em clientes offline (Tauri), interage diretamente com o `DatabaseManager` antes de tentar sincronizar com `aresta-memory`.

---

## 5. Rotina de Desenvolvimento e Quality Gates

```bash
# Iniciar frontend em desenvolvimento:
npm run dev
# Acesse em http://localhost:3010

# Quality Gates Obrigatórios (100% verde antes de qualquer commit):
npm run lint
npm run typecheck
npm run test
```
