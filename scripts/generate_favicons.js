import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { PNG } from 'pngjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="100%" height="100%">
  <defs>
    <!-- Sombra sutil para máxima legibilidade tanto em abas escuras quanto claras -->
    <filter id="tabShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0.5" stdDeviation="0.4" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>

  <g filter="url(#tabShadow)" fill="#CF7754" stroke="#CF7754">
    <!-- Base horizontal -->
    <line x1="9.4" y1="26.2" x2="22.6" y2="26.2" stroke-width="1.1" stroke-linecap="round" />

    <!-- Hastes principais do A -->
    <line x1="16" y1="6.5" x2="9.4" y2="26.2" stroke-width="2.4" stroke-linecap="round" />
    <line x1="16" y1="6.5" x2="22.6" y2="26.2" stroke-width="2.4" stroke-linecap="round" />

    <!-- Traço transversal característico da Aresta -->
    <polygon points="1.2,20.8 16,18.0 30.8,14.2 16,16.8" stroke-width="0.3" stroke-linejoin="round" />

    <!-- 3 Nós nos vértices do triângulo da marca -->
    <circle cx="16" cy="6.5" r="2.6" stroke-width="0" />
    <circle cx="9.4" cy="26.2" r="2.6" stroke-width="0" />
    <circle cx="22.6" cy="26.2" r="2.6" stroke-width="0" />
  </g>
</svg>
`

function createIco(pngBuffers) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngBuffers.length, 4)

  let offset = 6 + pngBuffers.length * 16
  const dirEntries = []

  for (const { width, height, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(width >= 256 ? 0 : width, 0)
    entry.writeUInt8(height >= 256 ? 0 : height, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(buffer.length, 8)
    entry.writeUInt32LE(offset, 12)
    dirEntries.push(entry)
    offset += buffer.length
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map(p => p.buffer)])
}

// Ler o PNG oficial da marca em alta resolução
const srcPath = path.join(rootDir, 'front/public/logo_aresta_sem_fundo.png')
const srcData = fs.readFileSync(srcPath)
const src = PNG.sync.read(srcData)

// Content bounds: [248..1006] x [255..872] -> w=758, h=617. Center: (627, 563.5)
// cropSize = 770 preenche 98.4% do quadro, eliminando folgas excessivas
function renderMaximizedIcon(size, cropSize = 770) {
  const dst = new PNG({ width: size, height: size })
  const cx = 627
  const cy = 563.5
  const cropX0 = cx - cropSize / 2
  const cropY0 = cy - cropSize / 2
  const step = cropSize / size

  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      const sx0 = cropX0 + dx * step
      const sy0 = cropY0 + dy * step

      let sumR = 0, sumG = 0, sumB = 0, sumA = 0, count = 0
      const sub = Math.max(6, Math.floor(step))
      for (let sy = 0; sy < sub; sy++) {
        const py = Math.floor(sy0 + (sy + 0.5) * (step / sub))
        if (py < 0 || py >= src.height) continue
        for (let sx = 0; sx < sub; sx++) {
          const px = Math.floor(sx0 + (sx + 0.5) * (step / sub))
          if (px < 0 || px >= src.width) continue

          const sidx = (src.width * py + px) << 2
          const a = src.data[sidx + 3]
          if (a > 0) {
            sumR += src.data[sidx] * (a / 255)
            sumG += src.data[sidx + 1] * (a / 255)
            sumB += src.data[sidx + 2] * (a / 255)
          }
          sumA += a
          count++
        }
      }

      const didx = (size * dy + dx) << 2
      let finalA = count > 0 ? (sumA / count) / 255 : 0

      // Reforço de contraste e nitidez para tamanhos pequenos de aba (16px / 32px)
      if (finalA > 0.04) {
        finalA = Math.min(1, Math.pow(finalA, 0.72) * 1.18)
      }

      const avgR = (count > 0 && sumA > 0) ? (sumR / (sumA / 255)) : 207
      const avgG = (count > 0 && sumA > 0) ? (sumG / (sumA / 255)) : 119
      const avgB = (count > 0 && sumA > 0) ? (sumB / (sumA / 255)) : 84

      dst.data[didx] = Math.round(avgR)
      dst.data[didx + 1] = Math.round(avgG)
      dst.data[didx + 2] = Math.round(avgB)
      dst.data[didx + 3] = Math.round(finalA * 255)
    }
  }
  return dst
}

const p16 = renderMaximizedIcon(16)
const p32 = renderMaximizedIcon(32)
const p48 = renderMaximizedIcon(48)
const p192 = renderMaximizedIcon(192)
const p512 = renderMaximizedIcon(512)

const icoBuffer = createIco([
  { width: 16, height: 16, buffer: PNG.sync.write(p16) },
  { width: 32, height: 32, buffer: PNG.sync.write(p32) },
  { width: 48, height: 48, buffer: PNG.sync.write(p48) }
])

const targetPublicDirs = [
  path.resolve(rootDir, '../aresta-canvas/front/public'),
  path.resolve(rootDir, '../aresta-reader/front/public'),
  path.resolve(rootDir, '../aresta-hub/public')
]

for (const pDir of targetPublicDirs) {
  fs.writeFileSync(path.join(pDir, 'favicon.svg'), svgContent)
  fs.writeFileSync(path.join(pDir, 'favicon-16x16.png'), PNG.sync.write(p16))
  fs.writeFileSync(path.join(pDir, 'favicon-32x32.png'), PNG.sync.write(p32))
  fs.writeFileSync(path.join(pDir, 'favicon.png'), PNG.sync.write(p32))
  fs.writeFileSync(path.join(pDir, 'favicon-48.png'), PNG.sync.write(p48))
  fs.writeFileSync(path.join(pDir, 'icon-192.png'), PNG.sync.write(p192))
  fs.writeFileSync(path.join(pDir, 'icon-512.png'), PNG.sync.write(p512))
  fs.writeFileSync(path.join(pDir, 'apple-touch-icon.png'), PNG.sync.write(p192))
  fs.writeFileSync(path.join(pDir, 'favicon.ico'), icoBuffer)
  fs.writeFileSync(path.join(pDir, 'logo_aresta.ico'), icoBuffer)
}

console.log('Successfully generated maximized and high-visibility favicons for all apps!')

