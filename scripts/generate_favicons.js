import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { PNG } from 'pngjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../front/public')
const srcPath = path.join(publicDir, 'logo_aresta_sem_fundo.png')

const srcData = fs.readFileSync(srcPath)
const src = PNG.sync.read(srcData)

// Geometry in logo_aresta_sem_fundo.png:
// Content bounding box: minX: 248, maxX: 1006, minY: 255, maxY: 872
// Center: (627, 563.5)
const cx = 627
const cy = 563.5
// Square crop tightly wrapping the logo content with minimal padding (takes ~92% of the icon):
const cropSize = 800
const cropX0 = Math.round(cx - cropSize / 2)
const cropY0 = Math.round(cy - cropSize / 2)

function createWhiteIcon(size, gamma = 0.75) {
  const dst = new PNG({ width: size, height: size })
  const step = cropSize / size

  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      const sx0 = cropX0 + dx * step
      const sy0 = cropY0 + dy * step

      let sumA = 0
      let count = 0
      const sub = Math.max(4, Math.floor(step))
      for (let sy = 0; sy < sub; sy++) {
        const py = Math.floor(sy0 + (sy + 0.5) * (step / sub))
        if (py < 0 || py >= src.height) continue
        for (let sx = 0; sx < sub; sx++) {
          const px = Math.floor(sx0 + (sx + 0.5) * (step / sub))
          if (px < 0 || px >= src.width) continue

          const sidx = (src.width * py + px) << 2
          sumA += src.data[sidx + 3]
          count++
        }
      }

      const didx = (size * dy + dx) << 2
      let alpha = count > 0 ? (sumA / count) / 255 : 0
      if (alpha > 0.01) {
        alpha = Math.min(1, Math.pow(alpha, gamma) * 1.08)
      }

      // Pure white RGB
      dst.data[didx] = 255
      dst.data[didx + 1] = 255
      dst.data[didx + 2] = 255
      dst.data[didx + 3] = Math.round(alpha * 255)
    }
  }

  return dst
}

// Write PNG icons
const p16 = createWhiteIcon(16, 0.70)
fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), PNG.sync.write(p16))

const p32 = createWhiteIcon(32, 0.75)
fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), PNG.sync.write(p32))
fs.writeFileSync(path.join(publicDir, 'favicon.png'), PNG.sync.write(p32))

const p48 = createWhiteIcon(48, 0.80)
fs.writeFileSync(path.join(publicDir, 'favicon-48.png'), PNG.sync.write(p48))

// Create multi-image favicon.ico (16x16 and 32x32 embedded PNG format standard ICO)
function createIco(pngBuffers) {
  // ICO header: 6 bytes
  // Reserved (2 bytes) = 0
  // Type (2 bytes) = 1 (icon)
  // Count (2 bytes) = number of images
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
    entry.writeUInt8(0, 2) // palette colors
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // color planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(buffer.length, 8) // size of image data
    entry.writeUInt32LE(offset, 12) // offset
    dirEntries.push(entry)
    offset += buffer.length
  }

  return Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffers.map(p => p.buffer)
  ])
}

const icoBuffer = createIco([
  { width: 16, height: 16, buffer: PNG.sync.write(p16) },
  { width: 32, height: 32, buffer: PNG.sync.write(p32) },
  { width: 48, height: 48, buffer: PNG.sync.write(p48) },
])
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer)

// Create SVG favicon: Pure white vector, optimized, crisp at any scale, fills 92% of the icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="100%" height="100%">
  <defs>
    <!-- Sombra sutil para garantir contraste máximo mesmo em abas claras -->
    <filter id="tabShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0.7" stdDeviation="0.6" flood-color="#000000" flood-opacity="0.4" />
    </filter>
  </defs>

  <g filter="url(#tabShadow)" fill="#FFFFFF" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round">
    <!-- Base horizontal -->
    <line x1="6.5" y1="25.4" x2="25.5" y2="25.4" stroke-width="1.2" />

    <!-- Hastes / Pernas do A -->
    <line x1="16" y1="6.2" x2="6.5" y2="25.4" stroke-width="2.1" />
    <line x1="16" y1="6.2" x2="25.5" y2="25.4" stroke-width="2.1" />

    <!-- Lâmina / Traço dinâmico transversal do Aresta -->
    <path d="M 1.5 20.4 Q 16 15.9 30.5 12.8 Q 16 17.5 1.5 20.4 Z" stroke-width="0.4" />

    <!-- Nós / Círculos nos vértices -->
    <circle cx="16" cy="6.2" r="2.5" stroke-width="0" />
    <circle cx="6.5" cy="25.4" r="2.5" stroke-width="0" />
    <circle cx="25.5" cy="25.4" r="2.5" stroke-width="0" />
  </g>
</svg>
`
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent)

console.log('Successfully generated all white favicons (SVG, ICO, PNGs)!')
