function makeDivisibleByFour (input: u32): u32 {
  const rest = input % 4

  return rest ? input + 4 - rest : input
}

class Bitmap {
  format: string
  offset: u32
  depth: u32
  stride: u32
  size: u32
  data: Uint8Array

  constructor (data: Uint8Array, offset: u32, width: u32, height: u32, colorDepth: u32, format: string) {
    this.format = format
    this.offset = offset
    this.depth = colorDepth
    this.stride = makeDivisibleByFour(width * this.depth / 8)
    this.size = (this.stride * height)
    this.data = data.subarray(this.offset, this.offset + this.size)

    if (this.size !== this.data.byteLength) {
      throw new Error('Truncated bitmap data')
    }
  }

  get (x: u32, y: u32, channel: string): u32 {
    const idx = this.format.indexOf(channel)

    if (this.depth === 1) {
      const slice = this.data[(y * this.stride) + (x / 8 | 0)]
      const mask = 1 << (7 - (x % 8) * 1)

      return (slice & mask) >>> (7 - (x % 8) * 1)
    }

    if (this.depth === 2) {
      const slice = this.data[(y * this.stride) + (x / 4 | 0)]
      const mask = 3 << (6 - (x % 4) * 2)

      return (slice & mask) >>> (6 - (x % 4) * 2)
    }

    if (this.depth === 4) {
      const slice = this.data[(y * this.stride) + (x / 2 | 0)]
      const mask = 15 << (4 - (x % 2) * 4)

      return (slice & mask) >>> (4 - (x % 2) * 4)
    }

    return this.data[(y * this.stride) + (x * (this.depth / 8)) + idx]
  }
}

function decodeTrueColorBmp (data: Uint8Array, width: u32, height: u32, colorDepth: u32, icon: boolean): Uint8Array {
  if (colorDepth !== 32 && colorDepth !== 24) {
    throw new Error(`A color depth of ${colorDepth} is not supported`)
  }

  const xor = new Bitmap(data, 0, width, height, colorDepth, 'BGRA')
  const and: Bitmap | null = (colorDepth === 24 && icon)
    ? new Bitmap(data, xor.offset + xor.size, width, height, 1, 'A')
    : null

  const result = new Uint8Array(width * height * 4)

  let idx: u32 = 0
  for (let y: u32 = 0; y < height; y++) {
    for (let x: u32 = 0; x < width; x++) {
      result[idx++] = xor.get(x, height - y - 1, 'R')
      result[idx++] = xor.get(x, height - y - 1, 'G')
      result[idx++] = xor.get(x, height - y - 1, 'B')

      if (colorDepth === 32) {
        result[idx++] = xor.get(x, height - y - 1, 'A')
      } else {
        if (and) {
          if (and.get(x, height - y - 1, 'A') > 0) {
            result[idx++] = 0
          } else {
            result[idx++] = 255
          }
        } else {
          result[idx++] = 255
        }
      }
    }
  }

  return result
}

function decodePaletteBmp (data: Uint8Array, width: u32, height: u32, colorDepth: u32, colorCount: u32, icon: boolean): Uint8Array {
  if (colorDepth !== 8 && colorDepth !== 4 && colorDepth !== 2 && colorDepth !== 1) {
    throw new Error(`A color depth of ${colorDepth} is not supported`)
  }

  const colors = new Bitmap(data, 0, colorCount, 1, 32, 'BGRA')
  const xor = new Bitmap(data, colors.offset + colors.size, width, height, colorDepth, 'C')
  const and: Bitmap | null = icon ? new Bitmap(data, xor.offset + xor.size, width, height, 1, 'A') : null

  const result = new Uint8Array(width * height * 4)

  let idx: u32 = 0
  for (let y: u32 = 0; y < height; y++) {
    for (let x: u32 = 0; x < width; x++) {
      const colorIndex = xor.get(x, height - y - 1, 'C')

      result[idx++] = colors.get(colorIndex, 0, 'R')
      result[idx++] = colors.get(colorIndex, 0, 'G')
      result[idx++] = colors.get(colorIndex, 0, 'B')
      if (and) {
        if (and.get(x, height - y - 1, 'A') > 0) {
          result[idx++] = 0
        } else {
          result[idx++] = 255
        }
      } else {
        result[idx++] = 255
      }
    }
  }

  return result
}

function checkMagicBytes (bytes: u16): void {
  // if (bytes !== 0x4D42) throw new Error(`Invalid magic byte 0x${bytes.toString(16)}`)
  if (bytes !== 0x4D42) throw new Error('Invalid magic byte')
}

let lastWidth: u32 = 0
let lastHeight: u32 = 0
let lastColorDepth: u32 = 0

export function decodeBmp (source: Uint8Array, iconWidth: u32, iconHeight: u32, icon: boolean): Uint8Array {
  const data = new DataView(source.buffer, source.byteOffset, source.byteLength)

  let headerSize: u32
  let bitmapWidth: u32
  let bitmapHeight: u32
  let colorDepth: u32
  let colorCount: u32

  if (icon) {
    headerSize = data.getUint32(0, true)
    bitmapWidth = (data.getUint32(4, true) / 1) | 0
    bitmapHeight = (data.getUint32(8, true) / 2) | 0
    colorDepth = data.getUint16(14, true)
    colorCount = data.getUint32(32, true)
  } else {
    checkMagicBytes(data.getUint16(0, true))
    headerSize = 14 + data.getUint32(14, true)
    bitmapWidth = data.getUint32(18, true)
    bitmapHeight = data.getUint32(22, true)
    colorDepth = data.getUint16(28, true)
    colorCount = data.getUint32(46, true)
  }

  if (colorCount === 0 && colorDepth <= 8) {
    colorCount = (1 << colorDepth)
  }

  const width = (bitmapWidth === 0 ? iconWidth : bitmapWidth)
  const height = (bitmapHeight === 0 ? iconHeight : bitmapHeight)

  const bitmapData = source.subarray(headerSize, source.byteLength)

  const result = colorCount
    ? decodePaletteBmp(bitmapData, width, height, colorDepth, colorCount, icon)
    : decodeTrueColorBmp(bitmapData, width, height, colorDepth, icon)

  lastWidth = width
  lastHeight = height
  lastColorDepth = colorDepth

  return result
}

export function getLastWidth (): u32 {
  return lastWidth
}

export function getLastHeight (): u32 {
  return lastHeight
}

export function getLastColorDepth (): u32 {
  return lastColorDepth
}

export function reset (): void {
  lastWidth = 0
  lastHeight = 0
  lastColorDepth = 0
  memory.reset()
}
