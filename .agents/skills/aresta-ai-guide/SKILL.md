---
name: aresta-ai-guide
description: >-
  Guia de desenvolvimento e consumo do microsserviço aresta-ai (:3002). Use esta skill para trabalhar
  com integração Google Gemini, geração de embeddings vetoriais 1536d (text-embedding-004), geração
  automática de flashcards pedagógicos, tradução contextual, sumarização de capítulos e tutor didático.
---

# aresta-ai — Wrapper Gemini API, Embeddings 1536d e Ferramentas Pedagógicas

Guia técnico do serviço de inteligência artificial do ecossistema Aresta (`aresta-ai`), um wrapper stateless sobre os modelos generativos da **Google Gemini API**.

---

## 1. Responsabilidades e Arquitetura

- **Porta HTTP:** `3002`
- **Banco de Dados:** Nenhum (stateless). Não persiste dados de longo prazo.
- **Autenticação:** Todos os endpoints exigem validação de Bearer JWT emitido por `aresta-auth`.
- **Modelos Utilizados:**
  - `gemini-1.5-flash`: Tradução, resumos rápidos, geração de flashcards e respostas didáticas.
  - `text-embedding-004`: Geração de vetores semânticos densos de 1536 dimensões (utilizados para busca vetorial por cosseno no `aresta-memory`).

---

## 2. Endpoints da API

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/api/ai/embed` | Gera vetor numérico float de 1536 posições para um texto ou anotação. |
| `POST` | `/api/ai/flashcard` | Recebe um trecho de texto e contexto e gera pergunta/resposta estruturada (RAG). |
| `POST` | `/api/ai/translate` | Traduz texto selecionado para a língua alvo configurada pelo usuário. |
| `POST` | `/api/ai/summarize` | Sumariza capítulos, notas densas ou seções de livros com marcadores-chave. |
| `POST` | `/api/ai/didactic` | Gera explicações em múltiplos níveis pedagógicos (intuitivo, formal, análogo). |

---

## 3. Formato dos Payloads

### Geração de Embeddings (`POST /api/ai/embed`):
```json
// Requisição:
{
  "text": "A gravidade é a curvatura do espaço-tempo provocada pela massa."
}

// Resposta:
{
  "embedding": [0.0124, -0.0452, 0.0891, ...], // 1536 dimensões
  "dimensions": 1536
}
```

### Geração de Flashcards (`POST /api/ai/flashcard`):
```json
// Requisição:
{
  "content": "A fotossíntese ocorre nos cloroplastos utilizando luz solar, CO2 e água.",
  "bookTitle": "Biologia Celular"
}

// Resposta:
{
  "front": "Em qual organela celular ocorre a fotossíntese e quais são seus reagentes principais?",
  "back": "Ocorre nos cloroplastos, utilizando luz solar, dióxido de carbono (CO2) e água."
}
```

---

## 4. Variáveis de Ambiente e Chaves Especializadas (`aresta-ai/.env`)

O serviço suporta chaves e modelos dedicados para diferentes workloads com **fallback automático** para a chave geral:

```env
PORT=3002
NODE_ENV=development
JWT_SECRET=sua-chave-jwt-secreta-compartilhada

# Chave Geral Padrão
GEMINI_API_KEY=sua-chave-gemini-aqui
GEMINI_MODEL=gemini-1.5-flash
GEMINI_EMBED_MODEL=text-embedding-004

# Chaves Opcionais Especializadas (Fallback automático para GEMINI_API_KEY)
GEMINI_FLASHCARD_API_KEY=
GEMINI_FLASHCARD_MODEL=gemini-1.5-flash
GEMINI_DIDACTIC_API_KEY=
GEMINI_DIDACTIC_MODEL=gemini-1.5-flash
```

---

## 5. Quality Gates e Comandos de Execução

```bash
cd aresta-ai

# Instalar dependências:
npm install

# Rodar serviço em modo desenvolvimento:
npm run dev

# Quality Gate Obrigatório (100% verde antes de qualquer commit):
npm run build && npm run test
```
