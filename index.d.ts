declare interface ImageData {
  width: number
  height: number
  data: Uint8Array
  colorDepth: number
}

declare interface Options {
  width?: number
  height?: number
  icon?: boolean
}

declare function decodeBmp (source: ArrayBuffer | Uint8Array, options?: Options): ImageData

export = decodeBmp
