const jsonSchemaAvro = require('../src/index')
const assert = require('assert')
const fs = require('fs')

describe('index', () => {

	describe('convert()', () => {
		const sampleDir = './test/samples'
		const testDirs = fs.readdirSync(sampleDir)

		testDirs.forEach(dir => {
      // if(dir === 'unique_types') {
        describe(dir, () => {
          const inJson = require(`../${sampleDir}/${dir}/input.json`)
          const expected = require(`../${sampleDir}/${dir}/expected.json`)
          let result

          before(async () => {
            result = await jsonSchemaAvro.convert(inJson)
          })

          it('converts to avro', () => {
            // console.log(JSON.stringify(result, null, 2))
            // console.log(JSON.stringify(expected, null, 2))
            assert.deepEqual(result, expected)
          })
        })
    })

    describe('other tests', () => {
      const otherDir = './test/other-samples'

      it('supports optional record suffix "_record" as default', async () => {
        const inJson = require(`../${otherDir}/optional-record-suffix-default/input.json`)
        const expected = require(`../${otherDir}/optional-record-suffix-default/expected.json`)
        let result = await jsonSchemaAvro.convert(inJson)

        //console.log(JSON.stringify(result, null, 2))
        //console.log(JSON.stringify(expected, null, 2))
        assert.deepEqual(result, expected)
      })

      it('supports record suffix when provided', async () => {
        const inJson = require(`../${otherDir}/record-suffix-specified/input.json`)
        const expected = require(`../${otherDir}/record-suffix-specified/expected.json`)
        let result = await jsonSchemaAvro.convert(inJson, 'Record')

        //console.log(JSON.stringify(result, null, 2))
        //console.log(JSON.stringify(expected, null, 2))
        assert.deepEqual(result, expected)
      })
      
      it('supports no record suffix', async () => {
        const inJson = require(`../${otherDir}/no-record-suffix/input.json`)
        const expected = require(`../${otherDir}/no-record-suffix/expected.json`)
        let result = await jsonSchemaAvro.convert(inJson, '')

        //console.log(JSON.stringify(result, null, 2))
        //console.log(JSON.stringify(expected, null, 2))
        assert.deepEqual(result, expected)
      })

      it('supports no id splitting for main record', async () => {
        const inJson = require(`../${otherDir}/no-split-id-for-main-specified/input.json`)
        const expected = require(`../${otherDir}/no-split-id-for-main-specified/expected.json`)
        let result = await jsonSchemaAvro.convert(inJson, '', false)
        //console.log(JSON.stringify(result, null, 2))
        //console.log(JSON.stringify(expected, null, 2))
        assert.deepEqual(result, expected)
        result = await jsonSchemaAvro.convert(inJson, '', undefined)
        assert.deepEqual(result, expected)
        result = await jsonSchemaAvro.convert(inJson, '', null)
        assert.deepEqual(result, expected)
      })

      it('supports id splitting for main record swtched off by default', async () => {
        const inJson = require(`../${otherDir}/no-split-id-for-main/input.json`)
        const expected = require(`../${otherDir}/no-split-id-for-main/expected.json`)
        let result = await jsonSchemaAvro.convert(inJson)

        //console.log(JSON.stringify(result, null, 2))
        //console.log(JSON.stringify(expected, null, 2))
        assert.deepEqual(result, expected)
      })

      it('supports id splitting for main record', async () => {
        const inJson = require(`../${otherDir}/split-id-for-main/input.json`)
        const expected = require(`../${otherDir}/split-id-for-main/expected.json`)
        let result = await jsonSchemaAvro.convert(inJson, 'Record', true)

        //console.log(JSON.stringify(result, null, 2))
        //console.log(JSON.stringify(expected, null, 2))
        assert.deepEqual(result, expected)
        result = await jsonSchemaAvro.convert(inJson, 'Record', 1)
        assert.deepEqual(result, expected)
        result = await jsonSchemaAvro.convert(inJson, 'Record', {})
        assert.deepEqual(result, expected)
      })

      it('supports id splitting for main record with specified suffix', async () => {
        const inJson = require(`../${otherDir}/split-id-for-main-specified-suffix/input.json`)
        const expected = require(`../${otherDir}/split-id-for-main-specified-suffix/expected.json`)
        let result = await jsonSchemaAvro.convert(inJson, 'Record', 'Base')

        //console.log(JSON.stringify(result, null, 2))
        //console.log(JSON.stringify(expected, null, 2))
        assert.deepEqual(result, expected)
      })

    })
	})
})
