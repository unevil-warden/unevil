/**
 * Generates solid-color PNG icons using pure Node.js (no external deps).
 * Run via: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '../public/icons')

const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[i] = c
}

function crc32(buf) {
  let crc = 0xffffffff
  for (const byte of buf) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)) >>> 0
  return (crc ^ 0xffffffff) >>> 0
}

function u32(n) {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]
}

function pngChunk(type, data) {
  const t = Buffer.from(type)
  const d = Buffer.from(data)
  const crcInput = Buffer.concat([t, d])
  return Buffer.concat([Buffer.from(u32(d.length)), t, d, Buffer.from(u32(crc32(crcInput)))])
}

function solidPNG(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = pngChunk('IHDR', [...u32(size), ...u32(size), 8, 2, 0, 0, 0])
  const pixels = []
  for (let y = 0; y < size; y++) {
    pixels.push(0) // filter: none
    for (let x = 0; x < size; x++) pixels.push(r, g, b)
  }
  const idat = pngChunk('IDAT', deflateSync(Buffer.from(pixels)))
  const iend = pngChunk('IEND', [])
  return Buffer.concat([sig, ihdr, idat, iend])
}

mkdirSync(outDir, { recursive: true })

// BetterAsk green: #00E5A0 = rgb(0, 229, 160)
for (const size of [16, 48, 128]) {
  const png = solidPNG(size, 0, 229, 160)
  writeFileSync(resolve(outDir, `icon${size}.png`), png)
  console.log(`Generated public/icons/icon${size}.png`)
}
