---
name: aresta-reader-tauri
description: >-
  Guia de desenvolvimento, compilação e empacotamento Desktop e Mobile do aresta-reader usando Tauri v2.
  Use esta skill para configurar plugins (@tauri-apps/plugin-sql, plugin-fs, plugin-dialog), permissões
  de capabilities, builds multiplataforma (Windows MSI/NSIS, Linux AppImage/deb, macOS DMG) e
  APK Android (tauri android build).
---

# aresta-reader — Desenvolvimento Desktop e Android com Tauri v2

Guia de compilação, depuração nativa e empacotamento desktop/mobile do **aresta-reader** via **Tauri v2** (Rust + WebView).

---

## 1. Estrutura do Diretório `src-tauri`

```
front/src-tauri/
├── Cargo.toml            # Dependências Rust (tauri, tauri-plugin-sql, tauri-plugin-fs, etc.)
├── tauri.conf.json       # Configurações de janela, permissões, bundle e identificador
├── capabilities/         # Arquivos JSON de permissões granulares de segurança
├── icons/                # Ícones da aplicação em múltiplos formatos (.ico, .icns, .png)
├── gen/                  # Arquivos gerados para bindings Android / Desktop
└── src/
    ├── lib.rs            # Ponto de entrada de plugins e comandos Rust
    └── main.rs           # Inicialização da aplicação Desktop
```

---

## 2. Configurações Centrais (`tauri.conf.json`)

- **Identificador de pacote:** `com.aresta.reader`
- **Porta de desenvolvimento:** `http://localhost:3010` (Nuxt dev server)
- **Caminho de distribuição de produção:** `../.output/public` (gerado por `npm run generate`)
- **Plugin SQL:** Preload ativo para `sqlite:aresta-reader.db`
- **Dimensões padrão da janela:** 1280x840 px (mínimo: 900x600 px) com tema escuro habilitado

---

## 3. Scripts de Execução e Build

Todos os comandos devem ser executados dentro de `aresta-reader/front`:

### 🖥️ Desktop (Windows / Linux / macOS)
```bash
# Rodar aplicação desktop em tempo real com hot-reload:
npm run tauri:dev

# Compilar instaladores de produção (NSIS/MSI no Windows, AppImage/deb no Linux):
npm run tauri:build
```

### 📱 Android (APK)
```bash
# Inicializar o ambiente Android (executado uma única vez):
npm run tauri:android:init

# Rodar em dispositivo conectado via USB ou emulador Android:
npm run tauri:android:dev

# Compilar APK assinado / release:
npm run tauri:android:build

# Abrir projeto nativo no Android Studio:
npm run tauri:android:open
```

---

## 4. Gerenciamento de Permissões e Segurança (Capabilities)

No Tauri v2, qualquer chamada aos plugins de sistema (`fs`, `sql`, `dialog`) exige declaração explícita na pasta `front/src-tauri/capabilities/`:

- **Permissão de SQL:** Libera execução de queries e migrações sobre `aresta-reader.db`.
- **Permissão de Filesystem:** Libera leitura e escrita exclusivamente no escopo `$APPLOCALDATA/storage/**`.
- **Permissão de Diálogo:** Permite abrir caixas de diálogo nativas do SO para importação de arquivos `.epub` e `.pdf`.

---

## 5. Dicas de Resolução de Problemas no Tauri

- **Erro `cargo not found`:**
  Certifique-se de que a toolchain Rust está instalada (`rustc --version` e `cargo --version`).
- **Problema de CSP (Content Security Policy):**
  Ao carregar fontes externas ou imagens de capas remotas, revise a diretiva `security.csp` em `tauri.conf.json`.
- **Nuxt SSG vs SSR:**
  Para builds nativos de produção do Tauri, o Nuxt deve ser gerado como Single Page Application estática via `npm run generate`.
