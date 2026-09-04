import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { PNG } from 'pngjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcPath = path.resolve(__dirname, '../front/public/logo_aresta_sem_fundo.png')
const iconsDir = path.resolve(__dirname, '../front/src-tauri/icons')

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

const srcData = fs.readFileSync(srcPath)
const src = PNG.sync.read(srcData)

const cx = 627
const cy = 563.5
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

      dst.data[didx] = 255
      dst.data[didx + 1] = 255
      dst.data[didx + 2] = 255
      dst.data[didx + 3] = Math.round(alpha * 255)
    }
  }

  return dst
}

console.log('Generating PNG icons for Tauri...')
const p32 = createWhiteIcon(32, 0.75)
const p128 = createWhiteIcon(128, 0.80)
const p256 = createWhiteIcon(256, 0.85)
const p512 = createWhiteIcon(512, 0.90)

const b32 = PNG.sync.write(p32)
const b128 = PNG.sync.write(p128)
const b256 = PNG.sync.write(p256)
const b512 = PNG.sync.write(p512)

fs.writeFileSync(path.join(iconsDir, '32x32.png'), b32)
fs.writeFileSync(path.join(iconsDir, '128x128.png'), b128)
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), b256)
fs.writeFileSync(path.join(iconsDir, 'icon.png'), b512)

// Create ICO
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

  return Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffers.map(p => p.buffer)
  ])
}

const icoBuffer = createIco([
  { width: 32, height: 32, buffer: b32 },
  { width: 128, height: 128, buffer: b128 },
  { width: 256, height: 256, buffer: b256 },
])
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoBuffer)

// Create ICNS
function createIcns(entries) {
  const chunks = []
  for (const { tag, buffer } of entries) {
    const chunkHeader = Buffer.alloc(8)
    chunkHeader.write(tag, 0, 4, 'ascii')
    chunkHeader.writeUInt32BE(buffer.length + 8, 4)
    chunks.push(chunkHeader, buffer)
  }

  const totalLength = 8 + chunks.reduce((acc, c) => acc + c.length, 0)
  const header = Buffer.alloc(8)
  header.write('icns', 0, 4, 'ascii')
  header.writeUInt32BE(totalLength, 4)

  return Buffer.concat([header, ...chunks])
}

const icnsBuffer = createIcns([
  { tag: 'ic07', buffer: b128 },
  { tag: 'ic08', buffer: b256 },
  { tag: 'ic09', buffer: b512 },
])
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), icnsBuffer)

console.log('Successfully generated all Tauri icons in src-tauri/icons!')
