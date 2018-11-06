/* eslint-env mocha */

'use strict'

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const globby = require('globby')
const lodepng = require('lodepng')

const decodeBmp = require('./')

const testCases = globby.sync('fixtures/*.bmp')

function loadPng (filename) {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, (err, data) => {
      if (err) return reject(err)

      resolve(lodepng.decode(data))
    })
  })
}

for (const testCase of testCases) {
  const name = path.basename(testCase, '.bmp')
  const source = fs.readFileSync(testCase)
  const targetPath = `fixtures/${name}.png`

  it(`decodes ${name}.bmp`, () => {
    const actual = decodeBmp(source)

    return loadPng(targetPath).then((expected) => {
      assert.strictEqual(actual.width, expected.width)
      assert.strictEqual(actual.height, expected.height)

      assert.strictEqual(actual.data.length, expected.data.length, 'The decoded data should match the target data (length)')
      assert.ok(Buffer.compare(Buffer.from(actual.data), expected.data) === 0, 'The decoded data should match the target data (bytes)')
    })
  })
}
