/* eslint-env mocha */

'use strict'

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const globby = require('globby')
const lodepng = require('lodepng')
const ImageData = require('@canvas/image-data')

const decodeBmp = require('./')

const testCases = globby.sync('fixtures/*.bmp')

/**
 * @param {string} filename
 * @returns {Promise<ImageData>}
 */
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
      assert.ok(actual instanceof ImageData)
      assert.strictEqual(typeof actual.colorDepth, 'number')

      assert.strictEqual(actual.width, expected.width)
      assert.strictEqual(actual.height, expected.height)

      assert.strictEqual(actual.data.length, expected.data.length, 'The decoded data should match the target data (length)')
      assert.deepStrictEqual(actual.data, expected.data, 'The decoded data should match the target data (bytes)')
    })
  })
}
