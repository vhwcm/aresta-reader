---
name: aresta-hub-guide
description: >-
  Guia de desenvolvimento do portal central aresta-hub (:3000). Use esta skill para trabalhar na
  aplicação Nuxt 3 do Hub, launcher unificado de módulos, Single Sign-On (SSO), verificação de saúde
  e ping de todos os microsserviços, dashboard consolidado de ofensivas, livros em andamento e revisões pendentes.
---

# aresta-hub — Portal Central, Launcher de Módulos e SSO Integrado

Guia técnico do portal central do ecossistema Aresta (`aresta-hub`), a interface unificada de entrada do ecossistema, desenvolvida em Nuxt 3, Vue 3, Pinia e Tailwind CSS.

---

## 1. Responsabilidades e Arquitetura

- **Porta de Execução:** `http://localhost:3000`
- **Framework:** Nuxt 3 (SSR + Vue 3 Composition API)
- **Funções Primordiais:**
  1. **Launcher Central:** Ponto de navegação rápido para os módulos `aresta-reader` (:3010) e `aresta-canvas` (:3011).
  2. **Single Sign-On (SSO):** Compartilha o token de autenticação e cookies de sessão entre as aplicações.
  3. **Monitor de Saúde dos Microsserviços (Service Ping):** Polling assíncrono para verificar se as 5 APIs (`auth`, `ai`, `memory`, `reader-api`, `canvas-api`) estão ativas e respondendo com status 200.
  4. **Dashboard Consolidado de Aprendizado:**
     - Exibe dias de ofensiva e minutos lidos do `aresta-auth`.
     - Exibe livros lidos recentemente e porcentagem do `aresta-reader`.
     - Exibe contagem de flashcards pendentes para o dia do `aresta-memory`.
     - Exibe atalhos para os últimos quadros editados do `aresta-canvas`.

---

## 2. Monitoramento de Integridade dos Serviços

O Hub mantém um composable `useServiceHealth` que dispara chamadas periódicas do tipo `GET /health` ou pings para cada serviço:

```ts
// Status rastreados: 'online' | 'offline' | 'degraded'
const services = {
  auth: 'http://localhost:3001',
  ai: 'http://localhost:3002',
  reader: 'http://localhost:3003',
  canvas: 'http://localhost:3004',
  memory: 'http://localhost:3005'
};
```

Se algum serviço cair ou o banco de dados estiver inativo, o Hub exibe um alerta visual com instruções para executar `npm run db:up` ou `npm run dev:clean`.

---

## 3. Comandos de Desenvolvimento e Quality Gates

```bash
cd aresta-hub

# Instalar dependências:
npm install

# Iniciar servidor Nuxt dev na porta 3000:
npm run dev

# Quality Gates Obrigatórios (100% verde antes de qualquer commit):
npm run typecheck && npm run test
```
