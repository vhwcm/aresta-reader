export type ReaderTheme = 'sepia' | 'white' | 'black'

export interface RasterizeOptions {
  fontSize?: number
  fontFamily?: string
  lineHeight?: number
}

/**
 * Aplica o filtro de tema diretamente nos pixels do canvas 2D nativo
 */
export function applyThemeToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: ReaderTheme,
): void {
  if (theme === 'white') return

  if (theme === 'sepia') {
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = '#f5eedc'
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
    return
  }

  if (theme === 'black') {
    try {
      const imgData = ctx.getImageData(0, 0, width, height)
      const data = imgData.data
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]!
        const g = data[i + 1]!
        const b = data[i + 2]!

        // Inversão com tom escuro suave (#121214)
        data[i] = Math.round((255 - r) * 0.07 + 18)
        data[i + 1] = Math.round((255 - g) * 0.07 + 18)
        data[i + 2] = Math.round((255 - b) * 0.08 + 20)
      }
      ctx.putImageData(imgData, 0, 0)
    } catch {
      // Caso ocorra erro de contexto em ambiente restrito, preenche fundo
      ctx.fillStyle = '#121214'
      ctx.fillRect(0, 0, width, height)
    }
  }
}

/**
 * Renderiza texto puro formatado com máxima legibilidade e segurança contra taint.
 */
export function drawPlainTextToCanvas(
  targetCanvas: HTMLCanvasElement,
  text: string,
  width: number,
  height: number,
  theme: ReaderTheme = 'sepia',
  options?: RasterizeOptions,
): void {
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1
  const renderW = Math.round(width * dpr)
  const renderH = Math.round(height * dpr)

  targetCanvas.width = renderW
  targetCanvas.height = renderH
  targetCanvas.style.width = `${width}px`
  targetCanvas.style.height = `${height}px`

  const ctx = targetCanvas.getContext('2d')
  if (!ctx) return

  const bgColor = theme === 'sepia' ? '#f5eedc' : theme === 'black' ? '#121214' : '#ffffff'
  const textColor = theme === 'sepia' ? '#2a2521' : theme === 'black' ? '#e4e4e7' : '#1a1a1a'

  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, renderW, renderH)

  if (!text || !text.trim()) return

  ctx.save()
  ctx.scale(dpr, dpr)

  const fontSize = options?.fontSize && options.fontSize > 0 ? options.fontSize : 18
  const fontFamily = options?.fontFamily || "'Newsreader', Georgia, serif"
  const baseLineHeight = options?.lineHeight && options.lineHeight > 0
    ? options.lineHeight
    : Math.round(fontSize * 1.65)

  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.fillStyle = textColor

  const paddingX = width > 700 ? 40 : (width > 500 ? 28 : 20)
  const paddingY = height > 700 ? 40 : (height > 500 ? 32 : 24)
  const maxWidth = width - (2 * paddingX)
  let y = paddingY + fontSize

  const paragraphs = text.includes('\n') ? text.split('\n') : [text]

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const rawPara = paragraphs[pIdx]!.trim()
    if (!rawPara) {
      y += Math.round(baseLineHeight * 0.5)
      continue
    }

    // Título ou cabeçalho de abertura (ex: "Capítulo Primeiro", "1", "I")
    const isHeading = (pIdx === 0 && rawPara.length < 60 && (/^(cap[íi]tulo|chapter|[0-9]+|[ivxlcdm]+)\b/i.test(rawPara) || rawPara === rawPara.toUpperCase()))
    if (isHeading) {
      const headingSize = Math.round(fontSize * 1.35)
      ctx.font = `bold ${headingSize}px ${fontFamily}`
      const headingMetrics = ctx.measureText(rawPara)
      const headingX = Math.max(paddingX, (width - headingMetrics.width) / 2)
      if (y <= height - paddingY) {
        ctx.fillText(rawPara, headingX, y)
      }
      y += Math.round(headingSize * 1.8)
      ctx.font = `${fontSize}px ${fontFamily}`
      continue
    }

    const words = rawPara.split(/\s+/)
    let currentLine = ''

    for (let i = 0; i < words.length; i++) {
      const word = words[i]!
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const metrics = ctx.measureText(testLine)

      if (metrics.width > maxWidth && currentLine) {
        if (y <= height - paddingY) {
          ctx.fillText(currentLine, paddingX, y)
        }
        currentLine = word
        y += baseLineHeight
      } else {
        currentLine = testLine
      }
    }

    if (currentLine && y <= height - paddingY) {
      ctx.fillText(currentLine, paddingX, y)
      y += baseLineHeight
    }

    y += Math.round(fontSize * 0.4)
  }

  ctx.restore()
}

/**
 * Rasteriza com máxima fidelidade visual um contêiner DOM ou canvas PDF para um canvas alvo.
 * Mantém o canvas 100% origin-clean para permitir uso direto como textura Three.js WebGL.
 * Retorna true se algum conteúdo foi desenhado, false se estava vazio.
 */
export function rasterizeElementToCanvas(
  containerEl: HTMLElement | null,
  targetCanvas: HTMLCanvasElement,
  width: number,
  height: number,
  theme: ReaderTheme = 'sepia',
  pdfCanvasEl?: HTMLCanvasElement | null,
  options?: RasterizeOptions,
): boolean {
  if (!targetCanvas) return false
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1
  const renderW = Math.round(width * dpr)
  const renderH = Math.round(height * dpr)

  targetCanvas.width = renderW
  targetCanvas.height = renderH
  targetCanvas.style.width = `${width}px`
  targetCanvas.style.height = `${height}px`

  const ctx = targetCanvas.getContext('2d')
  if (!ctx) return false

  const bgColor = theme === 'sepia' ? '#f5eedc' : theme === 'black' ? '#121214' : '#ffffff'
  const textColor = theme === 'sepia' ? '#2a2521' : theme === 'black' ? '#e4e4e7' : '#1a1a1a'

  // 1. Fundo do tema
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, renderW, renderH)

  // 2. Se for documento PDF e o canvas nativo existir, desenha-o diretamente com aceleração GPU
  if (pdfCanvasEl && pdfCanvasEl.width > 0 && pdfCanvasEl.height > 0) {
    try {
      ctx.drawImage(pdfCanvasEl, 0, 0, renderW, renderH)
      if (theme === 'sepia' || theme === 'black') {
        applyThemeToCanvas(ctx, renderW, renderH, theme)
      }
      return true
    } catch {
      // continua para fallback de texto se drawImage falhar
    }
  }

  if (!containerEl) return false

  // 3. Renderização de conteúdo DOM
  let drawnCount = 0
  const containerRect = containerEl.getBoundingClientRect ? containerEl.getBoundingClientRect() : {
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height,
  }

  const isJSDOM = containerRect.width === 0 && containerRect.height === 0

  ctx.save()
  ctx.scale(dpr, dpr)

  // 3.1 Imagens inseridas no texto (ilustrações, capas)
  if (!isJSDOM && typeof containerEl.querySelectorAll === 'function') {
    const imgs = containerEl.querySelectorAll('img')
    imgs.forEach((img) => {
      if (!img.complete || img.naturalWidth === 0) return
      const r = img.getBoundingClientRect()
      if (
        r.bottom > containerRect.top &&
        r.top < containerRect.bottom &&
        r.right > containerRect.left &&
        r.left < containerRect.right
      ) {
        const x = r.left - containerRect.left
        const y = r.top - containerRect.top
        try {
          ctx.drawImage(img, x, y, r.width, r.height)
          drawnCount++
        } catch {
          // ignora erro de decodificação de imagem assíncrona
        }
      }
    })
  }

  // 3.2 Percorre blocos de texto formatados
  const selector = 'h1, h2, h3, h4, h5, h6, p, li, blockquote, .didactic-heading, .didactic-paragraph, .chapter-title, .title, .subtitle, .callout-header, .callout-body'
  const textBlocks = typeof containerEl.querySelectorAll === 'function'
    ? Array.from(containerEl.querySelectorAll<HTMLElement>(selector))
    : []

  const leafBlocks = textBlocks.filter((el) => {
    return el.querySelector(selector) === null
  })

  if (leafBlocks.length > 0 && !isJSDOM) {
    leafBlocks.forEach((el) => {
      const r = el.getBoundingClientRect()
      // Se estiver totalmente fora da página visível, pula
      if (
        r.bottom <= containerRect.top + 2 ||
        r.top >= containerRect.bottom - 2 ||
        r.right <= containerRect.left + 2 ||
        r.left >= containerRect.right - 2
      ) {
        return
      }

      const text = (el.innerText || el.textContent || '').trim()
      if (!text) return

      const style = typeof window !== 'undefined' && typeof window.getComputedStyle === 'function'
        ? window.getComputedStyle(el)
        : null

      const fontSize = options?.fontSize || (style ? parseFloat(style.fontSize) || 16 : 16)
      const fontWeight = style?.fontWeight || 'normal'
      const fontStyle = style?.fontStyle || 'normal'
      const fontFamily = options?.fontFamily || style?.fontFamily || "'Newsreader', Georgia, serif"
      const textAlign = (style?.textAlign || 'left') as CanvasTextAlign

      ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`
      ctx.fillStyle = (style?.color && style.color !== 'transparent' && style.color !== 'rgba(0, 0, 0, 0)')
        ? style.color
        : textColor

      const rawLineHeight = style ? parseFloat(style.lineHeight) : NaN
      const lineHeight = !isNaN(rawLineHeight) && rawLineHeight > 0 ? rawLineHeight : Math.round(fontSize * 1.6)

      const x = Math.max(16, r.left - containerRect.left)
      const maxWidth = Math.min(width - 32, r.width > 0 ? r.width : width - 2 * x)
      let y = (r.top - containerRect.top) + fontSize * 0.9

      const words = text.split(/\s+/)
      let currentLine = ''

      for (let i = 0; i < words.length; i++) {
        const word = words[i]!
        const testLine = currentLine ? `${currentLine} ${word}` : word
        const metrics = ctx.measureText(testLine)

        if (metrics.width > maxWidth && currentLine) {
          let lineX = x
          if (textAlign === 'center') {
            lineX = x + Math.max(0, (maxWidth - ctx.measureText(currentLine).width) / 2)
          } else if (textAlign === 'right') {
            lineX = x + Math.max(0, maxWidth - ctx.measureText(currentLine).width)
          }
          if (y >= 0 && y <= height + fontSize) {
            ctx.fillText(currentLine, lineX, y)
            drawnCount++
          }
          currentLine = word
          y += lineHeight
        } else {
          currentLine = testLine
        }
      }

      if (currentLine && y >= 0 && y <= height + fontSize) {
        let lineX = x
        if (textAlign === 'center') {
          lineX = x + Math.max(0, (maxWidth - ctx.measureText(currentLine).width) / 2)
        } else if (textAlign === 'right') {
          lineX = x + Math.max(0, maxWidth - ctx.measureText(currentLine).width)
        }
        ctx.fillText(currentLine, lineX, y)
        drawnCount++
      }
    })
  }

  ctx.restore()

  // 3.3 Se nenhum bloco desenhou texto (ex: JSDOM, elementos fora do fluxo ou tags não mapeadas), faz fallback com o texto do contêiner
  if (drawnCount === 0) {
    const plainText = (containerEl.innerText || containerEl.textContent || '').trim()
    if (plainText) {
      drawPlainTextToCanvas(targetCanvas, plainText, width, height, theme, options)
      return true
    }
    return false
  }

  return true
}
