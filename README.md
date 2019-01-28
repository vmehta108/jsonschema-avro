# jsonschema-avro

Parent Project: 
[thedumbterminal/jsonschema-avro](https://github.com/thedumbterminal/jsonschema-avro)

[![Build Status](https://travis-ci.org/dipsmishra/jsonschema-avro.svg?branch=master)](https://travis-ci.org/dipsmishra/jsonschema-avro)

Converts JSON-schema definitions into Avro definitions.

## Install

    npm install --save dipsmishra/jsonschema-avro#master

## Consume

    const jsonSchemaAvro = require('jsonschema-avro')
    
    const inJson = {
    	"description": "Example description",
    	"type": "object",
    	"properties": {
    		"first_name": { "type": "string" },
    		"address": {
    			"type": "object",
    			"properties": {
    				"street_address": { "type": "string" }
    			}
    		}
    	}
    }
    
    jsonSchemaAvro.convert(inJson)
        .then(avro => {
            // use avro schema here
        }).catch(err => {
            // handle error here
        });

## Options
  jsonSchemaAvro.convert(inJson, recordSuffix, splitIdForName)

### Parameters
  - inJson: (mandatory) JSON schema object to convert to Avro
  - recordSuffix: (optional) Suffix to be appended to the name of each record type (default: '_record')
  - splitIdForName: (optional) Split id in schema to obtain namespace and name (default: false)
      Note: a custom suffix may be provided to the name by specifying it as a string value for this option

All external references are resolved using the excellent [json-schema-ref-parser](https://www.npmjs.com/package/json-schema-ref-parser).

## Test

    npm test

## TODO

* More tests for edge cases.
