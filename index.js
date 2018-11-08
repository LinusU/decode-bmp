if (process.env.USE_WASM === '1') {
  console.error('Using AssemblyScript version')

  const fs = require('fs')
  const path = require('path')
  const loader = require('./build/loader')

  const source = fs.readFileSync(path.join(__dirname, '/build/optimized.wasm'))
  const wasm = loader.instantiateBuffer(source)

  module.exports = function decodeBmp (source, { width: iconWidth = 0, height: iconHeight = 0, icon = false } = {}) {
    if (source instanceof ArrayBuffer) source = new Uint8Array(source)
    if (!(source instanceof Uint8Array)) throw new TypeError('Expected `data` to be an ArrayBuffer or Uint8Array')
    if (source instanceof Buffer) source = new Uint8Array(source.buffer, source.byteOffset, source.length)

    const inputPointer = wasm.newArray(source)
    const outputPointer = wasm.decodeBmp(inputPointer, iconWidth, iconHeight, icon)

    wasm.freeArray(inputPointer)
    const data = wasm.getArray(Uint8Array, outputPointer)
    wasm.freeArray(outputPointer)

    const width = wasm.getLastWidth()
    const height = wasm.getLastHeight()
    const colorDepth = wasm.getLastColorDepth()

    wasm.reset()

    return { width, height, data, colorDepth }
  }
} else {
  console.error('Using TypeScript version')

  const lib = require('./build/index.js')

  module.exports = function decodeBmp (source, { width: iconWidth = 0, height: iconHeight = 0, icon = false } = {}) {
    if (source instanceof ArrayBuffer) source = new Uint8Array(source)
    if (!(source instanceof Uint8Array)) throw new TypeError('Expected `data` to be an ArrayBuffer or Uint8Array')

    const data = lib.decodeBmp(source, iconWidth, iconHeight, icon)
    const width = lib.getLastWidth()
    const height = lib.getLastHeight()
    const colorDepth = lib.getLastColorDepth()

    return { width, height, data, colorDepth }
  }
}
