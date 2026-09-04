---
name: aresta-auth-guide
description: >-
  Guia de desenvolvimento e operação do serviço aresta-auth (:3001, DB :5431). Use esta skill para
  implementar e manter autenticação JWT, cadastro de usuários, hashing de senhas bcrypt, perfil,
  preferências do leitor (user_settings), tracking de ofensiva/streaks diários e validação de quality gates.
---

# aresta-auth — Autenticação, Usuários, JWT e Métricas de Ofensiva

Guia de desenvolvimento do serviço de autenticação central do ecossistema Aresta (`aresta-auth`), responsável por emitir os tokens JWT, gerenciar contas de usuários e rastrear o hábito diário de leitura.

---

## 1. Responsabilidades e Arquitetura

- **Porta HTTP:** `3001`
- **Banco de Dados:** PostgreSQL 16 na porta `5431` (`aresta_auth_db`)
- **Papel no Ecossistema:** Único serviço autorizado a **emitir** e assinar tokens JWT. Todos os demais microsserviços validam o token localmente usando a mesma variável `JWT_SECRET`.

---

## 2. Modelo de Banco de Dados (`schema.prisma`)

```prisma
model User {
  id               Int              @id @default(autoincrement())
  email            String           @unique
  password_hash    String
  name             String
  avatar_url       String?
  created_at       DateTime         @default(now())
  updated_at       DateTime         @updatedAt
  settings         UserSettings?
  dailyActivities  DailyActivity[]
  streaks          UserStreak?

  @@map("users")
}

model UserSettings {
  id                Int      @id @default(autoincrement())
  user_id           Int      @unique
  font_family       String   @default("Inter")
  font_size         Int      @default(16)
  theme_mode        String   @default("system") // light, dark, sepia
  reading_direction String   @default("ltr")
  target_language   String   @default("pt-BR")
  user              User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@map("user_settings")
}

model DailyActivity {
  id           Int      @id @default(autoincrement())
  user_id      Int
  date         DateTime @db.Date
  read_minutes Int      @default(0)
  cards_done   Int      @default(0)
  user         User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, date])
  @@map("daily_activities")
}
```

---

## 3. Endpoints da API

| Método | Rota | Protegido | Descrição |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Não | Criação de conta com hash bcrypt (10 rounds). |
| `POST` | `/api/auth/login` | Não | Autenticação por email e senha; retorna Bearer JWT. |
| `GET` | `/api/auth/me` | Sim | Retorna os dados do usuário autenticado e suas configurações. |
| `PUT` | `/api/auth/settings` | Sim | Atualiza preferências de leitura e idioma alvo. |
| `GET` | `/api/auth/streak` | Sim | Consulta dados da ofensiva diária atual e histórico. |
| `POST` | `/api/auth/streak/activity` | Sim | Registra minutos lidos ou cards revisados no dia atual. |
| `POST` | `/api/auth/streak/freeze` | Sim | Utiliza um congelamento de streak para proteger o recorde. |

---

## 4. Variáveis de Ambiente (`aresta-auth/.env`)

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://aresta:password@localhost:5431/aresta_auth_db
JWT_SECRET=sua-chave-jwt-secreta-compartilhada
JWT_EXPIRES_IN=7d
```

---

## 5. Quality Gates e Comandos de Execução

```bash
# Subir contêiner do banco:
docker compose up -d auth-db

# Rodar migrações Prisma:
npx prisma migrate dev --name init

# Rodar serviço em modo dev:
npm run dev

# Quality Gate Obrigatório (100% verde):
npm run build && npm run test
```
