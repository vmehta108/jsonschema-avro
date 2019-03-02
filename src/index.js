const	RefParser = require('json-schema-ref-parser');
const	$RefParser = new RefParser();

const jsonSchemaAvro = module.exports = {}

// Json schema on the left, avro on the right
const typeMapping = {
	'array': 'array',
	'string': 'string',
	'null': 'null',
	'boolean': 'boolean',
	'integer': 'int',
	'number': 'float'
}

const reSymbol = /^[A-Za-z_][A-Za-z0-9_]*$/;

jsonSchemaAvro._collectCombinationReferences = (contents) => {
	return !contents ? [] : [].concat.apply([], 
		jsonSchemaAvro._getCombinationOf(contents).map(
			(it) => {
				return jsonSchemaAvro._isCombinationOf(it) ?
					jsonSchemaAvro._collectCombinationReferences(it) :
					(it.properties ? it.properties : [])
			}
		)
	)
}

jsonSchemaAvro._mapPropertiesToTypes = (dereferencedAvroSchema) => {
  if(!dereferencedAvroSchema) return new Map();
  const new_obj = new Map();
  let name 
  let prop
  for (name in dereferencedAvroSchema) {
    if(dereferencedAvroSchema.hasOwnProperty(name)) {
      prop = dereferencedAvroSchema[name];
      prop["$ref"] = name;
      if(dereferencedAvroSchema[name].hasOwnProperty('properties')) {
        new_obj.set(dereferencedAvroSchema[name].properties, prop);
      } else if(dereferencedAvroSchema[name].hasOwnProperty('additionalProperties') && 
          dereferencedAvroSchema[name].additionalProperties) {
        new_obj.set(dereferencedAvroSchema[name].additionalProperties, prop);
      } else if(jsonSchemaAvro._isCombinationOf(dereferencedAvroSchema[name])) {
        new_obj.set(jsonSchemaAvro._collectCombinationReferences(dereferencedAvroSchema[name]), prop);
      } else {
        // throw new Error(`Invalid or unhandled reference: ${JSON.stringify(prop)}`);
      }
    }
  }
  return new_obj
};

jsonSchemaAvro.convert = async (schema, recordSuffix, splitIdForMain, enumSuffix) => {
	if(!schema){
		throw new Error('No schema given')
  }
  
  if (typeof recordSuffix === 'undefined' || recordSuffix === null) { 
    recordSuffix = '_record';
  }

  if (typeof enumSuffix === 'undefined' || enumSuffix === null) { 
    enumSuffix = '_enum';
  }

  jsonSchemaAvro._splitIdForMain = splitIdForMain;
  jsonSchemaAvro._enumSuffix = enumSuffix;
  jsonSchemaAvro._globalTypesCache = new Map();
  jsonSchemaAvro._definitions = new Map();
  jsonSchemaAvro._recordSuffix = recordSuffix;
  jsonSchemaAvro._schema = schema;

	const avroSchema = await $RefParser.dereference(schema)
		  .then(function(jsonSchema) {
        jsonSchemaAvro._avroJsonSchema = jsonSchema;
        jsonSchemaAvro._definitions = jsonSchemaAvro._mapPropertiesToTypes(
          $RefParser.$refs.values()[$RefParser.$refs.paths()].definitions
        );
		    return jsonSchemaAvro._mainRecord(jsonSchema)
		  })
		  .catch(function(err) {
		  	throw err;
		  });
	return avroSchema
}

jsonSchemaAvro._mainRecord = (jsonSchema) => {
  const schemaId = jsonSchemaAvro._convertId(jsonSchema.id);
  const schemaIdParts = schemaId.split('.');
  let schemaName = schemaIdParts.pop();
  if(typeof jsonSchemaAvro._splitIdForMain === 'string') {
    schemaIdParts.push(schemaName);
    schemaName = schemaName + jsonSchemaAvro._splitIdForMain
  }
  const ns = jsonSchemaAvro._splitIdForMain ? schemaIdParts.join('.') : schemaId;
  const mainRecordName = jsonSchemaAvro._splitIdForMain ? schemaName : 'main';
	return jsonSchemaAvro._isOneOf(jsonSchema) || jsonSchemaAvro._isAnyOf(jsonSchema) ? 
		{
			namespace: ns,
			...jsonSchemaAvro._convertCombinationOfProperty(mainRecordName, jsonSchema)
		} :
		{
			namespace: ns,
			name: mainRecordName,
			type: 'record',
			doc: jsonSchema.description,
			fields: [].concat.apply([], jsonSchemaAvro._getCombinationOf(jsonSchema).
				map((it) => it.properties ? jsonSchemaAvro._convertProperties(it.properties) : [])
			)
		}
}

jsonSchemaAvro._convertId = (id) => {
	return id ? id.replace(/([^a-z0-9]+)/ig, '.') : id
}

jsonSchemaAvro._isComplex = (schema) => {
	return schema && schema.type === 'object'
}

jsonSchemaAvro._isArray = (schema) => {
	return schema && schema.type === 'array'
}

jsonSchemaAvro._hasEnum = (schema) => {
	return schema && Boolean(schema.enum)
}

jsonSchemaAvro._isCombinationOf = (schema) => {
	// common handling for 'union' in avro
	return schema && (schema.hasOwnProperty('oneOf') || 
			schema.hasOwnProperty('allOf') || 
			schema.hasOwnProperty('anyOf'))
}

jsonSchemaAvro._isOneOf = (schema) => {
	return schema && schema.hasOwnProperty('oneOf')
}

jsonSchemaAvro._isAllOf = (schema) => {
	return schema && schema.hasOwnProperty('allOf')
}

jsonSchemaAvro._isAnyOf = (schema) => {
	return schema && schema.hasOwnProperty('anyOf')
}

jsonSchemaAvro._getCombinationOf = (schema) => {
	// common handling for 'union' in avro
	return schema && schema.hasOwnProperty('anyOf') ? 
				schema.anyOf :
				(schema && schema.hasOwnProperty('oneOf') ?
					schema.oneOf :
					(schema && schema.hasOwnProperty('allOf') ?
						schema.allOf : 
						// wrap to simplify recursion in edge cases
						(schema ? [ schema ] : schema)
					)
				)
}

jsonSchemaAvro._convertProperties = (schema) => {
	return Object.keys(schema).map((item) => {
		if(jsonSchemaAvro._isComplex(schema[item])){
        return jsonSchemaAvro._convertComplexProperty(item, schema[item])
		}
		else if (jsonSchemaAvro._isArray(schema[item])) {
        return jsonSchemaAvro._convertArrayProperty(item, schema[item])
		}
		else if(jsonSchemaAvro._hasEnum(schema[item])){
        return jsonSchemaAvro._convertEnumProperty(item, schema[item])
		}
		else if(jsonSchemaAvro._isCombinationOf(schema[item])){
        return jsonSchemaAvro._convertCombinationOfProperty(item, schema[item])
		}
		return jsonSchemaAvro._convertProperty(item, schema[item])
	})
}

jsonSchemaAvro._collectCombinationProperties = (contents) => {
	return !contents ? [] : [].concat.apply([], 
		jsonSchemaAvro._getCombinationOf(contents).map(
			(it) => {
				return jsonSchemaAvro._isCombinationOf(it) ?
					jsonSchemaAvro._collectCombinationProperties(it) :
					(it.properties ? jsonSchemaAvro._convertProperties(it.properties) : [])
			}
		)
	)
}

jsonSchemaAvro._getDereferencedType = (schema) => {
	if(!schema) return schema;
	let typeDef;

	if(schema.hasOwnProperty('properties')) {
		typeDef = jsonSchemaAvro._definitions.get(schema.properties)
	} else if(schema.hasOwnProperty('additionalProperties' && schema.additionalProperties)) {
		typeDef = jsonSchemaAvro._definitions.get(schema.additionalProperties)
	} else {
		typeDef = schema;
	}

	if(!typeDef) return typeDef;

	const dereferencedType = {
		type: typeDef['$ref'],
	};
	if(typeDef.hasOwnProperty('name')) {
		dereferencedType.name = typeDef.name;
	}
	if(typeDef.hasOwnProperty('description')) {
		dereferencedType.doc = typeDef.description;
  }
	return dereferencedType;
}

jsonSchemaAvro._convertCombinationOfProperty = (name, contents) => {
   return ({
    name: name,
    doc: contents.description || '',
    type: !contents ? []: [].concat.apply([], jsonSchemaAvro._getCombinationOf(contents).
      map((it) => {
        const recordName = it.name ?
          `${it.name}${jsonSchemaAvro._recordSuffix}` :
          `${name}${jsonSchemaAvro._recordSuffix}`;
        if (it && it.type && it.type === 'null') {
          return 'null'
        } else if (jsonSchemaAvro._globalTypesCache.get(it['$ref'])) {
          return jsonSchemaAvro._globalTypesCache.get(it['$ref']);
        } else {
          let dereferencedType = jsonSchemaAvro._getDereferencedType(it);
          jsonSchemaAvro._globalTypesCache.set(it['$ref'], dereferencedType);
          let complexProperty = jsonSchemaAvro._hasEnum(it) ?
          jsonSchemaAvro._convertEnumProperty(dereferencedType ? dereferencedType.type : recordName, it, 
              dereferencedType ? dereferencedType.doc : it.description || ''):
          {
            type: 'record',
            name: dereferencedType ? dereferencedType.type : recordName,
            doc: dereferencedType ? dereferencedType.doc : it.description || '',
            fields: jsonSchemaAvro._isCombinationOf(it) ?
              jsonSchemaAvro._collectCombinationProperties(it) :
              (it.properties ? jsonSchemaAvro._convertProperties(it.properties) : [])
          };
          return complexProperty;
        }
      }))
  });
}

jsonSchemaAvro._convertComplexProperty = (name, contents) => {
  const recordName = `${name}${jsonSchemaAvro._recordSuffix}`;
  if (jsonSchemaAvro._globalTypesCache.get(contents.properties)) {
    const complexProperty = {
      name: name,
      doc: contents.description || '',
      type: jsonSchemaAvro._globalTypesCache.get(contents.properties).type
    };
    return complexProperty;
  } else {
    const dereferencedType = jsonSchemaAvro._getDereferencedType(contents);
    const recordType = {
      type: 'record',
      name:  (dereferencedType && (dereferencedType.name || dereferencedType.type)) || recordName,
      fields: [].concat.apply([], jsonSchemaAvro._getCombinationOf(contents || {}).
        map((it) => it.properties ? jsonSchemaAvro._convertProperties(it.properties) : []))
    };
    if(dereferencedType && dereferencedType.doc) {
      recordType.doc = dereferencedType.doc;
    }
    jsonSchemaAvro._globalTypesCache.set(contents.properties, dereferencedType);
    const complexProperty = {
      name: name,
      doc: contents.description || '',
      type: recordType
    };

    return complexProperty
  }
}

jsonSchemaAvro._getItems = (name, contents) => {
  const recordName = `${name}${jsonSchemaAvro._recordSuffix}`;
  if (jsonSchemaAvro._isComplex(contents.items)) {
    const key = contents.items['$ref'] || contents.items.additionalProperties || contents.items.properties;
    if (jsonSchemaAvro._globalTypesCache.get(key)) {
      return jsonSchemaAvro._globalTypesCache.get(key);
    } else {
      const dereferencedType = jsonSchemaAvro._getDereferencedType(contents.items);
      if(contents.items.additionalProperties) {
        const map = {
          type: 'map',
        };
        if(dereferencedType && dereferencedType.doc || contents.items && contents.items.description) {
          map.doc = dereferencedType ? dereferencedType.doc : (contents.items.description || '')
        }
        const mappedType = typeMapping[contents.items.additionalProperties.type];
        map.values = mappedType && mappedType !== 'array' ? mappedType : 
            jsonSchemaAvro._convertProperty(undefined, contents.items.additionalProperties);
        return map;
      }
      jsonSchemaAvro._globalTypesCache.set(key, dereferencedType);
      return {
        type: 'record',
        name: (dereferencedType && (dereferencedType.name || dereferencedType.type)) || recordName,
        doc: dereferencedType ? dereferencedType.doc : (contents.items.description || ''),
        fields: jsonSchemaAvro._convertProperties(contents.items.properties || {})
      }
    }
  }
  return jsonSchemaAvro._convertProperty(name, contents.items)
}

jsonSchemaAvro._convertArrayProperty = (name, contents) => {
	return {
		name: name,
		doc: contents.description || '',
		type: {
			type: 'array',
			items: jsonSchemaAvro._getItems(name, contents)
		}
	}
}

jsonSchemaAvro._convertEnumProperty = (name, contents, doc) => {
  const valid = contents.enum.every((symbol) => reSymbol.test(symbol))
  const enumProp = {
    name: name,
    doc: doc || contents.description || '',
  };
  
  if(contents.hasOwnProperty('$ref')) {
    if(valid) {
      enumProp.type = 'enum';
      enumProp.symbols = contents.enum;
    } else {
      enumProp.type = 'string';
    }
  } else {
    if(valid) {
      enumProp.type = valid ? {
        type: 'enum',
        name: `${name}${jsonSchemaAvro._enumSuffix}`,
        symbols: contents.enum
      } : 'string';
    }
  }
	if(contents.hasOwnProperty('default')){
		enumProp.default = contents.default
	}
	return enumProp
}

jsonSchemaAvro._convertProperty = (name, value) => {
  const prop = { };
  if(name) {
    prop.name = name;
    prop.doc = value.description || ''
  }
	if(value.hasOwnProperty('default')){
		prop.default = value.default
	}
	if(Array.isArray(value.type)){
    prop.type = value.type.map(type => {
        return type === 'array' ? 
        {
          type: 'array',
          items: jsonSchemaAvro._getItems(name, value)
        }:
        type === 'object' && value.additionalProperties ?
        {
          type: 'map',
          values: value.additionalProperties.type !== 'array' &&
                      value.additionalProperties.type !== 'object' ? 
                    typeMapping[value.additionalProperties.type] :
                    jsonSchemaAvro._convertProperty(undefined, value.additionalProperties)
        }
        : typeMapping[type];
      })
	}
	else{
    prop.type = typeMapping[value.type]
    if(prop.type === 'array') {
      const itemType = jsonSchemaAvro._getItems(name, value);
      prop.items = itemType && itemType.type && typeMapping[itemType.type] || itemType
    }
  }
	return prop
}
