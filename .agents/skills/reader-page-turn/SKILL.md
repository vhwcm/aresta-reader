---
name: reader-page-turn
description: >-
  Guia técnico e regras inegociáveis para manutenção, depuração e evolução do motor 3D WebGL
  de virada de página (PageCurlCanvas, usePageCurl3D, shaders GLSL, rasterização e física de gestos).
  Use esta skill sempre que for alterar, investigar ou corrigir a animação de virada de página,
  deformação 3D, mapeamento de texturas, shaders de curvatura ou física de folheamento.
---

# Motor 3D de Virada de Página (Page Turn Engine)

Este guia documenta a arquitetura, princípios matemáticos fundamentais e regras inegociáveis do motor de virada de página 3D do **aresta-reader**.

---

## 1. Arquitetura e Componentes Centrais

O módulo reside em `front/app/` e é composto por 4 camadas integradas:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           PageCurlCanvas.vue                             │
│  Orquestrador da transição: gerencia spread 2D base e tela WebGL 3D      │
└──────────────────┬────────────────────────────────────┬──────────────────┘
                   │                                    │
                   ▼                                    ▼
       ┌───────────────────────┐            ┌───────────────────────┐
       │   usePagePhysics.ts   │            │   usePageCurl3D.ts    │
       │   Captura de ponteiro │            │   Engine Three.js     │
       │   Inércia e spring    │            │   Shaders GLSL        │
       │   Limiar de ativação  │            │   evaluate3DPagePoint │
       └───────────────────────┘            └───────────┬───────────┘
                                                        │
                                                        ▼
                                            ┌───────────────────────┐
                                            │   pageRasterizer.ts   │
                                            │   Texturização 2D     │
                                            │   Range TreeWalker    │
                                            │   GPU Clean Canvas    │
                                            └───────────────────────┘
```

| Arquivo | Responsabilidade |
| :--- | :--- |
| [PageCurlCanvas.vue](file:///c:/Users/vichw/aresta-projeto/aresta-reader/front/app/components/reader/engine/PageCurlCanvas.vue) | Orquestra as páginas 2D nativas de repouso (base) e o canvas Three.js 3D sobreposto (`z-index: 40`). |
| [usePageCurl3D.ts](file:///c:/Users/vichw/aresta-projeto/aresta-reader/front/app/composables/reader/usePageCurl3D.ts) | Gerencia a cena Three.js, malha ultra-densa (128x64 segmentos), `VERTEX_SHADER`, `FRAGMENT_SHADER` e a função determinística `evaluate3DPagePoint`. |
| [usePagePhysics.ts](file:///c:/Users/vichw/aresta-projeto/aresta-reader/front/app/composables/reader/usePagePhysics.ts) | Modelo físico de arraste contínuo, dinâmica de inércia, ângulo cônico por canto (`gripY`) e limites elásticos. |
| [pageRasterizer.ts](file:///c:/Users/vichw/aresta-projeto/aresta-reader/front/app/utils/pageRasterizer.ts) | Rasteriza elementos DOM (TreeWalker com medição nativa `Range`) e canvas PDF em canvases 2D offscreen com escala DPR para texturas Three.js. |

---

## 2. Regra Inegociável Anti-Espelhamento (Teorema da Face e UV)

### O Problema do Texto Espelhado
Durante a virada de página (ex: folha direita virando para a esquerda em direção à lombada), os pontos que ultrapassam a linha de dobra ($dist > 0$) são refletidos no espaço horizontal $X$ ($rotX$ decresce à medida que $pos.x$ avança):

$$\frac{\partial rotX}{\partial pos.x} < 0$$

- A textura da **frente** (`uFrontTexture`) tem coordenadas UV normais onde $u$ cresce com $pos.x$: $\frac{\partial u}{\partial pos.x} > 0$.
- Se `uFrontTexture` for desenhada sobre uma geometria com $\frac{\partial rotX}{\partial pos.x} < 0$, a taxa de variação na tela torna-se negativa: $\frac{\partial u}{\partial x} < 0$.
- **Consequência:** Qualquer tentativa de renderizar a frente da folha na região virada resultará em **texto espelhado / invertido horizontalmente**.

### A Regra Inegociável
1. **Região não-dobrada ($dist \le 0$):**
   - A folha permanece plana sobre a mesa.
   - `facing = 1.0` (frente).
   - Shader renderiza `uFrontTexture` com $vUv$.
2. **Região dobrada / curvada ($dist > 0$):**
   - A folha descolou da mesa e virou para o lado oposto. O leitor enxerga o **verso** da folha.
   - **`facing` DEVE SER SEMPRE `-1.0`!**
   - **NUNCA** utilize condições do tipo `facing = t < 0.5 ? 1.0 : -1.0`.
   - O shader renderiza exclusivamente `uBackTexture` com coordenadas invertidas:
     ```glsl
     vec2 backUv = vec2(1.0 - vUv.x, vUv.y);
     vec4 backTex = texture2D(uBackTexture, backUv);
     ```
   - Como a coordenada $X$ está refletida na geometria e a coordenada $U$ está invertida na textura, **as duas inversões se anulam**, resultando em renderização 100% legível e correta.

---

## 3. Normais de Iluminação e Shading 3D

No [usePageCurl3D.ts](file:///c:/Users/vichw/aresta-projeto/aresta-reader/front/app/composables/reader/usePageCurl3D.ts):
- O fragment shader calcula a iluminação do verso invertendo a normal:
  ```glsl
  vec3 revNorm = -norm;
  float diff = max(0.0, dot(revNorm, lightDir));
  ```
- Portanto, para que `revNorm` aponte na direção da câmera ($+Z$) e receba luz difusa e sombra ambiente suaves, a normal geométrica da folha dobrada deve ter componente $z \le 0$:
  ```glsl
  computedNormal = normalize(vec3(sin(t * PI), 0.0, -1.0));
  ```

---

## 4. Preservação de Escala 1:1 e Proibição de Zoom na Curvatura

### O Problema do Zoom Excessivo
No passado, tentou-se interpolar a posição $X$ entre o ponto original $pos.x$ e o ponto refletido $rotX$ usando:
```glsl
// INCORRETO: causa esticamento/zoom horizontal de até 237%
float arcProgress = 0.5 * (1.0 - cos(t * PI));
deformedPos.x = mix(pos.x, rotX, arcProgress);
```
Como $pos.x$ e $rotX$ se movem em sentidos opostos, a derivada $\frac{\partial x}{\partial dist}$ chegava a $-2.37$, inflando e esticando o texto horizontalmente de forma desproporcional e grotesca.

### A Regra Inegociável
- Na linha de dobra ($dist = 0$), $rotX = pos.x = foldX$. Os dois lados já se encontram com continuidade perfeita $C^0$.
- Portanto, para toda a região dobrada ($dist > 0$), atribua diretamente as coordenadas refletidas:
  ```glsl
  deformedPos.x = rotX;
  deformedPos.y = rotY;
  ```
- A curvatura 3D é modelada **exclusivamente no eixo Z** e nas normais de iluminação:
  ```glsl
  deformedPos.z = max(0.5, dynamicRadius * sin(t * PI));
  ```
- Isso garante que $|\frac{\partial rotX}{\partial pos.x}| = 1.0$ em toda a superfície, mantendo proporção de texto, entrelinha e tamanho de glifos rigorosamente idênticos aos da página estática (100% natural, **zero zoom**).

### Animação 3D Uniforme e Consistente (Sem Inclinação Diagonal)
- Para simplificar a física, garantir consistência visual e evitar deformações cônicas ou cisalhamento diagonal do texto, a virada 3D adota **sempre o mesmo movimento canônico**, independente de onde o usuário puxa a folha (topo, centro ou base).
- O ângulo de dobra é fixado em zero (`angle = 0.0`, com `cosA = 1.0` e `sinA = 0.0`), mantendo a dobra perfeitamente reta e paralela à lombada.
- O gesto físico controla o avanço horizontal da página (`progress`), proporcionando uma virada suave, previsível e estável.

---

## 5. Ordem das Texturas e Páginas

Ao folhear em **Modo 2 Páginas** (spread atual: `[curLeft, curRight]`):

| Direção | Folha que Levanta | `uFrontTexture` | `uBackTexture` | Base Subjacente Revelada |
| :--- | :--- | :--- | :--- | :--- |
| `next` (Avançar) | Direita | `curRight` | `curLeft + 2` (Verso) | `curLeft + 3` (Próxima direita) |
| `previous` (Voltar) | Esquerda | `curLeft` | `curLeft - 1` (Verso) | `curLeft - 2` (Anterior esquerda) |

Em **Modo 1 Página**:
| Direção | `uFrontTexture` | `uBackTexture` | Base Subjacente Revelada |
| :--- | :--- | :--- | :--- |
| `next` (Avançar) | `currentPage` | `currentPage + 1` | `currentPage + 1` |
| `previous` (Voltar) | `currentPage` | `currentPage - 1` | `currentPage - 1` |

---

## 6. Prevenção de Flickering, Estalos e Flash de Texto Incorreto

### No Início da Virada (`prepare3DTextures` em `PageCurlCanvas.vue`):
1. Monte a cena 3D com as texturas `frontCanvas` (página atual) e `backCanvas` (verso).
2. Renderize o primeiro frame Three.js estático com `progress = 0`.
3. **Ative a folha 3D sobreposta PRIMEIRO (`is3DActive = true`)**:
   - Como está em `progress = 0` com a textura idêntica, ela cobre a tela pixel a pixel sem qualquer salto visual.
4. **Só após a folha 3D estar cobrindo a tela**, atualize a página base subjacente via `renderPageToElement`:
   - **NUNCA** altere a página base do DOM antes de `is3DActive = true`. Fazer isso causava o "estalo/flash" onde a página seguinte aparecia no DOM visível por alguns milissegundos antes da camada 3D subir!

### Na Conclusão do Gesto (`onComplete` em `PageCurlCanvas.vue`):
1. Chame `store.goToPage(targetPage)`.
2. Renderize a camada 2D definitiva por baixo PRIMEIRO:
   ```ts
   await renderCurrentSpread()
   await nextTick()
   ```
3. Só após a base 2D estar desenhada, oculte o canvas 3D:
   ```ts
   is3DActive.value = false
   emit('transition-state', false)
   ```
Isso garante continuidade perfeita, zero estalos e ausência total de flashes visuais.

---

## 7. Procedimento de Testes Obrigatório

Sempre que alterar `usePageCurl3D.ts`, `PageCurlCanvas.vue` ou `usePagePhysics.ts`, execute obrigatoriamente:

```bash
# 1. Testes de deformação e engine 3D
cd front && npx vitest run tests/unit/reader/PageTurnMatrixDeformation.test.ts tests/unit/reader/PageCurl3DEngine.test.ts

# 2. Quality gates completos do frontend
cd front && npm run lint && npm run typecheck && npm run test
```
