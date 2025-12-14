(function () {

//
// tagged strings parser
//

const
RgxPunctuator = /\.\.\.|[-+\{\}\[\]:,@]/y,
RgxIdentifier = /(\x23?)(?=[$_\p{ID_Start}\\])(?:[$_\u200C\u200D\p{ID_Continue}]+|\\u[\da-fA-F]{4}|\\u\{[\da-fA-F]+\})+/yu,
RgxString = /(['"])(?:[^'"\\\n\r]+|(?!\1)['"]|\\(?:\r\n|[^]))*(\1)?/y,
RgxNumber = /[0-9]+/y,
RgxWhiteSpace = /[\t\v\f\ufeff\p{Zs}]+/yu,
RgxMultiLineComment = /\/\*(?:[^*]+|\*(?!\/))*(\*\/)?/y;
RgxSingleLineComment = /\/\/.*/y;

function *parseTemplate(str) {
	var match, cursor = 0;
	while (cursor < str.length) {
		RgxWhiteSpace.lastIndex = cursor;
		if (match = RgxWhiteSpace.exec(str)) {
			cursor = RgxWhiteSpace.lastIndex;
			continue;
		}

		RgxMultiLineComment.lastIndex = cursor;
		if (match = RgxMultiLineComment.exec(str)) {
			cursor = RgxMultiLineComment.lastIndex;
			continue;
		}

		RgxSingleLineComment.lastIndex = cursor;
		if (match = RgxSingleLineComment.exec(str)) {
			cursor = RgxSingleLineComment.lastIndex;
			continue;
		}

		RgxIdentifier.lastIndex = cursor;
		if (match = RgxIdentifier.exec(str)) {
			yield { type: "id", value: match[0] };
			cursor = RgxIdentifier.lastIndex;
			continue;
		}

		RgxString.lastIndex = cursor;
		if (match = RgxString.exec(str)) {
			yield { type: "id", value: eval(match[0]) };
			cursor = RgxString.lastIndex;
			continue;
		}

		RgxNumber.lastIndex = cursor;
		if (match = RgxNumber.exec(str)) {
			yield { type: "number", value: eval(match[0]) };
			cursor = RgxNumber.lastIndex;
			continue;
		}

		RgxPunctuator.lastIndex = cursor;
		if (match = RgxPunctuator.exec(str)) {
			if (match[0] !== ':' && match[0] !== ',' && match[0] !== '...') {
				yield { type: "punct", value: match[0] };
			}
			cursor = RgxPunctuator.lastIndex;
			continue;
		}

		throw new SyntaxError("Unexpected character '" + str.charAt(cursor) + "'");
	}
}

function parseStrings(strings) {
	var result = new Array(), phIdx = 0;
	for (var str of strings) {
		for (var token of parseTemplate(str)) {
			result.push(token);
		}
		result.push({ type: "placeholder", index: phIdx++ });
	}
	result.pop(); // last placeholder, which is dummy
	return result;
}

function parsedStringsToKey(parsedStrings) {
	var result = new Array();
	for (var parsedString of parsedStrings) {
		if (parsedString.type === 'id') result.push(JSON.stringify(parsedString.value));
		else if (parsedString.type === 'placeholder') result.push("#" + parsedString.index);
		else result.push(parsedString.value);
	}
	return result.join(' ');
}

function isTokenValue(token, value) {
	return token && token.value === value;
}

function isTokenType(token, type) {
	return token && token.type === type;
}

function isToken(token, type, value) {
	return token && token.type === type && token.value === value;
}

function throwParseError(token, message) {
	if (token.type === 'placeholder') token.value = 'placeholder #' + (token.index + 1);
	throw new SyntaxError((token ? ("'" + token.value + "': ") : "end of input: ") + message);
}

// SCHEMA ::= ARRAY_SCHEMA | OBJECT_SCHEMA | EXT_SCHEMA
function tryParseSchema(str, position) {
	return tryParseObjectOrArraySchema(str, position, "[", "]", "ARRAY_SCHEMA") ||
		tryParseObjectOrArraySchema(str, position, "{", "}", "OBJECT_SCHEMA") ||
		tryParseExtSchema(str, position);
}

// OBJECT_SCHEMA ::= '{' SCHEMA_IDX* '}'
// ARRAY_SCHEMA ::= '[' SCHEMA_IDX* ']'
function tryParseObjectOrArraySchema(str, position, opener, closer, type) {
	var token = str[position++];
	if (!isToken(token, "punct", opener)) return null;
	var schemaIdxArr = new Array();
	for (;;) {
		var schemaIdx = tryParseSchemaIdx(str, position);
		if (!schemaIdx) break;
		position = schemaIdx[1];
		schemaIdxArr.push(schemaIdx[0]);
	}
	token = str[position++];
	if (!isToken(token, "punct", closer)) throwParseError(token, "'" + closer + "' expected");
	return [{
		type,
		idxs: schemaIdxArr
	}, position];
}

// EXT_SCHEMA ::= '@' placeholder
function tryParseExtSchema(str, position) {
	var token = str[position++];
	if (!isToken(token, "punct", "@")) return null;
	token = str[position++];
	if (!isTokenType(token, "placeholder")) throwParseError(token, "Placeholder value expected");
	return [{
		type: "EXT_SCHEMA",
		placeholder: token.index
	}, position];
}

// SCHEMA_IDX ::= IDX SCHEMA?
function tryParseSchemaIdx(str, position) {
	var idx = tryParseIdx(str, position);
	if (!idx) return null;
	position = idx[1];
	idx = idx[0];
	var schema = tryParseSchema(str, position);
	if (schema) {
		position = schema[1];
		schema = schema[0];
	}
	return [{
		type: "SCHEMA_IDX",
		idx,
		schema
	}, position];
}

// IDX ::= IDSTRING | IDNUMBER
function tryParseIdx(str, position) {
	var token = str[position++];
	if (!isTokenType(token, "id") && !isTokenType(token, "number")) return null;
	return [token.value, position];
}

// SET ::= SET_ARRAY | SET_OBJECT | SET_ARRAY_SEQ | SET_SCHEMA
function tryParseSet(str, position) {
	return tryParseSetArraySeq(str, position) ||
		tryParseSetArrayOrObject(str, position, "[", "]", "SET_ARRAY") ||
		tryParseSetArrayOrObject(str, position, "{", "}", "SET_OBJECT") ||
		tryParseSetSchema(str, position);
}

// SET_ARRAY ::= '[' SET_IDX* ']'
// SET_OBJECT ::= '{' SET_IDX* '}'
function tryParseSetArrayOrObject(str, position, opener, closer, type) {
	var token = str[position++];
	if (!isToken(token, "punct", opener)) return null;
	var setIdxArr = new Array();
	for (;;) {
		var setIdx = tryParseSetIdx(str, position);
		if (!setIdx) break;
		position = setIdx[1];
		setIdxArr.push(setIdx[0]);
	}
	token = str[position++];
	if (!isToken(token, "punct", closer)) throwParseError(token, "'" + closer + "' expected");
	return [{
		type,
		idxs: setIdxArr
	}, position];
}

// SET_ARRAY_SEQ ::= '[' SET_VALUE* ']'
function tryParseSetArraySeq(str, position) {
	var token = str[position++];
	if (!isToken(token, "punct", "[")) return null;
	var setIdxArr = new Array();
	for (;;) {
		var setIdx = tryParseSetValue(str, position);
		if (!setIdx) break;
		position = setIdx[1];
		setIdxArr.push(setIdx[0]);
	}
	token = str[position++];
	if (!isToken(token, "punct", "]")) return null; // it may be a SET_ARRAY, so don't panic right away
	return [{
		type: "SET_ARRAY_SEQ",
		idxs: setIdxArr
	}, position];
}

// SET_SCHEMA ::= '@' SET_SCHEMA_SCHEMA placeholder
function tryParseSetSchema(str, position) {
	var token = str[position++];
	if (!isToken(token, "punct", "@")) return null;

	var schema = tryParseSetSchemaSchema(str, position);
	if (!schema) throwParseError(str[position], "Expected schema value placeholder or inline schema");
	position = schema[1];
	schema = schema[0];
	var placeholder = str[position++];
	if (!isTokenType(placeholder, "placeholder")) throwParseError(token, "Placeholder expected");
	return [{
		type: "SET_SCHEMA",
		schema,
		placeholder: placeholder.index
	}, position];
}

// SET_SCHEMA_SCHEMA ::= placeholder | OBJECT_SCHEMA | ARRAY_SCHEMA
function tryParseSetSchemaSchema(str, position) {
	var token = str[position];
	if (isTokenType(token, "placeholder")) {
		return [{
			placeholder: token.index
		}, ++position];
	}

	return tryParseObjectOrArraySchema(str, position, "[", "]", "ARRAY_SCHEMA") ||
		tryParseObjectOrArraySchema(str, position, "{", "}", "OBJECT_SCHEMA")
}

// SET_IDX ::= IDX SET_VALUE
function tryParseSetIdx(str, position) {
	var idx = tryParseIdx(str, position);
	if (!idx) return null;
	position = idx[1];
	idx = idx[0];
	var setValue = tryParseSetValue(str, position);
	if (!setValue) return null;
	position = setValue[1];
	setValue = setValue[0];
	return [{
		type: "SET_IDX",
		idx,
		setValue
	}, position];
}

// SET_VALUE ::= placeholder | SET
function tryParseSetValue(str, position) {
	var token = str[position];
	if (isTokenType(token, "placeholder")) {
		return [{
			placeholder: token.index
		}, ++position];
	}

	return tryParseSet(str, position);
}

// EDIT_ARRAY ::= '+' '[' MODIFY_IDX* ']'
// EDIT_OBJECT ::= '+' '{' MODIFY_IDX* '}'
function tryParseEditArrayOrObject(str, position, opener, closer, type) {
	var token = str[position++];
	if (!isToken(token, "punct", "+")) return null;
	token = str[position++];
	if (!isToken(token, "punct", opener)) return null;

	var modifyIdxArr = new Array();
	for (;;) {
		var modifyIdx = tryParseModifyIdx(str, position);
		if (!modifyIdx) break;
		position = modifyIdx[1];
		modifyIdxArr.push(modifyIdx[0]);
	}
	token = str[position++];
	if (!isToken(token, "punct", closer)) throwParseError(token, "'" + closer + "' expected");
	return [{
		type,
		idxs: modifyIdxArr
	}, position];
}

// MODIFY_IDX ::= DELETE_IDX | SET_IDX | EDIT_IDX
function tryParseModifyIdx(str, position) {
	return tryParseDeleteIdx(str, position) ||
		tryParseSetIdx(str, position) ||
		tryParseEditIdx(str, position);
}

// DELETE_IDX ::= '-' IDX
function tryParseDeleteIdx(str, position) {
	var token = str[position++];
	if (!isToken(token, "punct", "-")) return null;
	var idx = tryParseIdx(str, position);
	if (!idx) throwParseError(token, "an index expected");

	position = idx[1];
	idx = idx[0];
	return [{
		type: "DELETE_IDX",
		idx
	}, position];
}

// EDIT_IDX ::= IDX EDIT_VALUE
function tryParseEditIdx(str, position) {
	var idx = tryParseIdx(str, position);
	if (!idx) return null;
	position = idx[1];
	idx = idx[0];

	var editValue = tryParseEditValue(str, position);
	if (!editValue) return null;
	position = editValue[1];
	editValue = editValue[0];
	return [{
		type: "EDIT_IDX",
		idx,
		editValue
	}, position];
}

// EDIT_VALUE ::= EDIT_ARRAY | EDIT_OBJECT
function tryParseEditValue(str, position) {
	return tryParseEditArrayOrObject(str, position, "[", "]", "EDIT_ARRAY") ||
		tryParseEditArrayOrObject(str, position, "{", "}", "EDIT_OBJECT");
}

function assertParseOk(parsed, strs, cursorAt) {
	if (!parsed || cursorAt < strs.length) throwParseError(strs[cursorAt], "Unexpected end of input");
}

//
// schemas
//

const Map = globalThis.Map; // cache it in case the Map is patched later

// schema_stringified -> { schemaKey: str, members: [...string/int], isArray: bool, index: int, mutableClone, addSchema: Map(schema -> schema), subtractSchema: Map(schema -> schema)}
const shallowSchemas = new Map();
const SCHEMA = Symbol("SCHEMA");
const ValueTypeObjectProto = {
	__proto__: null,
	toString() {
		var components = new Array();
		function fillComponents(object) {
			const schema = object[SCHEMA];
			components.push(schema.isArray ? "[" : "{");
			for (var i = 0; i < schema.members.length; i++) {
				if (i > 0) components.push(",");
				const member = schema.members[i];
				components.push(member);
				if (object[member] && object[member][SCHEMA])
					fillComponents(object[member]);
			}
			components.push(schema.isArray ? "]" : "}");
		}
		fillComponents(this);
		return "[valueobject " + components.join("") + "]";
	}
};

// comparison helpers (we'll need them to generate uncheckedEquals and uncheckedComparator)

const typeofOrder = {
	"null": 1,
	"undefined": 2,
	"boolean": 3,
	"symbol": 4,
	"number": 5,
	"bigint": 6,
	"string": 7,
	"function": 8,	
	"object": 9	
};

function createFunction(...args) {
	var code = args.pop(), name = args.shift();
	return eval(`function ${name}(${args.join(", ")}) { ${code} }${"\n"}${name};`);
}

var nvIdx = 0;
const nonValueIdxMap = new WeakMap();
function valueTypeComparator(objLhs, objRhs, differNonValues) {
	const typeofResult = typeofOrder[typeof(objLhs)] - typeofOrder[typeof(objRhs)];
	if (typeofResult) return typeofResult; // non-zero = different types

	// if we got here then objLhs and objRhs are both of the same typeof
	if (!objLhs && !objRhs) {
		return 0; // false, null, undefined, 0, 0n, or "" (both of them)
	} else if (!objLhs && objRhs) return -1;
	else if (objLhs && !objRhs) return 1;
	else {
		var schema1, schema2;
		if (((schema1 = objLhs[SCHEMA]) === (schema2 = objRhs[SCHEMA])) && schema1) {
			// both value-type objects with same schema
			return schema1.uncheckedComparator(objLhs, objRhs, differNonValues);
		} else if (schema1 && schema2) {
			// both value-type objects with different schemas
			return schema1.index < schema2.index ? -1 : 1;
		} else if (schema1 || schema2) {
			// only one of objects is value-type: the value-type objects are "less" than non-value-type objects
			return schema1 ? -1 : 1;
		}
		if (typeof(objLhs) === 'string' || typeof(objLhs) === 'number' || typeof(objLhs) === 'bigint' || typeof(objLhs) === 'boolean') {
			// remember that objRhs has the same typeof, so we can compare them as primitives
			return objLhs === objRhs ? 0 : (objLhs < objRhs ? -1 : 1);
		}
		// if got here, then we have both non-value-type objects
		if (differNonValues) {
			// need to differ non-value-type objects, so get their indexes (or assign if none yet)
			var idxLhs = nonValueIdxMap.get(objLhs), idxRhs = nonValueIdxMap.get(objRhs);
			if (!idxLhs) {
				idxLhs = ++nvIdx;
				nonValueIdxMap.set(objLhs, idxLhs);
			}
			if (!idxRhs) {
				idxRhs = ++nvIdx;
				nonValueIdxMap.set(objRhs, idxRhs);
			}
			return idxLhs - idxRhs;
		} else {
			// all non-value-type objects are equivalent
			return 0;
		}
	}
}

function valueTypeEquals(objLhs, objRhs) {
	if (objLhs === objRhs) return true;
	if ((!objLhs && !objRhs) ||
		typeofOrder[typeof(objLhs)] !== typeofOrder[typeof(objRhs)]) return false;
	var schema1, schema2;
	if ((schema1 = objLhs[SCHEMA]) && schema1 === (schema2 = objRhs[SCHEMA])) {
		// both composite value-types with same schema
		return schema1.uncheckedEquals(objLhs, objRhs);
	} else {
		// both are non-null non-value-type objects or primitive types
		return objLhs === objRhs;
	}
}

// map helpers

// the main unit of the VT_Map is object MapNode { bySchema: Map[Schema -> MapNode], byValue: Map[Value -> Map[Value -> ...]|{key, value}] }
// we will need this to generate lookupMap, lookupMapWithCreate and lookupMapWithDelete (as schema methods)

function lookupMap(mapNode, key) {
	var schema;
	if (key && (schema = key[SCHEMA])) {
		return schema.lookup(mapNode, key);
	} else {
		return mapNode.byValue.get(key);
	}
}

const NEW_ENTRY = Symbol();
function lookupMapWithCreate(mapNode, key, terminalNode) {
	var schema;
	if (key && (schema = key[SCHEMA])) {
		var result = schema.lookupWithCreate(mapNode, key, terminalNode);
		if (terminalNode && result.value === NEW_ENTRY) result.key = key;
	} else {
		var result = mapNode.byValue.get(key);
		if (!result) {
			result = terminalNode ? { __proto__: null, key, value: NEW_ENTRY }
				: { __proto__: null, bySchema: new Map(), byValue: new Map() };
			mapNode.byValue.set(key, result);
		}
	}
	return result;
}

const mapCleanupStack = new Array(); // use the same array instance for all calls to be more performant
function lookupMapWithDelete(mapNode, key, stack, terminalNode) {
	var schema, result, needCleanupHere = !stack;
	if (needCleanupHere) {
		mapCleanupStack.length = 0;
		stack = mapCleanupStack;
	}

	if (key && (schema = key[SCHEMA])) {
		// a key with schema - lookup with schema's method
		result = schema.lookupWithDelete(mapNode, key, stack);
	} else {
		// a primitive or non-schema object key - lookup in the byValue map
		result = mapNode.byValue.get(key);
		if (result) {
			if (terminalNode) mapNode.byValue.delete(key);
			else stack.push([mapNode.byValue, key, result]);
		}
	}

	if (result && needCleanupHere) {
		var maybeCleanItem;
		while (maybeCleanItem = stack.pop()) {
			var [fromMap, fromKey, checkNode] = maybeCleanItem;
			if (checkNode.byValue.size + checkNode.bySchema.size <= 0) {
				fromMap.delete(fromKey);
			} else break; // no deletion on this node, no sense to proceed higher
		}
		mapCleanupStack.length = 0;
	}
	return result;
}

// helper node to generalize cleanup logic for directly-by-schema terminal nodes (for empty schemas)
const EMPTY_MAP_NODE = { __proto__: null, bySchema: { size: 0 }, byValue: { size: 0 } };

// actual schema framework

function getSchemaString(isArray, members) {
	return (isArray ? "A" : "O" ) + JSON.stringify([...members].sort());
}

function getSchemaByMembers(isArray, members) {
	var schemaKey = getSchemaString(isArray, members);

	var schema = shallowSchemas.get(schemaKey);
	if (!schema) {
		var mutableCloneCode = new Array(),
			uncheckedEqualsCode = new Array(),
			uncheckedComparatorCode = new Array(),
			lookupMapCode = new Array(),
			lookupMapWithCreateCode = new Array(),
			lookupMapWithDeleteCode = new Array();
		if (isArray) mutableCloneCode.push("var result = new Array();");
		else mutableCloneCode.push("var result = { __proto__: ValueTypeObjectProto };");
		lookupMapCode.push("var v = mapNode.bySchema.get(this);",
			"if (!v) return null;");
		lookupMapWithCreateCode.push("var v = mapNode.bySchema.get(this);",
			"if (!v) {",
				`v = terminalNode && ${members.length <= 0} ? { __proto__: null, key: null, value: NEW_ENTRY } : { __proto__: null, bySchema: new Map(), byValue: new Map() };`,
				"mapNode.bySchema.set(this, v);",
			"}");
		lookupMapWithDeleteCode.push("var v = mapNode.bySchema.get(this);",
			"if (!v) return null;",
			"stack.push([mapNode.bySchema, this, v.byValue ? v : EMPTY_MAP_NODE]);");
		//for (var member of members) {
		for (var i = 0; i < members.length; i++) {
			const member = JSON.stringify(members[i]), isLast = (i == members.length - 1);
			mutableCloneCode.push(`result[${member}] = obj[${member}];`);
			uncheckedEqualsCode.push(`valueTypeEquals(o1[${member}], o2[${member}])`);
			uncheckedComparatorCode.push(`valueTypeComparator(o1[${member}], o2[${member}], differNonValues)`);
			if (!isLast) {
				lookupMapCode.push(`v = lookupMap(v, key[${member}]);`,
					"if (!v) return null;");
				lookupMapWithCreateCode.push(`v = lookupMapWithCreate(v, key[${member}], false);`);
				lookupMapWithDeleteCode.push(`v = lookupMapWithDelete(v, key[${member}], stack, false);`,
					"if (!v) return null;");
			} else {
				lookupMapCode.push(`return lookupMap(v, key[${member}]);`);
				lookupMapWithCreateCode.push(`return lookupMapWithCreate(v, key[${member}], terminalNode);`);
				lookupMapWithDeleteCode.push(`return lookupMapWithDelete(v, key[${member}], stack, true);`);
			}
		}
		mutableCloneCode.push("return result;");
		if (members.length <= 0) {
			// the degenerate case
			lookupMapCode.push("return v;");
			lookupMapWithCreateCode.push("return v;");
			lookupMapWithDeleteCode.push("return v;");
		}

		schema = Object.freeze({
			schemaKey,
			members: Object.freeze([...members].sort()),
			isArray,
			index: shallowSchemas.size,
			mutableClone: createFunction("mutableClone", "obj", mutableCloneCode.join("\n")),
			uncheckedEquals: createFunction("uncheckedEquals", "o1", "o2", "return " +
				(uncheckedEqualsCode.length > 0 ? "(" + uncheckedEqualsCode.join(" && ") + ")" : "true") + ";"),
			uncheckedComparator: createFunction("uncheckedComparator", "o1", "o2", "differNonValues", "return " +
				(uncheckedComparatorCode.length > 0 ? "(" + uncheckedComparatorCode.join(" || ") + ")" : "0") + ";"),
			lookup: createFunction("lookup", "mapNode", "key", lookupMapCode.join("\n")),
			lookupWithCreate: createFunction("lookupWithCreate", "mapNode", "key", "terminalNode", lookupMapWithCreateCode.join("\n")),
			lookupWithDelete: createFunction("lookupWithDelete", "mapNode", "key", "stack", lookupMapWithDeleteCode.join("\n")),
			addSchema: new Map(),
			subtractSchema: new Map(),
		});
		shallowSchemas.set(schemaKey, schema);
	}
	return schema;
}

// get schema that is obtained from schema1 by adding or subtracting schema2
function getSchemaDelta(schema1, schema2, op = 'PLUS') {
	var result = op === 'PLUS' ? schema1.addSchema.get(schema2) : schema1.subtractSchema.get(schema2);
	if (result) return result;
	if (schema1.isArray !== schema2.isArray) { console.log(schema1, "/", schema2); throw new TypeError(
		`Can not add ${schema2.isArray ? "array" : "dictionary"} indexes to ${schema1.isArray ? "array" : "dictionary"} composite ValueType`); }
	var indexes = new Set(schema1.members);
	if (op === 'PLUS') {
		for (var deltaIdx of schema2.members) {
			indexes.add(deltaIdx);
		}
	} else {
		for (var deltaIdx of schema2.members) {
			indexes.delete(deltaIdx);
		}
	}
	result = getSchemaByMembers(schema1.isArray, [...indexes]);
	(op === 'PLUS' ? schema1.addSchema : schema1.subtractSchema).set(schema2, result);
	return result;
}

function getShallowSchemaForParsedNode(parsedNode, deleteIdx = false) {
	var isArray = parsedNode.type === "ARRAY_SCHEMA" || parsedNode.type === "SET_ARRAY" || parsedNode.type === "EDIT_ARRAY";
	var idxs = new Array();
	for (var idx of parsedNode.idxs) {
		if (deleteIdx !== (idx.type === 'DELETE_IDX')) continue;
		var idx = idx.idx;
		if ((typeof (idx) === 'number') !== isArray)
			throw new TypeError("Can not use numeric indexes in object schema or string indexes in array schema");
		idxs.push(idx);
	}
	return getSchemaByMembers(isArray, idxs);
}

function IdGenerator(prefix) {
	var idx = 0, recycledIds = new Array();
	return {
		getNextId() { return recycledIds.pop() || (prefix + (idx++)); },
		recycleId(id) { recycledIds.push(id); }
	};
}

function createCode(codeArr) {
	var code = codeArr.join("\n");
	return eval(code);
}

// schema: { matches(val), from(obj) } (prototype expecting boundArgs member)
const schemasByStringObj = new Map(); // by template strings as object
const schemasByStringKey = new Map(); // by canonic strings key

function compileSchemaLiteral(strings) {
	var parsedStrings = parseStrings(strings),
		[parsedSchema, cursorAt] = tryParseSchema(parsedStrings, 0) || [null, 0];
	assertParseOk(parsedSchema, parsedStrings, cursorAt);

	var schemaProto = schemasByStringObj.get(strings);
	if (schemaProto) return schemaProto;
	var stringsKey = parsedStringsToKey(parsedStrings);
	schemaProto = schemasByStringKey.get(stringsKey);
	if (schemaProto) {
		// found by strings key - it is a schema from different literal, but is equivalent, so we can use it
		schemasByStringObj.set(strings, schemaProto);
		return schemaProto;
	}

	// not found a cached schema - compile one:
	var codeSchemaFits = new Array(),
		codeSchemaSSchemas = new Array(),
		codeSchemaValueFrom = new Array(),
		idsBySSchema = new Map();
	// compile fits(value) method
	codeSchemaFits.push("function fits(value) {");
	var compileFitsIdGen = new IdGenerator("v");
	function compileSchemaFits(schema, id) {
		codeSchemaFits.push(`if (!${id}) return false;`);
		if (!schema) return;
		if (schema.type === 'EXT_SCHEMA') {
			codeSchemaFits.push(`if (!this.boundArgs[${schema.placeholder}].fits(${id})) return false;`);
			return;
		}
		var subId = compileFitsIdGen.getNextId();
		for (var schIdx of schema.idxs) {
			codeSchemaFits.push(`var ${subId} = ${id}[${JSON.stringify(schIdx.idx)}];`);
			compileSchemaFits(schIdx.schema, subId);
		}
		compileFitsIdGen.recycleId(subId);
	}
	compileSchemaFits(parsedSchema, "value");
	codeSchemaFits.push("return true;", "}");

	var sschemaIdGen = new IdGenerator("s");
	function getVarIdBySSchema(shallowSchema) {
		var varId = idsBySSchema.get(shallowSchema);
		if (varId) return varId;
		varId = sschemaIdGen.getNextId();
		codeSchemaSSchemas.push(`const ${varId} = shallowSchemas.get(${JSON.stringify(shallowSchema.schemaKey)});`);
		idsBySSchema.set(shallowSchema, varId);
		return varId;
	}

	codeSchemaValueFrom.push("function valueFrom(value) {");
	function compileSchemaValueFrom(schemaNode, id, srcId) {
		if (schemaNode.type === 'EXT_SCHEMA') {
			codeSchemaValueFrom.push(`var ${id} = this.boundArgs[${schemaNode.placeholder}].valueFrom(${srcId});`);
			return;
		}

		var sschema = getShallowSchemaForParsedNode(schemaNode);
		codeSchemaValueFrom.push(`var ${id} = ${sschema.isArray ? "new Array()" : "{ __proto__: ValueTypeObjectProto }"};`);
		codeSchemaValueFrom.push(`${id}[SCHEMA] = ${getVarIdBySSchema(sschema)};`);
		for (var schIdx of schemaNode.idxs) {
			if (!schIdx.schema) codeSchemaValueFrom.push(`${id}[${JSON.stringify(schIdx.idx)}] = ${srcId}[${JSON.stringify(schIdx.idx)}];`);
			else {
				var subValueId = compileFitsIdGen.getNextId(), subValueSrcId = compileFitsIdGen.getNextId();
				codeSchemaValueFrom.push(`var ${subValueSrcId} = ${srcId}[${JSON.stringify(schIdx.idx)}];`);
				compileSchemaValueFrom(schIdx.schema, subValueId, subValueSrcId);
				codeSchemaValueFrom.push(`${id}[${JSON.stringify(schIdx.idx)}] = ${subValueId};`);
				compileFitsIdGen.recycleId(subValueId);
				compileFitsIdGen.recycleId(subValueSrcId);
			}
		}
		codeSchemaValueFrom.push(`Object.freeze(${id});`);
	}
	compileSchemaValueFrom(parsedSchema, "result", "value");
	codeSchemaValueFrom.push("return result;", "}");

	var [methodFits, methodValueFrom] = createCode([...codeSchemaFits, ...codeSchemaSSchemas, ...codeSchemaValueFrom, "[fits, valueFrom];"]);

	schemaProto = {
		fits: methodFits,
		valueFrom: methodValueFrom,
		boundArgs: [] // to override in actual schema
	};
	schemasByStringObj.set(strings, schemaProto);
	schemasByStringKey.set(stringsKey, schemaProto);
	return schemaProto;
}

var cvalsByStringObj = new Map(),
	cvalsByStringKey = new Map();

function compileNewOrEditLiteral(strings) {
	var parsedStrings = parseStrings(strings),
		isEdit = true,
		[parsedLit, cursorAt] =
			tryParseEditArrayOrObject(parsedStrings, 0, "[", "]", "EDIT_ARRAY") ||
			tryParseEditArrayOrObject(parsedStrings, 0, "{", "}", "EDIT_OBJECT") ||
			(isEdit = false, tryParseSet(parsedStrings, 0)) ||
			[null, 0];
	if (!parsedLit) throw new SyntaxError("Expected an object construction or modification schema");

	var cvalProto = cvalsByStringObj.get(strings);
	if (cvalProto) return cvalProto;
	var stringsKey = parsedStringsToKey(parsedStrings);
	cvalProto = cvalsByStringKey.get(stringsKey);
	if (cvalProto) {
		// found by strings key - it is a constructor from different literal, but is equivalent, so we can use it
		cvalsByStringKey.set(strings, cvalProto);
		return cvalProto;
	}

	var codeSSchemas = new Array(),
		idsBySSchema = new Map(),
		codeMain = new Array();

	var sschemaIdGen = new IdGenerator("s"),
		codeMainIdGen = new IdGenerator("v");
	function getVarIdBySSchema(shallowSchema) {
		var varId = idsBySSchema.get(shallowSchema);
		if (varId) return varId;
		varId = sschemaIdGen.getNextId();
		codeSSchemas.push(`const ${varId} = shallowSchemas.get(${JSON.stringify(shallowSchema.schemaKey)});`);
		idsBySSchema.set(shallowSchema, varId);
		return varId;
	}

	function compileSetArraySeq(node, targetId) {
		var members = new Array();
		for (var i = 0; i < node.idxs.length; i++) members.push(i);
		var sschemaId = getVarIdBySSchema(getSchemaByMembers(true, members));
		codeMain.push(`var ${targetId} = new Array();`);
		codeMain.push(`${targetId}[SCHEMA] = ${sschemaId};`);
		var i = 0;
		for (var idx of node.idxs) {
			if (!idx.type) {
				// it is a direct placeholder
				codeMain.push(`${targetId}[${i++}] = this.boundArgs[${idx.placeholder}];`);
			} else {
				var subValueId = codeMainIdGen.getNextId();
				compileSetValue(idx, subValueId); // compileSetValue declared below
				codeMain.push(`${targetId}[${i++}] = ${subValueId};`);
				codeMainIdGen.recycleId(subValueId);
			}
		}
		codeMain.push(`Object.freeze(${targetId});`);
	}

	function compileSetFromSchemaMain(node, targetId, srcId) {
		if (node.type === 'EXT_SCHEMA') {
			// Syntax like `@{id1, id2: @${schema} ${sourceValueForId2}, ...} ${sourceValueForId1AndTheRest}` is tecnhically possible,
			// but I decided to disable it because it is works quite anti-intuitively, and its canonical form is `id {id1 id2 @${schema} ...}` which
			// can also be written as `{id1,id2,@${schema},...}`, which is totally confusing.
			// Therefore, in New expression, a schema-based member initialization must have the schema either fully external: `id @${schema} ${value}`
			// or fully inline: `id { id1 id2 } ${value}`.
			throw new SyntaxError("Partially external schema is disallowed in New syntax");
			//codeMain.push(`var ${targetId} = this.boundArgs[${node.placeholder}].valueFrom(${srcId});`);
			//return;
		}

		var sschema = getShallowSchemaForParsedNode(node), idxsUsed = new Set();
		codeMain.push(`var ${targetId} = ${sschema.isArray ? "new Array()" : "{ __proto__: ValueTypeObjectProto }"};`);
		codeMain.push(`${targetId}[SCHEMA] = ${getVarIdBySSchema(sschema)};`);
		for (var schIdx of node.idxs) {
			if (!schIdx.schema) codeMain.push(`${targetId}[${JSON.stringify(schIdx.idx)}] = ${srcId}[${JSON.stringify(schIdx.idx)}];`);
			else {
				if (idxsUsed.has(schIdx.idx)) throw new SyntaxError(`Duplicate set key '${schIdx.idx}'`);
				idxsUsed.add(schIdx.idx);

				var subValueId = codeMainIdGen.getNextId(), subValueSrcId = codeMainIdGen.getNextId();
				codeMain.push(`var ${subValueSrcId} = ${srcId}[${JSON.stringify(schIdx.idx)}];`);
				compileSetFromSchemaMain(schIdx.schema, subValueId, subValueSrcId);
				codeMain.push(`${targetId}[${JSON.stringify(schIdx.idx)}] = ${subValueId};`);
				codeMainIdGen.recycleId(subValueId);
				codeMainIdGen.recycleId(subValueSrcId);
			}
		}
		codeMain.push(`Object.freeze(${targetId});`);
	}

	function compileSetFromSchema(node, targetId) {		
		if (!node.schema.type) {
			// it is a direct schema + placeholer
			codeMain.push(`var ${targetId} = this.boundArgs[${node.schema.placeholder}].valueFrom(this.boundArgs[${node.placeholder}]);`);
		} else {
			var placeholderValueId = codeMainIdGen.getNextId();
			codeMain.push(`var ${placeholderValueId} = this.boundArgs[${node.placeholder}];`);
			compileSetFromSchemaMain(node.schema, targetId, placeholderValueId);
			codeMainIdGen.recycleId(placeholderValueId);
		}
	}

	function assertNoIntersect(items1, items2, message) {
		var set1 = new Set(items1);
		for (var item2 of items2) if (set1.has(item2)) throw new SyntaxError(message);
	}

	function compileEditObjectOrArray(node, targetId, srcId) {
		var plusSSchema = getShallowSchemaForParsedNode(node),
			minusSSchema = getShallowSchemaForParsedNode(node, true),
			schemaVar = codeMainIdGen.getNextId(),
			idxsUsed = new Set();
		assertNoIntersect(plusSSchema.members, minusSSchema.members, "Can not modify/add and delete same keys");
		codeMain.push(`var ${schemaVar} = ${srcId}[SCHEMA];`);
		codeMain.push(`${targetId === srcId ? "" : "var "}${targetId} = ${schemaVar}.mutableClone(${srcId});`);
		if (minusSSchema.members.length > 0) {
			var minusSSchemaId = getVarIdBySSchema(minusSSchema);
			codeMain.push(`${schemaVar} = getSchemaDelta(${schemaVar}, ${minusSSchemaId}, 'MINUS');`);
			for (var member of minusSSchema.members) {
				codeMain.push(`delete ${targetId}[${JSON.stringify(member)}];`);
			}
		}
		if (plusSSchema.members.length > 0) {
			var plusSSchemaId = getVarIdBySSchema(plusSSchema);
			codeMain.push(`${schemaVar} = getSchemaDelta(${schemaVar}, ${plusSSchemaId}, 'PLUS');`);
			var modifiedVarId = codeMainIdGen.getNextId();
			for (var editNode of node.idxs) {
				if (idxsUsed.has(editNode.idx)) throw new SyntaxError(`Duplicate set/edit/delete key '${editNode.idx}'`);
				idxsUsed.add(editNode.idx);

				if (editNode.type === 'DELETE_IDX') continue; // already processed that
				if (editNode.type === 'SET_IDX') {
					compileSetValue(editNode.setValue, modifiedVarId); // compileSetValue declared below
					codeMain.push(`${targetId}[${JSON.stringify(editNode.idx)}] = ${modifiedVarId};`);
					continue;
				}
				// EDIT_IDX
				codeMain.push(`var ${modifiedVarId} = ${targetId}[${JSON.stringify(editNode.idx)}];`);
				compileEditObjectOrArray(editNode.editValue, modifiedVarId, modifiedVarId);
				codeMain.push(`${targetId}[${JSON.stringify(editNode.idx)}] = ${modifiedVarId};`);
			}
			codeMainIdGen.recycleId(modifiedVarId);
		}
		codeMain.push(`${targetId}[SCHEMA] = ${schemaVar};`);
		codeMainIdGen.recycleId(schemaVar);
		codeMain.push(`Object.freeze(${targetId});`);
	}

	function compileSetValue(node, targetId) {
		switch (node.type) {
		case 'SET_ARRAY_SEQ':
			compileSetArraySeq(node, targetId);
			break;
		case 'SET_SCHEMA':
			compileSetFromSchema(node, targetId);
			break;
		case 'SET_OBJECT':
		case 'SET_ARRAY':
			{
				codeMain.push(`var ${targetId} = ${node.type === 'SET_OBJECT' ? "{ __proto__: ValueTypeObjectProto }" : "new Array()"};`);
				var sschema = getShallowSchemaForParsedNode(node),
					sschemaVarId = getVarIdBySSchema(sschema);
				codeMain.push(`${targetId}[SCHEMA] = ${sschemaVarId};`);
				var newVarId = codeMainIdGen.getNextId(), idxsUsed = new Set();
				for (var idx of node.idxs) {
					if (idxsUsed.has(idx.idx)) throw new SyntaxError(`Duplicate set key '${idx.idx}'`);
					idxsUsed.add(idx.idx);

					compileSetValue(idx.setValue, newVarId);
					codeMain.push(`${targetId}[${JSON.stringify(idx.idx)}] = ${newVarId};`);
				}
				codeMainIdGen.recycleId(newVarId);
				codeMain.push(`Object.freeze(${targetId});`);
			}
			break;
		default:
			// it is a direct placeholder
			codeMain.push(`var ${targetId} = this.boundArgs[${node.placeholder}];`);
			break;
		}
	}

	codeMain.push(`function constructValue(${parsedLit.type === 'EDIT_OBJECT' || parsedLit.type === 'EDIT_ARRAY' ? "boundVal" : ""}) {`);
	switch (parsedLit.type) {
	case 'SET_OBJECT':
	case 'SET_ARRAY':
	case 'SET_SCHEMA':
	case 'SET_ARRAY_SEQ':
		compileSetValue(parsedLit, "value");
		break;
	case 'EDIT_OBJECT':
	case 'EDIT_ARRAY':
		compileEditObjectOrArray(parsedLit, "value", "boundVal");
		break;
	}
	codeMain.push("return value;", "}");

	var methodConstructValue = createCode([...codeSSchemas, ...codeMain, "constructValue;"]);

	cvalProto = {
		constructValue: methodConstructValue,
		boundArgs: [], // to override in actual constructor
		isEdit
	};
	cvalsByStringObj.set(strings, cvalProto);
	cvalsByStringKey.set(stringsKey, cvalProto);
	return cvalProto;
}

// MapVTK

const EMPTY_ARRAY = [], MAP_STATE = Symbol("MAP_STATE");
function MapVTK(enumerable = EMPTY_ARRAY) {
	if (!new.target) return new MapVTK(enumerable);

	const rootMapNode = { __proto__: null, byValue: new Map(), bySchema: new Map() },
		entries = new Set();

	return {
		__proto__: MapVTK.prototype,
		[MAP_STATE]: {
			getEntry(key) { return lookupMap(rootMapNode, key); },
			getOrCreateEntry(key) {
				var result = lookupMapWithCreate(rootMapNode, key, true);
				if (result.value === NEW_ENTRY) {
					entries.add(result);
				}
				return result;
			},
			deleteEntry(key) {
				var result = lookupMapWithDelete(rootMapNode, key, null, true);
				if (result) entries.delete(result);
				return result;
			},
			entries() { return entries; },
			clear() {
				rootMapNode.byValue.clear();
				rootMapNode.bySchema.clear();
				entries.clear();
			}
		}
	};
}

Object.assign(MapVTK.prototype, {
	[Symbol.toStringTag]() { return "MapVTK"; },
	[Symbol.iterator]() { return this.entries(); },
	get(key) { var result = this[MAP_STATE].getEntry(key); return result ? result.value : (void null); },
	has(key) { return !!this[MAP_STATE].getEntry(key); },
	set(key, value) {
		this[MAP_STATE].getOrCreateEntry(key).value = value;
		return this;
	},
	delete(key) {
		var result = this[MAP_STATE].deleteEntry(key);
		return !!result;
	},
	replace(key, value) {
		var entry = this[MAP_STATE].getOrCreateEntry(key),
			prev = entry.value === NEW_ENTRY ? (void null) : entry.value;
		
		entry.value = value;
		return prev;
	},
	remove(key) {
		var result = this[MAP_STATE].deleteEntry(key);
		return result ? result.value : (void null);
	},
	*entries() {
		for (var entry of this[MAP_STATE].entries())
			yield ([entry.key, entry.value]);
	},
	*keys() {
		for (var entry of this[MAP_STATE].entries())
			yield entry.key;
	},
	*values() {
		for (var entry of this[MAP_STATE].entries())
			yield entry.value;
	},
	forEach(callback, thisObj) {
		for (var entry of this[MAP_STATE].entries())
			callback.call(thisObj, entry.value, entry.key, this);
	},
	clear() {
		this[MAP_STATE].clear();
	},
	setAll(iterable) {
		for (var entry of iterable)
			this[MAP_STATE].getOrCreateEntry(entry[0]).value = entry[1];
		return this;
	}
});

Object.defineProperty(MapVTK.prototype, "size", {
	get() { return this[MAP_STATE].entries().size; }
});

function quadsugarTags(QUADSUGAR, tagItems = { Schema: "VT.Schema", From: "VT.From", New: "VT.New" }) {
	return Object.assign(new Object(),
	tagItems.$ ? {
		[tagItems.$]: QUADSUGAR.staticAlgebraTag((ct) => [
			ct.prefixOperator('!').evaluation('ARG', (arg) => !arg),
			[
				ct.leftBinOperator('==').evaluation('LHS_ARG', 'RHS_ARG', valueTypeEquals),
				ct.leftBinOperator('!=').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => !valueTypeEquals(lhs, rhs))
			],
			ct.leftBinOperator('&&').evaluation('LHS_ARG','RHS_ARG_LAZY', (lhs, rhs) => lhs && rhs()),
			ct.leftBinOperator('||').evaluation('LHS_ARG','RHS_ARG_LAZY', (lhs, rhs) => lhs || rhs()),
			ct.placeholderCast('lvalue').placeholderMode('REF_PIN'),
			ct.rightBinOperator('=').lhsArgType('lvalue').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => lhs.value = rhs)			
		])
	} : null,
	tagItems.Schema ? {
		[tagItems.Schema]: QUADSUGAR.staticSimpleTag((ct, strings) => {
			try {
				const proto = compileSchemaLiteral(strings);
				return (tagArgs, phs) => ({ __proto__: proto, boundArgs: phs });
			} catch (e) {
				console.error(e.toString());
				ct.setEvaluationMode('ERROR');
			}
		})
	} : null,
	tagItems.From ? {
		[tagItems.From]: QUADSUGAR.staticSimpleTag((ct, strings) => {
			try {
				const proto = compileNewOrEditLiteral(strings);
				if (!proto.isEdit) throw new TypeError("From(object) expression must use edit schema");
				return (tagArgs, phs) => ({ __proto__: proto, boundArgs: phs }).constructValue(tagArgs[0]);
			} catch (e) {
				console.error(e.toString());
				ct.setEvaluationMode('ERROR');
			}
		})
	} : null,
	tagItems.New ? {
		[tagItems.New]: QUADSUGAR.staticSimpleTag((ct, strings) => {
			try {
				const proto = compileNewOrEditLiteral(strings);
				if (proto.isEdit) throw new TypeError("New expression must use setting schema");
				return (tagArgs, phs) => ({ __proto__: proto, boundArgs: phs }).constructValue();
			} catch (e) {
				console.error(e.toString());
				ct.setEvaluationMode('ERROR');
			}
		})
	} : null);
}

const ValueType = {
	Schema(strings, ...phs) {
		return { __proto__: compileSchemaLiteral(strings), boundArgs: phs };
	},

	From(val) {
		return function (strings, ...phs) {
			const proto = compileNewOrEditLiteral(strings);
			if (!proto.isEdit) throw new TypeError("From(object) expression must use edit schema");
			const ctor = { __proto__: proto, boundArgs: phs };
			return ctor.constructValue(val);
		}
	},

	New(strings, ...phs) {
		const proto = compileNewOrEditLiteral(strings);
		if (proto.isEdit) throw new TypeError("New expression must use setting schema");
		const ctor = { __proto__: proto, boundArgs: phs };
		return ctor.constructValue();
	},

	toMutable(obj) {
		if (typeof(obj) === 'object' && obj && obj[SCHEMA]) {
			return obj[SCHEMA].mutableClone(obj);
		} else return obj;
	},

	equals(o1, o2) { return valueTypeEquals(o1, o2); },
	comparator(o1, o2, differNonValues) { return valueTypeComparator(o1, o2, differNonValues); },
	isValue(o) { return typeof(o) !== 'function' && (typeof(o) !== 'object' || o === null || !!o[SCHEMA]); },
	isValueTypeObject(o) { return typeof(o) === 'object' && o !== null && !!o[SCHEMA]; },

	MapVTK,
	quadsugarTags
};

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = ValueType;
} else if (typeof (exports) !== 'undefined') {
	exports.ValueType = ValueType;
} else {
	globalThis.ValueType = ValueType;
}

})();
