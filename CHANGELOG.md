# Changelog

## v2.0.0: Handle "enterprise-scale" schemas (26/01/2019)

Major Update for handling complex "enterprise-scale" JSON schemas (dipsmishra)
.convert() is now asynchronous and returns Promise #breaking-change

* Removed 2 npm vulnerabilities (1 low, 1 critical) from mocha (upgraded mocha version)
* Added support for combination schemas (anyOf, allOf, oneOf) including nested combinations
* Added peer dependency on json-schema-ref-parser; convert returns Promise
* Array or null implementation update
* Updated code example for Promise
* Add support for record suffix config
* Add support for unique records (key requirement for valid Avro schema)
* Updated internal schema reference handling
* Updated complex property handling to handle combinations
* Unique combination schemas support
* Array unique "items" support
* Array combination schemas references support
* Allow ID split for name of 'main'

## v1.4.0 (03/12/2018)

* Array elements now supported. (pdanpdan)

## v1.3.1 (18/04/2018)

* Allows object properties to be omitted.

## v1.3.0 (23/02/2018)

* Supports namespaces.
* Supports default values.
* Supports fields with multiple types.

## v1.2.0 (20/02/2018)

* Now supports descriptions.

## v1.1.0 (14/06/2017)

* Now supports `enum` properties.

## v1.0.0 (10/06/2017)

* Initial release.
