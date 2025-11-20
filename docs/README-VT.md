# ValueType #

ValueType (VT) is a JavaScript library focused on idea of value-type objects that can be compared and used as map keys using value-equality comparison logic.

It comes packaged with Quadsugar, but is technically independent, so can be easily debundled and used on its own.

---


- ValueType[>>](#_Av2HZaig-2)
  - Introduction[>>](#_Av2HZaig-4)
    - What it is and is not[>>](#_Av2L1vez-1)
  - Value-type concepts[>>](#_Av2L1vez-3)
  - Value-type objects creation[>>](#_Av2L1vez-6)
  - Value-type values operations[>>](#_Av2L1vez-9)
  - MapVTK[>>](#_Av2L1vez-12)
  - Quadsugar bonus[>>](#_Av2L1vez-15)
  - Reference[>>](#_Av2L1vez-18)
    - ValueType[>>](#_Av2L7rhB-1)
    - Schema literals grammar[>>](#_Av2X6m5W-1)

---

<a name="_Av2HZaig-2"></a>
# ValueType #

ValueType (VT) is a JavaScript library focused on idea of value-type objects that can be compared and used as map keys using value-equality comparison logic.

It comes packaged with Quadsugar, but is technically independent, so can be easily debundled and used on its own.

<a name="_Av2HZaig-4"></a>
## Introduction ##

One of challenges with standard JavaScript built-in `Map` and `Set` classes is that they only allow primitive values and objects compared by reference as the keys.
Maps keyed by e. g. a tuple or a dictionary-type record is not possible on built-in basis and can only be achieved via various miserable contortions.

There have been various EcmaScript proposals on improving this (e. g.: [Value Types](https://github.com/tschneidereit/typed-objects-explainer/blob/master/valuetypes.md) (do not mistake for our VT),
[Immutable Data Structures](https://github.com/sebmarkbage/ecmascript-immutable-data-structures), [Composites](https://github.com/tc39/proposal-composites)), they are all either declined or still in the process
(as of end of 2025) and suffer from varying degrees of incompleteness.

Based on "let's not wait for nature's favors" consideration, our VT library offers another take on the problem, right away practical and with a slightly different approach than all of the above. It does not
require any extra syntax or polyfills on top of standard ES 2019, and utilises some JIT-alike approach under the hood (some JS code generated on demand, attempting to address performance side of the problem).

VT can be used both in browser environment:
```
...
<script src="[TODO]/valuetype.js"></script>
<!-- but better download it and put nearby, or even paste inline, in order to reduce external depencencies and prevent leftpad-like conditions -->
...
<script>
// here you can already see the outline of the idea
var v = ValueType.New `{ x: ${1}, y: ${2} }`;
var map = new ValueType.MapVTK();
map.set(v, "42");
console.log(map.get(v));
console.log(map.get(ValueType.New `{ x: ${1}, y: ${2} }`));
</script>
```

and in Node.js environment:
```
# install
npm install [TODO]
```

Then, in a CommonJS style module:

```
const ValueType = require('quadsugar/valuetype');

var v = ValueType.New `{ x: ${1}, y: ${2} }`;
...
```

<a name="_Av2L1vez-1"></a>
### What it is and is not ###

VT is designed with the most specific need in mind: ability to have map with composite keys of known-ahead structure and to simplify specification of such keys. That doesn't mean it can't be used creatively
for other purposes, but one should understand the library design goals, the resulting limitations and seeming inconveniences for particular use cases.

Specifically, we would like to warn in advance against sevaral most obvious misuses:

- Using VT for constructing arbitrarily complex immutable data which is then meant to pass around for general purposes.

No, this is totally not what it is tailored for. Usage of VT objects should only be restricted to map keys and passing around as such, and the variety of map key structures should be kept to a reasonable minimum.
Data immutability is not an end in itself, but rather a forced measure for consistency in the intended use case.
If you mean other cases involving immutable data, it is better to resort to more dedicated libraries for them. Or, which is better and more appropriate for JS, reconsider necessity in these cases at all. Data
immutability is a part of __Functionally Anti Programming Cargo Cult (FAPCC)__, which is a bane of modern programming, and of JS programming specifically.

- Using VT objects as source and target for serialization/deserialization of various inputs/outputs.

Trying this, you will probably notice these objects handling are quite inconvenient from this use case perspective. That's because it is, similarly to above, not an intended use case.

<a name="_Av2L1vez-3"></a>
## Value-type concepts ##

A __value-type value__ is either a primitive value (`undefined`, `null`, boolean, string, number, bigint, symbol), or a __value-type object__ (VTO), that is an array or object that meets the following requirements:
- its shallow schema (that is, the set of its own property keys, and whether it is an array) is fixed and frozen during the object's lifetime, preferably known or predictable statically,
- it is qualified as a value-type object.
The values under VTO's keys may in turn be, or may be not, value-type values.

The second point is important: an object created just by `Object.freeze({ key: value })` does not automatically become a VTO. In fact, VTOs can only be created in a few specific ways, which we'll discuss a bit
later.

Value-type values are meant to be compared by __value-type equality__:
- a primitive value or a non-VTO is value-type equal to another value (value-type or not) if they are equal per JS `===` operator (that is, non-VTO objects are value-type equal only to themselves),
- a VTO is equal to another value if:
    - the other value is also a VTO,
    - they have same shallow schema (that is, their sets of own keys are equal as unordered sets),
    - values by each key in their shallow schemas are correspondingly equal per value-type equality.

<a name="_Av2L1vez-6"></a>
## Value-type objects creation ##

The VTOs can be created with several methods that are inherently and intentionelly different from creating "plain" JS objects.

## Construction literals

The basic way of creating VTOs is via tagged string template literals:

```
var xy = ValueType.New `{ x: ${10}, y: ${20} }`; // an { x: 10, y: 20 } VTO
var xy2 = ValueType.New `{ "x": ${10}, "y": ${20} }`; // same as above. The ID keys are actually strings, similarly to JS literal objects.
var arr = ValueType.New `[0: ${"a"}, 1: ${100}]`; // an array VTO with 2 entries
var arr2 = ValueType.New `[0: ${"a"}, 2: ${200}]`; // some indexes in array can be omitted, they will not exist as keys
var arr3 = ValueType.New `[${"a"}, ${100}]`; // for array with continuous span of indexes starting from 0, there is a shortcut
```
(These strings are also called "schemas", more specifically "set schemas", as there are other types of schemas too.)

Actually the `:`s, `,`s (and also `...`s, which we'll encounter a bit later) are ignored (as well as whitespaces and single/multi line JS style comments),
so you could just rewrite the above literals more concisely:
```
ValueType.New `{ x ${10} y ${20} }`;
ValueType.New `{ "x" ${10} "y" ${20} }`;
ValueType.New `[0 ${"a"}, 1 ${100}]`;
ValueType.New `[0 ${"a"} 2 ${200}]`;
ValueType.New `[${"a"} ${100}]`;
```
but for sake of readability it might be better to keep the decoration.

From user and JS perspective, the objects are just plain frozen JS objects:

```
console.log(xy.x, xy.y); // 10 20
console.log(arr[1]); // 100
console.log(Object.keys(arr2)); // ['0', '2']
```

Nevertheless, they are qualified as VTOs. It can be checked by `ValueType.isValueTypeObject` method:
```
console.log(xy); // true
console.log(ValueType.New `{ x: ${10}, y: ${20} }`); // true
console.log({ x: 10, y: 20 }); // false
```

Note that VTO status and immutability does not automatically spread to nested objects:
```
var testVTO = ValueType.New `{ v: ${{ x: 1, y: 2 }} }`;
console.log(ValueType.isValueTypeObject(testVTO)); // true
console.log(ValueType.isValueTypeObject(testVTO.v)); // false
testVTO.v.x = 100; // ok
```

But you can do the following:
```
var testVTO2 = ValueType.New `{ v: ${ValueType.New `{ x: ${1}, y: ${2} }`} }`;
```

However, if you need to deal with VTOs that span more than one nesting level, it is more practical to do this directly in the schema:
```
var testVTO2 = ValueType.New `{ v: { x: ${1}, y: ${2} } }`;
// it is also possible to specify the same using a destructuring subschema:
var testVTO2 = ValueType.New `{ v: @{x,y} ${{x: 1, y: 2}} } }`;
```

Thus, a VTO structure can be quite complex:
```
ValueType.New `{ name: ${"Username"}, date: [${2025} ${11} ${16}], mutableEntity: ${new Object()} }`;
```
But don't abuse this without necessity: remember that VTOs are primarily meant to be used as map keys.

## Modification literals

Another way to create VTOs is by modifying existing VTOs. It is done via edit schemas:
```
var value1 = ValueType.New `{ y: { a: ${20}, b: ${30} }, z: ${40}, w: ${{ id: "non-VTO" }} }`;

var value2 = ValueType.From(value1) `+{ x: [${10}, ${15}], y: +{ b: ${31} }, -z }`;
```
In this example, `value2` is constructed based on `value1` using the following modifications:

- member `x` is added (or replaced if one existed in the original object) with the VTO array `[10, 15]`,
- member `y` is modified according to the nested modification schema,
- member `z`, if any existed in the original, is deleted,
- unreferenced members (namely `w`) remain as they were in the original.

Modification schema can be arbitrarily nested (but not inside set schema/sub-schema, where it just does not make sense). The nested modification schemas works the same as the main one - here,
the `y` is modified in the following way:
- sub-member `b` is added/replaced with the value of `31`,
- sub-member `a` remains as is.

Note that if the modification schema (prefixed with `+`) is applied to a (sub-)member, it is required to exist, to be a VTO, and to be of matching array/non-array type to the modification schema. Thus:
```
ValueType.From(value1) `+{ c: +{ d: ${1} }`; // error: there is no value1.c
ValueType.From(value1) `+{ w: +{ v: ${2} }`; // error: value1.w is a non-VTO
ValueType.From(value1) `+{ y: +[2: ${3}] }`; // error: value1.y is a VTO, but is not an array
ValueType.From(value1) `+{ y: +{ +b: { b1: ${2} } }`; // error: value1.y.b is not an object
```
A mismatch between the original value against the modification schema will result in runtime error thrown.

Since a VTO is immutable, result of the `ValueType.From` literal is always a copy of the

## Destructuring schemas and subschemas

If a VTO has some intricate, repetitive or verbose structure, or has a widely used mutable counterpart with frequent casts from or to, another way of creating them may be practical - by using pre-declared
destructuring schemas.

```
var schVec = ValueType.Schema `{ x, y, z[0, 1] }`; // a VTO that consists of members x, y, and z, where z is an array-type VTO that consists of 2 indexes 0 and 1
```
Then schema can be used to create a VTO from destructuring a JS object:
```
var vecVal = schVec.valueFrom({ x: 1, y: { text: "non-VTO" }, z: [10, 20] });
// same as: ValueType.New `{ x: ${1}, y: ${{ text: "non-VTO" }}, z: [0: 10, 1: 20] }`;
```

A schema must __fit__ the destructured object: all of the referenced members and sub-members must exist.
```
schVec.valueFrom({ x: 1, y: 2 }); // incorrect: destructured object has no z member
```
Compliance failure will result in runtime error thrown.
Schema object has `.fits` method that allows to test in advance whether an object complies with it:
```
schVec.fits({ x: 1, y: 2, z: [3, 4] }); // true
schVec.fits({ x: 1, y: 2 }); // false: no z
schVec.fits({ x: 1, y: 2, z: [3, 4], w: "yes" }); // true: extra members are allowed, they will be ignored on destructuring
```

A schema can be referenced as part of another destructuring schema (an external (sub-)schema):
```
var schVec2 = ValueType.Schema `{ x, y }`;
var schItem = ValueType.Schema `{ id, position: @${schVec2} }`;
var itemValue = schItem.fromValue({ id: "111", position: { x: 1, y: 2 }});
```

It also can be used to specify a member by inline destructuring via the external schema inside a set/edit schema:
```
var position = { x: 1, y: 2 };
var valueWithVec2 = ValueType `{ main: ${100}, position: @${schVec2} ...${position} }`;
```
Actually it is possible to specify the member destructuring (sub-)schema right inline:
```
var valueWithVec2 = ValueType `{ main: ${100}, position: @{x,y} ...${position} }`;
```
But, unlike in declaration via `ValueType.Schema`, inline schemas are not allowed to reference sub-sub-schemas:
```
ValueType `{ item: @{id,@${schVec2}} ...${position} }`; // DISALLOWED
```
An inline schema must be either entirely external, or entirely inline. Also, it is only possible to use a schema for adding/replacing a member, not for editing inside it.

Pre-declared destructuring schemas do not introduce any new types - it is just a convenience tool to reduce duplication of set schema expressions in repetivive casts between
VTO and their non-VTO counterparts. All that matters is the set of members and the structure they make up.
Schemas that expand to the same set of members deliver exactly the same VTO structures, and the same as the same set of members directly listed inline in a set schema.

<a name="_Av2L1vez-9"></a>
## Value-type values operations ##

Value-type values are subject to value-type specific operations.

## Value-type equality check

`ValueType.equals(v1, v2)` returns true if (and false unless) `v1` and `v2` are value-type equal, in the definition of value-type equality as stated in `Value-type concepts`[>>](#_Av2L1vez-3).
In contexts that assume use of value-type values, you should always use value-type equality comparison, as value-type equal objects may or may be not equal by JS identity.

By definition, order of the keys in VTO construction schemas and method of their specificaiton does not matter - only the set of keys and their values:
```
ValueType.equals(ValueType.New `{ x: ${1}, y: ${2} }`, ValueType.New `{ y: ${2}, x: ${1} }`); // true
ValueType.equals(ValueType.New `[${"a"}, ${"b"}]`, ValueType.New `[0: ${"a"}, 1: ${"b"}]`); // true
ValueType.equals((ValueType.Schema `{a, b}`).fromValue({ a: 3, b: 4 }), ValueType.New `{a: ${3}, b: ${4}}`); // true

// and only if they are actually different...
ValueType.equals(ValueType.New `{ x: ${1}, y: ${2} }`, ValueType.New `{ x: ${1}, y: ${3} }`); // false (has a member with a different value)
ValueType.equals(ValueType.New `{ x: ${1}, y: ${2} }`, ValueType.New `{ x: ${1}, y: ${2}, z: ${3} }`); // false (has extra key)
```
Note that, when determining set of keys, a key explicitly set to `undefined` is not the same as an undefined key:
```
ValueType.equals(ValueType.New `{ x: ${undefined}, y: ${1} }`, ValueType.New `{ y: ${1} }`); // false!
```

## Value-type ordering comparison

In case when it is required, for some reason, to sort value-type values, you can use `ValueType.comparator(v1, v2)`. It returns a negative value if `v1` is 'less' than `v2`, a positive value
if `v1` is 'greater' than `v2`, or 0 if they are 'equal'.

The comparator uses a slightly relaxed notion of equality compared to value-type equality: specifically, non-VTO objects are considered equal to each other. If, however, you need a strict total ordering
(at cost of some performance and increased footprint), you can add a third argument with non-false falue: `ValueType.comparator(v1, v2, true)`. This enforces string ordering between _any_ values.

Note that the order introduced by `ValueType.comparator`, with or without 3rd parameter, is intentionally private and only holds within the current JS context - it is does not persist and is not
guaranteed to be consistent between different reloads of same page or Node.js runs. Therefore, you should not rely on assumptions about two values will be in a particular specific order, other than
it will be a valid order within the current JS context.

## Checking if a value is value-type

`ValueType.isValue(v)` method returns true if (or false unless) `v` is a value-type value:
```
ValueType.isValue(ValueType.New `{ x: ${1} }`); // true
ValueType.isValue(null); // true
ValueType.isValue(1); // true
ValueType.isValue("blarg"); // true
ValueType.isValue({ x: 1 }); // false (a non-VTO)
ValueType.isValue(() => 1); // false (functions are non-VTO)
```

In case if you need to check that the value is not just a value-type, but specifically a VTO, use `ValueType.isValueTypeObject(v)`:
```
ValueType.isValueTypeObject(null); // false
ValueType.isValueTypeObject(10); // false
ValueType.isValueTypeObject({ x: 1 }); // false
ValueType.isValueTypeObject(ValueType.New `{ x: ${1} }`); // true
```

## Getting a mutable copy

`ValueType.toMutable(o)` delivers a mutable clone of `o` if it is a VTO, or the `o` itself otherwise. The cloning is shallow, that is, only spans the 1st level of the keys:

```
var srcObj = ValueType.New `{ x: ${1}, y: { a: ${2}, b: ${3} } }`;
var mutObj = ValueType.toMutable(srcObj);
mutObj.x++; // ok
mutObj.y.a++; // FAIL: mutObj.y is still a VTO
// you will need to do this:
mutObj.y = ValueType.toMutable(mutObj.y);
mutObj.y.a++; // now it works
```

There intentionally is no method for deep mutable cloning, as there is no consistent convention on how to proceed through nodes that are non-VTO objects, and in most cases the valid option
is very use-case specific - so it is up to the user to implement the particular method if needed. `ValueType.toMutable(o)` can be used as a building block.

## Value-type keyed map

Built-in JS `Map` and `Set` are not aware of value-type values and won't handle them correctly. VT provides a drop-in implementation of `Map` that you should use instead: `MapVTK`[>>](#_Av2L1vez-12)

<a name="_Av2L1vez-12"></a>
## MapVTK ##

`MapVTK` (VTK stands for Value-Type Keys) is counterpart of `Map` that can handle value-type keys. It contains the same methods as standard `Map` (plus several extras), and behaves exactly the same
as standard `Map` when keys are primitive or non-VTO.

For VTO keys, the complexity of `MapVTK` read/write operations is O(x*k), where x is complexity of such operations in standard `Map` (usually O(1)), and k is cardinality of the VTO object (the amount of
end nodes, from top of the structure down to primitive and non-VTO values, plus number of nested VTO objects in the way) used as the key in the operation. For example, for `{ x: ${1}, y: [${2}, ${3}] }` k = 3
(terminal values) + 1 (the top level `{x,y}`) + 1 (`[0,1]` at `y`) = 5, so the operation on this key will be ~O(5). It is a motivation to use simpler and flatter keys.

VT only provides counterpart to the `Map`, but not to the `Set`. The reason being, a set is quite easily implemented on top of map, especially with JS `Set` interface which is nearly identical to `Map`.

<a name="_Av2L1vez-15"></a>
## Quadsugar bonus ##

VT is independent from Quadsugar, but it can provide some bonuses if you use them together.

```
QUADSUGAR
.useStaticTags({
	...ValueType.quadsugarTags(QUADSUGAR, {
		New: "VT.New", // static tag to use as shortcut to ValueType.New
		From: "VT.From", // static tag to use as shortcut to ValueType.From
		Schema: "VT.Schema", // static tag to use as shortcut to ValueType.Schema
		$: "VT." // static tag to use for VT custom algebra expressions
	})
})
.wrap(() => {
	var schXY = "VT.Schema" `{x, y}`;
	var v1 = "VT.New" `{ x: ${1}, y: ${2} }`,
		v2 = schXY.fromValue({ x: 1, y: 2 }),
		v3 = "VT.From"(v2) `+{ x: ${3} }`;
	// QS static tags produce back-end code that is slightly more performant in loops than via standard JS string tags

	// the VT custom algebra features == and != operators for comparison by value-type equality
	if ("VT." `${v1} == ${v2}`) console.log("v1 equals v2");
	// it also provides ! and short-circuited &&, || for better readability in more complicated comparisons
	console.log("VT." `${v1} == ${v3} || !(${v2} == ${v3} && ${v1} != ${v2})`);
	// although it is less performant than using direct JS logical operations, like so:
	console.log("VT." `${v1} == ${v3}` || !("VT." `!(${v2} == ${v3}` && "VT." `${v1} != ${v2})`));

	// also, for the same purpose it supports assignment operation:
	if ("VT." `(${v3} = ${v1}) != ${v2}`) console.log("v3 is set to new value that is not equal to v2");
});
```

Any of `New`, `From`, `Schema`, and `$` can be set to null or false to not expose tags for these particular items in the QS-wrapped code.

<a name="_Av2L1vez-18"></a>
## Reference ##

Reference to the VT API.

<a name="_Av2L7rhB-1"></a>
### ValueType ###

VT's main namespace. In browser, it is always put under `ValueType` global variable name. In Node.js, it is directly the import from `require('quadsugar/valuetype')` which can be assigned
to any symbol, or destructured.

<u>**Members**</u>

<table>
<tr>
<th>

Name

</th><th>

Description

</th>
</tr>
<tr>
<td>

`Schema`[>>](#_Av2L7rhB-3)

</td><td>

String template tag for constructing a standalone destructuring schema. See `Schema literals grammar`[>>](#_Av2X6m5W-1) for more insight into the schema grammar.
`:`, `,` and `...` punctuators are ignored, and only used for readability.


</td>
</tr>
<tr>
<td>

`New`[>>](#_Av2L7rhB-5)

</td><td>

String template tag for creating a new VTO using inline set schema. See `Schema literals grammar`[>>](#_Av2X6m5W-1) for more insight into the schema grammar.
`:`, `,` and `...` punctuators are ignored, and only used for readability.


</td>
</tr>
<tr>
<td>

`From(vto)`[>>](#_Av2L7rhB-7)

</td><td>

String template tag for creating a new VTO based on an existing VTO using inline edit schema. See `Schema literals grammar`[>>](#_Av2X6m5W-1) for more insight into the schema grammar.
`:`, `,` and `...` punctuators are ignored, and only used for readability.


</td>
</tr>
<tr>
<td>

`.equals(v1, v2)`[>>](#_Av2L7rhB-9)

</td><td>

Check two given values for value-type equality. Use instead of standard JS `==` to correctly compare values that may be VTOs.
Non-VTO objects are only value-type equal if they equal in JS `===` sense.

</td>
</tr>
<tr>
<td>

`.comparator(v1, v2 [, differNonVto])`[>>](#_Av2L7rhB-11)

</td><td>

Compare two given values from perspective of their ordeting. The ordering is consistent within same JS session, but not persistent between different JS sessions.
Non-VTO objects are considered order-equal, unless you specify `differNonVto` parameter.

</td>
</tr>
<tr>
<td>

`.isValue(v)`[>>](#_Av2L7rhB-13)

</td><td>

Check if a given value is value-type. Returns true for primitives and VTOs.

</td>
</tr>
<tr>
<td>

`.isValueTypeObject(v)`[>>](#_Av2L7rhB-15)

</td><td>

Check if a given value is a VTO.

</td>
</tr>
<tr>
<td>

`MapVTK`[>>](#_Av2L7rhB-17)

</td><td>

A drop-in replacement to standard JS `Map` that uses value-type equality rules for key comparison. `VTK` means "value-type keys", to specifically indicate the difference from standard `Map`.


</td>
</tr>
<tr>
<td>

`.quadsugarTags(qsNSO [, tagsDict])`[>>](#_Av2L7rhB-47)

</td><td>

Creates dictionary of VT support static tags for Quadsugar's `.useStaticTags`. An example of use:


</td>
</tr>
</table>

<u>**Members (detailed)**</u>

<a name="_Av2L7rhB-3"></a>
#### Schema ####

String template tag for constructing a standalone destructuring schema. See `Schema literals grammar`[>>](#_Av2X6m5W-1) for more insight into the schema grammar.
`:`, `,` and `...` punctuators are ignored, and only used for readability.

<u>**Members**</u>

<table>
<tr>
<th>

Name

</th><th>

Description

</th>
</tr>
<tr>
<td>

`.fromValue(value) [Schema instance]`[>>](#_Av2RjybR-1)

</td><td>

Constructs VTO from the given value destructured per this schema. The value, or any of its deeper level members, does not have to be a VTO, but it must fit the schema (see `.fits(value) [Schema instance]`[>>](#_Av2RjybR-3)),
otherwise runtime error will occur.

</td>
</tr>
<tr>
<td>

`.fits(value) [Schema instance]`[>>](#_Av2RjybR-3)

</td><td>

Checks whether the given value fits the schema, that is, it can be safely and meaningfully destructured via the schema's `.fromValue(value) [Schema instance]`[>>](#_Av2RjybR-1) method.
The schema defines the required set of members, and only these members will go into the resulting VTO after the value destructuring. The value can have extra members that are not mentioned in the schema -
such ones will be ignored on destructuring and are not counted when checking the fitting.

</td>
</tr>
</table>

```
const schXYA = ValueType.Schema `{ x, y, a: [0, 1] }`;
var valXYA = schXYA.fromValue({ x: 1, y: { text: "non-VTO" }, a["blah", null] });

// a schema can reference another ("external") schema for one of its members
const schWithNestedSchema = ValueType.Schema `[0, 1: @${schXYA}]`;
var valNested = schWithNestedSchema.fromValue([100, valXYA]);
```

Result of ``ValueType.Schema `...` `` is schema instance object, whose methods are described below.

<u>**Members (detailed)**</u>

<a name="_Av2RjybR-1"></a>
##### .fromValue(value) [Schema instance] #####

Constructs VTO from the given value destructured per this schema. The value, or any of its deeper level members, does not have to be a VTO, but it must fit the schema (see `.fits(value) [Schema instance]`[>>](#_Av2RjybR-3)),
otherwise runtime error will occur.

<u>**Returns:**</u>

The resulting VTO

<u>**Errors:**</u>

`ReferenceError` (in most cases) if the value provided does not fit the schema. A limited mismatch (absence of member from a terminal schema node in the source value) may
result in no error and setting this member to `undefined` instead, but deeper level mismatches will fail.

<a name="_Av2RjybR-3"></a>
##### .fits(value) [Schema instance] #####

Checks whether the given value fits the schema, that is, it can be safely and meaningfully destructured via the schema's `.fromValue(value) [Schema instance]`[>>](#_Av2RjybR-1) method.
The schema defines the required set of members, and only these members will go into the resulting VTO after the value destructuring. The value can have extra members that are not mentioned in the schema -
such ones will be ignored on destructuring and are not counted when checking the fitting.

<u>**Arguments**</u>

<table>
<tr>
<th>

Name

</th><th>

Description

</th>
</tr>
<tr>
<td>

`value`[>>](#_Av2RmCod-1)

</td><td>

The value to check. It does not have to be an object, but for non-objects the check result is always false.

</td>
</tr>
</table>

<u>**Returns:**</u>

true if the value fits the schema, false otherwise

<u>**Arguments (detailed)**</u>

<a name="_Av2RmCod-1"></a>
###### value ######

The value to check. It does not have to be an object, but for non-objects the check result is always false.

<u>**Methods**</u>

##### .fromValue(value) [Schema instance] [>>](#_Av2RjybR-1) #####

##### .fits(value) [Schema instance] [>>](#_Av2RjybR-3) #####

<a name="_Av2L7rhB-5"></a>
#### New ####

String template tag for creating a new VTO using inline set schema. See `Schema literals grammar`[>>](#_Av2X6m5W-1) for more insight into the schema grammar.
`:`, `,` and `...` punctuators are ignored, and only used for readability.

```
// all of these three yield equal VTOs
var xy = ValueType.New `{ x: ${1}, y: ${2} }`,
	xy2 = ValueType.New `{ y: ${2}, x: ${1} }`,
	xy3 = ValueType.New `@{x,y}: ...${{ x: 1, y: 2 }}`;

// note that empty array and empty object are NOT value-type equal
var emptyObject = ValueType.New `{}`,
	emptyArray = ValueType.New `[]`;
```

Result of ``ValueType.New `...` `` is the constructed VTO (array-type or object-type, depending on the rootmost brackets type). By itself, there objects have no other properties than actual data keys
(and also some standard technical, like `toString` (unless overridden by a data key), or `length` and array stuff for array-type VTO), the operations on them are implemented as static methods in `ValueType`
namespace.

<a name="_Av2L7rhB-7"></a>
#### From(vto) ####

String template tag for creating a new VTO based on an existing VTO using inline edit schema. See `Schema literals grammar`[>>](#_Av2X6m5W-1) for more insight into the schema grammar.
`:`, `,` and `...` punctuators are ignored, and only used for readability.

<u>**Arguments**</u>

<table>
<tr>
<th>

Name

</th><th>

Description

</th>
</tr>
<tr>
<td>

`vto`[>>](#_Av2X6m5W-2)

</td><td>

The source value to base on, must be a VTO

</td>
</tr>
</table>

```
var xy = ValueType.New `{ x: ${1}, y: ${2} }`,
	xy2 = ValueType.From(xy) `+{ y: ${3} }`,
	xy3 = ValueType.New `{ x: ${1}, y: ${3} }`; // equal to xy2

// deleting and adding keys is also possible
var xz = ValueType.From(xy) `+{ -y, z: ${3}}`; // { x: 1, z: 3 }
```

Result of ``ValueType.From(sourceVal) `...` `` is the _new_ VTO constructed from the source VTO by applying the modifications according to edit schema.

<u>**Arguments (detailed)**</u>

<a name="_Av2X6m5W-2"></a>
##### vto #####

The source value to base on, must be a VTO

<a name="_Av2L7rhB-9"></a>
#### .equals(v1, v2) ####

Check two given values for value-type equality. Use instead of standard JS `==` to correctly compare values that may be VTOs.
Non-VTO objects are only value-type equal if they equal in JS `===` sense.

<u>**Arguments**</u>

<table>
<tr>
<th>

Name

</th><th>

Description

</th>
</tr>
<tr>
<td>

`v1`[>>](#_Av2X6m5W-3)

</td><td>

First value to compare

</td>
</tr>
<tr>
<td>

`v2`[>>](#_Av2X6m5W-4)

</td><td>

Second value to compare

</td>
</tr>
</table>

<u>**Returns:**</u>

true if `v1` and `v2` are value-type equal, false otherwise

<u>**Arguments (detailed)**</u>

<a name="_Av2X6m5W-3"></a>
##### v1 #####

First value to compare

<a name="_Av2X6m5W-4"></a>
##### v2 #####

Second value to compare

<a name="_Av2L7rhB-11"></a>
#### .comparator(v1, v2 [, differNonVto]) ####

Compare two given values from perspective of their ordeting. The ordering is consistent within same JS session, but not persistent between different JS sessions.
Non-VTO objects are considered order-equal, unless you specify `differNonVto` parameter.

<u>**Arguments**</u>

<table>
<tr>
<th>

Name

</th><th>

Description

</th>
</tr>
<tr>
<td>

`v1`[>>](#_Av2X6m5W-6)

</td><td>

First value to compare

</td>
</tr>
<tr>
<td>

`v2`[>>](#_Av2X6m5W-7)

</td><td>

Second value to compare

</td>
</tr>
<tr>
<td>

`differNonVto`[>>](#_Av2X6m5W-8)

</td><td>

Bool, optional (default = false). If false, then non-VTO objects are considered 'equal'. If you need strict total ordering, specify this parameter to be `true`, but
keep in mind that such comparison is more expensive and adds some memory overhead.

</td>
</tr>
</table>

<u>**Returns:**</u>

an integer: negative if `v1` is 'less than' `v2`, positive if `v1` is 'greater than' `v2`, zero if `v1` is 'equal' to `v2` (according to `differNonVto` mode)

<u>**Arguments (detailed)**</u>

<a name="_Av2X6m5W-6"></a>
##### v1 #####

First value to compare

<a name="_Av2X6m5W-7"></a>
##### v2 #####

Second value to compare

<a name="_Av2X6m5W-8"></a>
##### differNonVto #####

Bool, optional (default = false). If false, then non-VTO objects are considered 'equal'. If you need strict total ordering, specify this parameter to be `true`, but
keep in mind that such comparison is more expensive and adds some memory overhead.

<a name="_Av2L7rhB-13"></a>
#### .isValue(v) ####

Check if a given value is value-type. Returns true for primitives and VTOs.

<u>**Arguments**</u>

<table>
<tr>
<th>

Name

</th><th>

Description

</th>
</tr>
<tr>
<td>

`v`[>>](#_Av2X6m5W-10)

</td><td>

The value to check

</td>
</tr>
</table>

<u>**Returns:**</u>

true for primitives and VTOs, false for non-VTO objects and functions

<u>**Arguments (detailed)**</u>

<a name="_Av2X6m5W-10"></a>
##### v #####

The value to check

<a name="_Av2L7rhB-15"></a>
#### .isValueTypeObject(v) ####

Check if a given value is a VTO.

<u>**Arguments**</u>

<table>
<tr>
<th>

Name

</th><th>

Description

</th>
</tr>
<tr>
<td>

`v`[>>](#_Av2X6m5W-12)

</td><td>

The value to check

</td>
</tr>
</table>

<u>**Returns:**</u>

true if `v` is a non-null and is a VTO, false otherwise

<u>**Arguments (detailed)**</u>

<a name="_Av2X6m5W-12"></a>
##### v #####

The value to check

<a name="_Av2L7rhB-17"></a>
#### MapVTK ####

A drop-in replacement to standard JS `Map` that uses value-type equality rules for key comparison. `VTK` means "value-type keys", to specifically indicate the difference from standard `Map`.

<u>**Members**</u>

<table>
<tr>
<th>

Name

</th><th>

Description

</th>
</tr>
<tr>
<td>

`MapVTK([iterable])`[>>](#_Av2L7rhB-19)

</td><td>

Construct an instance of `MapVTK`. Can be used with `new` or as a plain function.


</td>
</tr>
<tr>
<td>

`.get(key)`[>>](#_Av2L7rhB-21)

</td><td>

Get value from the map associated with the given key.

</td>
</tr>
<tr>
<td>

`.set(key, value)`[>>](#_Av2L7rhB-23)

</td><td>

Set (or replace existing) value in the map to associate with the given key.

</td>
</tr>
<tr>
<td>

`.replace(key, value)`[>>](#_Av2L7rhB-25)

</td><td>

Set (or replace existing) value in the map to associate with the given key. Unlike `.set(key, value)`[>>](#_Av2L7rhB-23), it returns previously associated value rather than the map instance,
so you can use it for an 'exchange value' operation.

</td>
</tr>
<tr>
<td>

`.delete(key)`[>>](#_Av2L7rhB-27)

</td><td>

Delete a value in the map associated with the given key, if any exists.

</td>
</tr>
<tr>
<td>

`.remove(key)`[>>](#_Av2L7rhB-29)

</td><td>

Delete a value in the map associated with the given key, if any exists. Unlike `.delete(key)`[>>](#_Av2L7rhB-27), it returns the removed value rather than the map instance,
so you can use it for a 'pop' operation.

</td>
</tr>
<tr>
<td>

`.clear()`[>>](#_Av2L7rhB-31)

</td><td>

Clear all entries from the map.

</td>
</tr>
<tr>
<td>

`.setAll([keyValuePairsIterable])`[>>](#_Av2L7rhB-33)

</td><td>

Add all elements into the map from the given iterable, treating its elements as key-value pairs. Existing elements with same keys will be replaced.


</td>
</tr>
<tr>
<td>

`.forEach(callable [, thisObj])`[>>](#_Av2L7rhB-35)

</td><td>

Invoke the given function for every existing entry, in the enumeration order.


</td>
</tr>
<tr>
<td>

`.size`[>>](#_Av2L7rhB-37)

</td><td>

Number (integer). The number of entries currently in the map.

</td>
</tr>
<tr>
<td>

`.keys()`[>>](#_Av2L7rhB-39)

</td><td>

Returns iterator over the keys in the map. The iteration is in chronological order of the keys insertion (newer keys go later, replacement of an existing key does not change its order).

</td>
</tr>
<tr>
<td>

`.values()`[>>](#_Av2L7rhB-41)

</td><td>

Returns iterator over the values in the map. The iteration is in chronological order of the keys insertion (values for newer keys go later, replacement of an existing key does not change its order).

</td>
</tr>
<tr>
<td>

`[Symbol.iterator]`[>>](#_Av2L7rhB-43)

</td><td>

Returns iterator over the entries in the map, same as `.entries()`[>>](#_Av2X6m5W-32). To be used via `for..of` statement or by any other use of the `MapVTK` instance as an iterable.

</td>
</tr>
<tr>
<td>

`[Symbol.toStringTag]`[>>](#_Av2L7rhB-45)

</td><td>

Returns `"MapVTK"`.

</td>
</tr>
<tr>
<td>

`.entries()`[>>](#_Av2X6m5W-32)

</td><td>

Returns iterator over the entries in the map. The iteration is in chronological order of the keys insertion (values for newer keys go later, replacement of an existing key does not change its order).
Entries are yielded as `[key, value]` arrays.

</td>
</tr>
</table>

`MapVTK` interface is the same as of standard `Map` (as per ES 2019), with some extra methods.

<u>**Members (detailed)**</u>

<a name="_Av2L7rhB-19"></a>
##### MapVTK([iterable]) #####

Construct an instance of `MapVTK`. Can be used with `new` or as a plain function.

```
var map = new ValueType.MapVTK();
var map2 = ValueType.MapVTK();

console.log(map instanceof ValueType.MapVTK); // true
console.log(map2 instanceof ValueType.MapVTK); // true

map.set(1, "one");
map.set(ValueType.New `{ x: ${1}, y: ${2} }`, "x-one-y-two");
console.log(map.get(1));
console.log(map.get(ValueType.New `{ y: ${2}, x: ${1} }`));
```

#arg ./iterable %arg: An iterable of two-element arrays, optional. Each element is intrpreted as `[key, value]`. The collection to populate the new map with.
May, in particular, be an instance of `Map` or `MapVTK`.

<a name="_Av2L7rhB-21"></a>
##### .get(key) #####

Get value from the map associated with the given key.

<u>**Arguments**</u>

<table>
<tr>
<th>

Name

</th><th>

Description

</th>
</tr>
<tr>
<td>

`key`[>>](#_Av2X6m5W-14)

</td><td>

The key to search, using value-type equality

</td>
</tr>
</table>

<u>**Returns:**</u>

The value associated with the key, `undefined` if no equal key exists in the map

<u>**Arguments (detailed)**</u>

<a name="_Av2X6m5W-14"></a>
###### key ######

The key to search, using value-type equality

<a name="_Av2L7rhB-23"></a>
##### .set(key, value) #####

Set (or replace existing) value in the map to associate with the given key.

<u>**Arguments**</u>

<table>
<tr>
<th>

Name

</th><th>

Description

</th>
</tr>
<tr>
<td>

`key`[>>](#_Av2X6m5W-16)

</td><td>

The key to set or replace, using value-type equality

</td>
</tr>
<tr>
<td>

`value`[>>](#_Av2X6m5W-17)

</td><td>

The value to associate with the key

</td>
</tr>
</table>

<u>**Returns:**</u>

The current instance of `MapVTK` itself

<u>**Arguments (detailed)**</u>

<a name="_Av2X6m5W-16"></a>
###### key ######

The key to set or replace, using value-type equality

<a name="_Av2X6m5W-17"></a>
###### value ######

The value to associate with the key

<a name="_Av2L7rhB-25"></a>
##### .replace(key, value) #####

Set (or replace existing) value in the map to associate with the given key. Unlike `.set(key, value)`[>>](#_Av2L7rhB-23), it returns previously associated value rather than the map instance,
so you can use it for an 'exchange value' operation.

<u>**Arguments**</u>

<table>
<tr>
<th>

Name

</th><th>

Description

</th>
</tr>
<tr>
<td>

`key`[>>](#_Av2X6m5W-19)

</td><td>

The key to set or replace, using value-type equality

</td>
</tr>
<tr>
<td>

`value`[>>](#_Av2X6m5W-20)

</td><td>

The value to associate with the key

</td>
</tr>
</table>

<u>**Returns:**</u>

The previously associated value, `undefined` if there was none

<u>**Arguments (detailed)**</u>

<a name="_Av2X6m5W-19"></a>
###### key ######

The key to set or replace, using value-type equality

<a name="_Av2X6m5W-20"></a>
###### value ######

The value to associate with the key

<a name="_Av2L7rhB-27"></a>
##### .delete(key) #####

Delete a value in the map associated with the given key, if any exists.

<u>**Arguments**</u>

<table>
<tr>
<th>

Name

</th><th>

Description

</th>
</tr>
<tr>
<td>

`key`[>>](#_Av2X6m5W-22)

</td><td>

The key to search, using value-type equality

</td>
</tr>
</table>

<u>**Returns:**</u>

true if the key existed and was actually deleted, false otherwise

<u>**Arguments (detailed)**</u>

<a name="_Av2X6m5W-22"></a>
###### key ######

The key to search, using value-type equality

<a name="_Av2L7rhB-29"></a>
##### .remove(key) #####

Delete a value in the map associated with the given key, if any exists. Unlike `.delete(key)`[>>](#_Av2L7rhB-27), it returns the removed value rather than the map instance,
so you can use it for a 'pop' operation.

<u>**Arguments**</u>

<table>
<tr>
<th>

Name

</th><th>

Description

</th>
</tr>
<tr>
<td>

`key`[>>](#_Av2X6m5W-24)

</td><td>

The key to search, using value-type equality

</td>
</tr>
</table>

<u>**Returns:**</u>

The removed value if one existed in the map, `undefined` otherwise

<u>**Arguments (detailed)**</u>

<a name="_Av2X6m5W-24"></a>
###### key ######

The key to search, using value-type equality

<a name="_Av2L7rhB-31"></a>
##### .clear() #####

Clear all entries from the map.

<a name="_Av2L7rhB-33"></a>
##### .setAll([keyValuePairsIterable]) #####

Add all elements into the map from the given iterable, treating its elements as key-value pairs. Existing elements with same keys will be replaced.

<u>**Arguments**</u>

<table>
<tr>
<th>

Name

</th><th>

Description

</th>
</tr>
<tr>
<td>

`keyValuePairsIterable`[>>](#_Av2X6m5W-26)

</td><td>

An iterable of 2-element arrays, which are treated as `[key, value]` pairs.

</td>
</tr>
</table>

<u>**Returns:**</u>

The current instance of `MapVTK` itself

This is similar to what constructor of `MapVTK` with non-blank argument does, but allows to add (or replace) elements to already existing map at any later time.

<u>**Arguments (detailed)**</u>

<a name="_Av2X6m5W-26"></a>
###### keyValuePairsIterable ######

An iterable of 2-element arrays, which are treated as `[key, value]` pairs.

<a name="_Av2L7rhB-35"></a>
##### .forEach(callable [, thisObj]) #####

Invoke the given function for every existing entry, in the enumeration order.

<u>**Arguments**</u>

<table>
<tr>
<th>

Name

</th><th>

Description

</th>
</tr>
<tr>
<td>

`callable`[>>](#_Av2X6m5W-28)

</td><td>

A function. It is supposed to take the arguments in the order: `(value, key, thisInstanceOfMapVTK)`. If `thisObj` is supplied, it is invoked as a method of `thisObj`.

</td>
</tr>
<tr>
<td>

`thisObj`[>>](#_Av2X6m5W-29)

</td><td>

An object, optional. The object to bind `callable` to.

</td>
</tr>
</table>

__Note__: `forEach` method is only present to be compliant with standard `Map` interface, but its use is strongly deprecated. Existence of this item has absolutely no rationale other than pure FAPCC.
`for...of` statement is around in JS for a very long time, and there is not a single sound reason to not using it instead of `forEach`.

<u>**Arguments (detailed)**</u>

<a name="_Av2X6m5W-28"></a>
###### callable ######

A function. It is supposed to take the arguments in the order: `(value, key, thisInstanceOfMapVTK)`. If `thisObj` is supplied, it is invoked as a method of `thisObj`.

<a name="_Av2X6m5W-29"></a>
###### thisObj ######

An object, optional. The object to bind `callable` to.

<a name="_Av2L7rhB-37"></a>
##### .size #####

Number (integer). The number of entries currently in the map.

<a name="_Av2L7rhB-39"></a>
##### .keys() #####

Returns iterator over the keys in the map. The iteration is in chronological order of the keys insertion (newer keys go later, replacement of an existing key does not change its order).

<u>**Returns:**</u>

Iterator. Each value returned by it is a key in the map.

<a name="_Av2L7rhB-41"></a>
##### .values() #####

Returns iterator over the values in the map. The iteration is in chronological order of the keys insertion (values for newer keys go later, replacement of an existing key does not change its order).

<u>**Returns:**</u>

Iterator. Each value returned by it is a value in the map.

<a name="_Av2L7rhB-43"></a>
##### [Symbol.iterator] #####

Returns iterator over the entries in the map, same as `.entries()`[>>](#_Av2X6m5W-32). To be used via `for..of` statement or by any other use of the `MapVTK` instance as an iterable.

<u>**Returns:**</u>

Iterator. Each value returned by it is a `[key, value]` array, containing a key-value pair from the map.

<a name="_Av2L7rhB-45"></a>
##### [Symbol.toStringTag] #####

Returns `"MapVTK"`.

<u>**Returns:**</u>

"MapVTK" string

<a name="_Av2X6m5W-32"></a>
##### .entries() #####

Returns iterator over the entries in the map. The iteration is in chronological order of the keys insertion (values for newer keys go later, replacement of an existing key does not change its order).
Entries are yielded as `[key, value]` arrays.

<u>**Returns:**</u>

Iterator. Each value returned by it is a `[key, value]` array, containing a key-value pair from the map.

<u>**Properties**</u>

##### .size [>>](#_Av2L7rhB-37) #####

##### [Symbol.iterator] [>>](#_Av2L7rhB-43) #####

##### [Symbol.toStringTag] [>>](#_Av2L7rhB-45) #####

<u>**Methods**</u>

##### MapVTK([iterable]) [>>](#_Av2L7rhB-19) #####

##### .get(key) [>>](#_Av2L7rhB-21) #####

##### .set(key, value) [>>](#_Av2L7rhB-23) #####

##### .replace(key, value) [>>](#_Av2L7rhB-25) #####

##### .delete(key) [>>](#_Av2L7rhB-27) #####

##### .remove(key) [>>](#_Av2L7rhB-29) #####

##### .clear() [>>](#_Av2L7rhB-31) #####

##### .setAll([keyValuePairsIterable]) [>>](#_Av2L7rhB-33) #####

##### .forEach(callable [, thisObj]) [>>](#_Av2L7rhB-35) #####

##### .keys() [>>](#_Av2L7rhB-39) #####

##### .values() [>>](#_Av2L7rhB-41) #####

##### .entries() [>>](#_Av2X6m5W-32) #####

<a name="_Av2L7rhB-47"></a>
#### .quadsugarTags(qsNSO [, tagsDict]) ####

Creates dictionary of VT support static tags for Quadsugar's `.useStaticTags`. An example of use:

<u>**Arguments**</u>

<table>
<tr>
<th>

Name

</th><th>

Description

</th>
</tr>
<tr>
<td>

`qsNSO`[>>](#_Av2X6m5W-37)

</td><td>

The Quadsugar namespace value (should be `QUADSUGAR` in a browser environment).

</td>
</tr>
<tr>
<td>

`tagsDict`[>>](#_Av2X6m5W-38)

</td><td>

Dictionary of tags to use in the QS wrapped code for various VT features. Keys are feature identifiers (mostly match the tag function names from `ValueType` namespace), the values are
the tag names to assign to. Omitting a key will set the associated tag to default name, setting it to a null/false value will disable tag for this feature. The `tagsDict` argument can be omitted altogether,
which is the same as letting all tags be assigned as by default.

</td>
</tr>
</table>

```
QUADSUGAR.useStaticTags({
	...ValueType.quadsugarTags(QUADSUGAR, {
		New: "VT.New",
		$: "VT."
	})
})
.wrap(() => {
	console.log("VT.New" `{ x: ${1}, y: ${2} }`);
	console.log("VT." `${"VT.New" `[${100}, ${500}]`} == ${"VT.New" `[0: ${100}, 1: ${500}]`}`);
});
```

<u>**Arguments (detailed)**</u>

<a name="_Av2X6m5W-37"></a>
##### qsNSO #####

The Quadsugar namespace value (should be `QUADSUGAR` in a browser environment).

<a name="_Av2X6m5W-38"></a>
##### tagsDict #####

Dictionary of tags to use in the QS wrapped code for various VT features. Keys are feature identifiers (mostly match the tag function names from `ValueType` namespace), the values are
the tag names to assign to. Omitting a key will set the associated tag to default name, setting it to a null/false value will disable tag for this feature. The `tagsDict` argument can be omitted altogether,
which is the same as letting all tags be assigned as by default.

<u>**Properties**</u>

<a name="_Av2X6m5W-39"></a>
###### Schema ######

Name for QS static tag that mirrors `ValueType.Schema` (and has same usage syntax). Default is `VT.Schema`.

<a name="_Av2X6m5W-40"></a>
###### New ######

Name for QS static tag that mirrors `ValueType.New` (and has same usage syntax). Default is `VT.New`.

<a name="_Av2X6m5W-41"></a>
###### From ######

Name for QS static tag that mirrors `ValueType.From` (and has same usage syntax). Default is `VT.From`. Name for QS static tag that provides VT's custom algebra for value-type equality and unequality comparison. By default this tag is disabled.

<u>**Methods**</u>

#### .equals(v1, v2) [>>](#_Av2L7rhB-9) ####

#### .comparator(v1, v2 [, differNonVto]) [>>](#_Av2L7rhB-11) ####

#### .isValue(v) [>>](#_Av2L7rhB-13) ####

#### .isValueTypeObject(v) [>>](#_Av2L7rhB-15) ####

#### .quadsugarTags(qsNSO [, tagsDict]) [>>](#_Av2L7rhB-47) ####

<a name="_Av2X6m5W-1"></a>
### Schema literals grammar ###

This chapter gives some detailed insight into the schema literals grammar used in `New`, `From`, and `Schema`.

Lexical elements:
- C/JS-style comments: single line (`// ...<eol>`) and multi-line (`/* ... */`)
- whitespaces
- non-negative integer numbers
- C/JS-style single and double-quoted string constants,
- identifiers (anything that is valid as a JS identifier) - treated as string constants, so `a`, `"a"` and `'a'` are the same,
- punctuators: `+ - [ ] { } : , .@ ...`,
- inline placeholder (`${...JS expression...}`).

Comments, whitespaces and punctuators `: , ...` are ignored.

Syntax:
```
SCHEMA ::= ARRAY_SCHEMA | OBJECT_SCHEMA | EXT_SCHEMA
OBJECT_SCHEMA ::= '{' SCHEMA_IDX* '}'
ARRAY_SCHEMA ::= '[' SCHEMA_IDX* ']'
EXT_SCHEMA ::= '@' placeholder
SCHEMA_IDX ::= IDX SCHEMA?
IDX ::= IDSTRING | IDNUMBER
SET ::= SET_ARRAY | SET_OBJECT | SET_ARRAY_SEQ | SET_SCHEMA
SET_ARRAY ::= '[' SET_IDX* ']'
SET_OBJECT ::= '{' SET_IDX* '}'
SET_ARRAY_SEQ ::= '[' SET_VALUE* ']'
SET_SCHEMA ::= '@' SET_SCHEMA_SCHEMA placeholder
SET_SCHEMA_SCHEMA ::= placeholder | OBJECT_SCHEMA | ARRAY_SCHEMA
SET_IDX ::= IDX SET_VALUE
SET_VALUE ::= placeholder | SET
EDIT_ARRAY ::= '+' '[' MODIFY_IDX* ']'
EDIT_OBJECT ::= '+' '{' MODIFY_IDX* '}'
MODIFY_IDX ::= DELETE_IDX | SET_IDX | EDIT_IDX
DELETE_IDX ::= '-' IDX
EDIT_IDX ::= IDX EDIT_VALUE
EDIT_VALUE ::= EDIT_ARRAY | EDIT_OBJECT
```

The literal tags parse their inputs as the following symbols:
- `New`: `SET`
- `From`: `EDIT_ARRAY` | `EDIT_OBJECT`
- `Schema`: `SCHEMA`

Note that, although it is technically possible to use numeric keys in object-type schema and string/id keys in array-type schema, this is not allowed, and attempt to use
such a schema will be considered a syntax error.


---
The page generated by Logipard 1.0.3 using lpgwrite-example + lpgwrite-example-render-md generator
