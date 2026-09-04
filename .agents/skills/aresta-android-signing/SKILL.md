---
name: aresta-android-signing
description: >-
  Guia completo de geração de keystores, assinatura digital de APKs Android (APK Signature Scheme v2/v3),
  configuração de CI/CD no GitHub Actions, manipulação de certificados e troubleshooting de instalação no Aresta Reader.
---

# aresta-android-signing — Guia de Assinatura e Distribuição Android

Guia técnico de manipulação criptográfica de certificados, geração de Keystores, assinatura automatizada no GitHub Actions e diagnóstico de erros de instalação no ecossistema Android para o **aresta-reader**.

---

## 1. Fundamentos da Assinatura Digital no Android

No Android, nenhum aplicativo pode ser instalado em dispositivos físicos sem uma assinatura digital válida:

- **Autenticidade e Sandbox:** Cada aplicativo possui um UID isolado no kernel Linux. A assinatura vincula o pacote (`com.aresta.reader`) à chave privada do desenvolvedor.
- **Integridade:** Garante que o código binário (DEX, assets webview, bibliotecas Rust `.so`) não foi alterado ou corrompido pós-compilação.
- **Esquemas Suportados:** O Android moderno exige **APK Signature Scheme v2/v3** (assinatura em bloco binário pré-ZIP), que protege contra ataques de re-empacotamento.

---

## 2. Geração da Keystore (Certificado JKS)

A Keystore deve ser gerada apenas uma vez e armazenada de forma estritamente privada (nunca versionada no Git).

### Comando de Geração via `keytool` (JDK):
```powershell
keytool -genkeypair -v -keystore aresta-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias aresta-reader -storepass <SENHA_FORTE> -keypass <SENHA_FORTE> -dname "CN=Aresta Reader, OU=Mobile, O=Aresta, L=Sao Paulo, ST=SP, C=BR"
```

### Conversão para Base64 (Necessário para GitHub Secrets):

**No Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("aresta-release.jks")) | Set-Clipboard
```

**No Linux / macOS:**
```bash
base64 -w 0 aresta-release.jks | pbcopy # ou xclip
```

---

## 3. Configuração dos Secrets no GitHub Actions

No repositório do GitHub (**Settings > Secrets and variables > Actions**), cadastre os seguintes segredos:

| Secret | Descrição | Exemplo |
| :--- | :--- | :--- |
| `ANDROID_KEYSTORE_BASE64` | Conteúdo codificado em Base64 do `.jks` | `MIIKwgIBAzCCCmwG...` |
| `ANDROID_KEYSTORE_PASSWORD` | Senha da Keystore (`storepass`) | `<sua-senha>` |
| `ANDROID_KEY_ALIAS` | Alias da chave | `aresta-reader` |
| `ANDROID_KEY_PASSWORD` | Senha da chave privada (`keypass`) | `<sua-senha>` |

---

## 4. Pipeline de Assinatura Automatizada no GitHub Actions

O workflow `.github/workflows/release.yml` compila o APK via Tauri v2 e aplica a assinatura logo em seguida com `r0adkll/sign-android-release@v1`:

```yaml
      - name: Build Android APK
        working-directory: ./front
        run: |
          if [ ! -d "src-tauri/gen/android" ]; then npx tauri android init; fi
          if [ -f "src-tauri/gen/android/gradlew" ]; then chmod +x src-tauri/gen/android/gradlew; fi
          npx tauri android build --apk

      - name: Sign Android APK
        uses: r0adkll/sign-android-release@v1
        id: sign_app
        if: ${{ env.KEYSTORE_AVAILABLE != '' }}
        env:
          KEYSTORE_AVAILABLE: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
        with:
          releaseDirectory: front/src-tauri/gen/android/app/build/outputs/apk
          signingKeyBase64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          alias: ${{ secrets.ANDROID_KEY_ALIAS }}
          keyStorePassword: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          keyPassword: ${{ secrets.ANDROID_KEY_PASSWORD }}

      - name: Prepare APKs for Release
        run: |
          # Se houver APKs assinados, remove os unsigned para evitar download incorreto
          if ls front/src-tauri/gen/android/app/build/outputs/apk/**/*-signed.apk 1> /dev/null 2>&1; then
            find front/src-tauri/gen/android/app/build/outputs/apk -name "*-unsigned.apk" -type f -delete
          fi

      - uses: softprops/action-gh-release@v2
        if: startsWith(github.ref, 'refs/tags/') || github.event_name == 'workflow_dispatch'
        with:
          tag_name: ${{ github.ref_name || github.event.inputs.tag_name }}
          name: Aresta Reader ${{ github.ref_name || github.event.inputs.tag_name }}
          files: front/src-tauri/gen/android/app/build/outputs/apk/**/*.apk
```

---

## 5. Guia de Diagnóstico e Erros Comuns

### ❌ Erro: "App não instalado" imediatamente ao tocar em Instalar
* **Causa 1: APK Não Assinado (`INSTALL_PARSE_FAILED_NO_CERTIFICATES`)**:
  - O arquivo baixado tem sufixo `-unsigned.apk`. O Android rejeita antes da extração.
  - **Correção:** Garantir que o pipeline assinou e gerou o `-signed.apk`.
* **Causa 2: Conflito de Assinatura com Versão Prévia (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`)**:
  - O app já estava instalado com outra chave (ex: versão de dev do `tauri android dev`).
  - **Correção:** Desinstalar a versão existente no aparelho antes de instalar a nova.
* **Causa 3: Incompatibilidade de Arquitetura (`INSTALL_FAILED_CPU_ABI_INCOMPATIBLE`)**:
  - Tentativa de instalar APK `x86_64` ou `x86` em processador ARM (`arm64-v8a`).
  - **Correção:** Instalar o APK `arm64-v8a` ou o APK universal.

### 🔍 Comandos de Validação Local
```bash
# Verificar se o APK está devidamente assinado (v1, v2, v3):
apksigner verify --verbose app-release-signed.apk

# Ler certificado contido no APK:
keytool -printcert -jarfile app-release-signed.apk

# Instalar via ADB visualizando o erro real do PackageManager:
adb install -r app-release-signed.apk
```
