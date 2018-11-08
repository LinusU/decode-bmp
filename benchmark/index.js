const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const compressed = fs.readFileSync(path.join(__dirname, 'boxes.bmp.gz'))
const data = zlib.gunzipSync(compressed)

const decode = require('../')

console.time('decode')
decode(data)
console.timeEnd('decode')
