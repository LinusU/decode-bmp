import ImageData = require('@canvas/image-data')

declare interface Options {
  width?: number
  height?: number
  icon?: boolean
}

declare function decodeBmp (source: ArrayBuffer | Uint8Array, options?: Options): ImageData & { colorDepth: number }

export = decodeBmp
