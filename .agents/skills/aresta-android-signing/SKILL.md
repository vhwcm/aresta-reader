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

O workflow `.github/workflows/release.yml` utiliza o `apksigner` oficial do Android SDK (já fornecido via `build-tools;34.0.0`) para realizar a busca recursiva e assinatura dos APKs, eliminando incompatibilidades com subdiretórios (`universal/release/`) e avisos de versão de runtime do Node:

```yaml
      - name: Sign Android APK
        env:
          KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          if [ -z "$KEYSTORE_BASE64" ]; then
            echo "Aviso: ANDROID_KEYSTORE_BASE64 não configurado, pulando assinatura."
            exit 0
          fi

          echo "$KEYSTORE_BASE64" | base64 --decode > /tmp/release.jks

          # Encontra e assina recursivamente todos os APKs gerados
          find front/src-tauri/gen/android/app/build/outputs/apk -type f -name "*.apk" ! -name "*-signed.apk" | while read -r apk; do
            echo "Encontrado APK para assinar: $apk"
            dir=$(dirname "$apk")
            base=$(basename "$apk" .apk)
            clean_base=$(echo "$base" | sed 's/-unsigned$//')
            signed_apk="$dir/${clean_base}-signed.apk"

            echo "Assinando via apksigner -> $signed_apk"
            $ANDROID_HOME/build-tools/34.0.0/apksigner sign \
              --ks /tmp/release.jks \
              --ks-pass "pass:$KEYSTORE_PASSWORD" \
              --key-pass "pass:$KEY_PASSWORD" \
              --ks-key-alias "$KEY_ALIAS" \
              --out "$signed_apk" \
              "$apk"

            echo "Validando integridade da assinatura:"
            $ANDROID_HOME/build-tools/34.0.0/apksigner verify --verbose "$signed_apk"

            # Remove o APK não assinado para que apenas o assinado seja publicado
            rm -f "$apk"
          done

          rm -f /tmp/release.jks

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
