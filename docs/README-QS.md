# Quadsugar #

Quadsugar (QS) is browser-oriented, embeddable JavaScript preprocessor that allows to selectively enhance the JS code with some conveniences:

- Improved exception and finalization handling.
- Variable and property references.
- Static and precalculated expressions.
- Static (compile-time) template tags, including framework for custom algebras (operator overloading, in familiar terms).

---


- Quadsugar[>>](#_Av076ptq-1)
  - Introduction[>>](#_Av076ptq-2)
    - Node.JS support[>>](#_Av076ptq-4)
    - Some important notes before proceeding[>>](#_Av076ptq-6)
  - Improved exception and finalization handling[>>](#_Av07EVzm-1)
    - TRY expression[>>](#_Av07EVzm-3)
    - FINALLY meta-label[>>](#_Av07EVzm-5)
    - CATCH meta-label and catch-switch[>>](#_Av07EVzm-7)
  - Variable and property references[>>](#_Av07GN9C-1)
  - Static and precaltulated expressions[>>](#_Av0jwSYX-1)
    - Static expressions[>>](#_Av0jwSYX-4)
    - Precalculated expressions[>>](#_Av0jwSYX-7)
  - Static template tags[>>](#_Av0jwSYX-10)
    - Custom algebras[>>](#_Av0jwSYX-13)
      - Preface[>>](#_Av1lOlMA-1)
      - Basic principles and operators specification[>>](#_Av0vcVXw-1)
      - Type control[>>](#_Av0Be0yK-1)
      - Literal parsing[>>](#_Av0Be0yK-4)
      - Placeholder casting[>>](#_Av0YJqGU-2)
      - Implicit value casting[>>](#_Av0Be0yK-10)
      - Cast rules and tracing[>>](#_Av0YJqGU-5)
      - Placeholder modes[>>](#_Av0YJqGU-8)
      - Lazy arguments[>>](#_Av0Be0yK-13)
      - Context object[>>](#_Av0Be0yK-19)
      - Post-evaluation[>>](#_Av0Be0yK-16)
      - Occurrence tag object[>>](#_Av0Be0yK-22)
      - Summary on evaluator argument specifiers[>>](#_Av0YJqGU-11)
      - Custom algebra example sum-up[>>](#_Av1lOlMA-4)
    - Simple static tag processors[>>](#_Av1urGT0-1)
  - Quadsugar configuration[>>](#_Av0YJqGU-17)
    - Compiled code caching[>>](#_Av0YJqGU-20)
      - Caching strategies[>>](#_Av1Csx6x-3)
      - Cache object interface[>>](#_Av1Csx6x-6)
      - Caching and static tag processing[>>](#_Av2HZ06M-1)
      - QS built-in cache implementations[>>](#_Av1Cta1B-3)
        - OptionalSyncCache[>>](#_Av1J43qP-1)
          - name[>>](#_Av1J43qP-47)
        - LocalStorageSyncCache[>>](#_Av1J43qP-55)
        - IndexedDbAsyncCache[>>](#_Av1J43qP-56)

---

<a name="_Av076ptq-1"></a>
# Quadsugar #

Quadsugar (QS) is browser-oriented, embeddable JavaScript preprocessor that allows to selectively enhance the JS code with some conveniences:

- Improved exception and finalization handling.
- Variable and property references.
- Static and precalculated expressions.
- Static (compile-time) template tags, including framework for custom algebras (operator overloading, in familiar terms).

<a name="_Av076ptq-2"></a>
## Introduction ##

When writing a self-contained single HTML5 page with scripts, one of the issues is controllable encapsulation of names. Tools for handling this
are somewhat limited.

_RequireJS/CommonJS?_

A bit awkward with symbols shared across multiple modules, and amount of added module names management may eventually become tedious.

_ESM?_

Simply no.

```
<html>
<script type="module">
export const PublicSymbol = ...;
</script>
<script>
// no, you can't access PublicSymbol from a non-module script in no way
var inlinePublicSymbol;
</script>
<script type="module">
// no, you can't access inlinePublicSymbol in no way
// and no, you can't access PublicSymbol either, because it is from inline module on the same page, and ESM design is by retards
</script>
</html>
```

There is a better solution: use __Quadsugar__ (QS for short).

```
<html>
<script src="[TODO]/quadsugar.js"></script>
<!-- but better download it and put nearby, or even paste inline, in order to reduce external depencencies and prevent leftpad-like conditions -->
<script>
var PublicSymbol;
QUADSUGAR.wrap(() => {
	// note it is highly recommended to have .wrap and the "() => {" on same line, more details later...
	var PrivateSymbol = ...;
	PublicSymbol = ...;
});
</script>
</html>
```

But, if the whole thing was just to run a function-wrapped code, it wouldn't justify a 193k size library. So there has to be more to it, right? right? Well, there actually is.

QS is not just a runner of a code in a wrapper function, it is actually a JavaScript preprocessor
that enables your wrapped code to use some JS enhancements. We may call them "semantic sugars", as they do not even add new syntax to JS, but,
instead, "overload" some existing syntax with the new semantics. These are some small conveniences which may seem simple, but they are surprisingly
challenging to implement palatably in plain JS.

To keep the text clean, we'll tend to skip QS wrapper parts in further writing, except for when it is essential to delimit the ongoings inside and outside.

<a name="_Av076ptq-4"></a>
### Node.JS support ###

This means QS makes sense to use in Node.JS as well (although it is primarily browser environment oriented). In this case it looks as follows:

```
# install
npm install [TODO]
```

Then, in a CommonJS style module:

```
const QUADSUGAR = require('quadsugar');

QUADSUGAR.wrap(() => {
	... // enhanced code
	exports.symbol = exportedSymbol;
	...
},
// the 2nd parameter to wrap is optional (and even deprecated) when you are in browser environment,
// but in node it is essential, and must be exactly like as below. With it, the wrapped code will
// have normal access to the lexical context, including `module`, `exports`, `__filename`, etc.
	code => eval(code));
```

<a name="_Av076ptq-6"></a>
### Some important notes before proceeding ###

## No optional semicolons

A very important note before we proceed. Might be not that important, but this misfeature of JS is unsoundly popular, so it is essential to clarify in advance.

**Semicolons are not optional in QS wrapped code.** There are also a few other disallowed constructs, which are pretty much summarized in the error message QS will throw at you on the occurrence:

`QS disallows optional semicolons and object/statement ambiguity - use explicit ';' or '(...)' to elaborate expression or statement delimitation, and explicit newline between consecutive block statements.`

This design decision is made for a number of reasons. Not the most important of them, but neither the least, is the conceptual coherence: JS is a C-like language, not Python-like, and should stay this way.
Aligning with this requirement is not that difficult, it is just a matter of a small bit of discipline. 

## Syntax compliance

QS itself is ES 2019 compliant (compatible with Node.js 13+ and last Windows 7 capable versions of major browsers), and assumes the wrapped code is as well. Features that use syntax from more recent ES
specs are not explicitly deprecated, but they are not explicitly supported as well, so there can be subtle and cryptic errors if you try it - before trying any serious code, it makes sense to
try some quick test use cases to see if the syntax of your choice works correctly.

The newer ES features that only involve use of new objects/classes/properties with no new syntax are totally ok to use.

## Minification challenges

QS code, as well as source code for QS preprocessing and the resulting generated code, is known to baffle the minifiers and to not work correctly after minification. Please be aware of this.

<a name="_Av07EVzm-1"></a>
## Improved exception and finalization handling ##

Built-in JS exception and finalization handling via `try/catch/finally` comes from Java. Controversial as it already is, this approach is even less fit in a dynamic typing world, where it is not possible
to have multiple catch clauses separated by exception class. This makes usability and usage of the said feature in JS quite limited.

QS offers several alternative ways, arguably more natural and convenient ones, to express the exception handling and finalization concepts.

<a name="_Av07EVzm-3"></a>
### TRY expression ###

`TRY` expression:

```
var result = TRY(expression).or(err => defaultValue);
```

is a shortcut for the following:
```
var result;
try { result = expression; }
catch (err) { result = defaultValue; }
```

But it is an expression, so you can use it inline with no need for intermediate variables.

```
var theAnswer = TRY(calculateMeaningOfLife(...)).or(e => 40) + TRY(calculateMeaningOfUniverse(...)).or(e => 2);
```

Be careful, `TRY` will catch anything that is thrown inside, even if it is not supposed to be caught here. Adding some basic checks to the `.or` callback can be useful. To make
it more writeable, QS provides shortcut `THROW(ex)`, which is the same as `throw ex;`, but is an expression, and so can be embedded as a subexpression:

```
const Timeout = {};
var iterations = 0, startedAt = new Date().getTime();
function producerCallback() {
	if (!(++iterations & 1023) && new Date().getTime() - startedAt > 1000L) {
		console.warn("Calculation timeout");
		throw Timeout;
	}
}

var result = TRY(calculateWithProducer(producerCallback))
	.or(e => e === Timeout ? NaN : THROW(e));
```

A subtle point is that `TRY` expression can contain `await` and `yield [*]`.

```
async function getAndProcess(fileName) {
	var input = TRY(await readFile(fileName)).or(
		e => isNotFoundError(e) ? (console.warn(`File ${fileName} not found, using default`), await readFile(DEFAULT_FILE))
		: THROW(e));
	return TRY(await process(input)).or(e => (console.warn("Processing failed, returning default value", DEFAULT_RESULT));
}
```

Although this generally makes little sense, result of `TRY` can be stored and unwrapped later:
```
var wrappedResult = TRY(...);
...
var actualResult = wrappedResult.or(e => defaultValue);
```

<a name="_Av07EVzm-5"></a>
### FINALLY meta-label ###

A statement under `FINALLY` label will be executed on exit from the block it is immediately under, no matter how (ab)normally the block ends. But only if the normal execution flow managed to reach the
line at which the label "normally" is:

```
{
	var file = openFile(...);
	FINALLY: file.close(); // this will run at the end, UNLESS openFile throws

	var result = file.read(...); // if we got here, file.close will execute even if file.read throws
}
```

It is obviously another way of expressing the traditional:
```
{
	var file = openFile(...);
	try { var result = file.read(...); }
	finally { file.close(); }		
}
```
but sharing a flat lexical scope with its immediate nesting block. All symbols of the block are available in the `FINALLY` statements.

Several `FINALLY` labels per block are possible - they will execute in the reverse order, and again in any case of block ending (even if a `FINALLY` that runs earlier throws),
but only those of them labels for which at their normal locations have been not bypassed.
```
{
	var interimResource1 = performStage1();
	FINALLY: interimResource1.dispose();

	var interimResource2 = performStage2(interimResource1);
	FINALLY: interimResource2.dispose();

	if (Math.random() < 0.5) throw Error("A random failure!"); // this prevents the following from happening and 3rd FINALLY from coming in effect

	var interimResource3 = performStage3(interimResource2);
	FINALLY: interimResource3.dispose();

	return combineFromResources(interimResource1, interimResource2, interimResource3);
}
```
This example will finalize `interimResource3`, `interimResource2`, `interimResource1` if no "random failure" occurred, or just `interimResource2`, `interimResource1` if it did.

In addition to its 'meta'-meaning, `FINALLY` is also still a JS label, and can be used as such inside its statement:
```
var arrayOfResources = [];
FINALLY: for (var resource of arrayOfResources) {
	if (!resource) continue FINALLY; // no need to use label here, but just to show it is possible
	resource.close();
}

... // fill up the arrayOfResources
```

<a name="_Av07EVzm-7"></a>
### CATCH meta-label and catch-switch ###

When `CATCH`-labeled statement is put immediately inside a block, an exception that occurs before this statement is reached causes the execution to make forward jump to it:

```
{
	// exceptions here will be caught by the statement
	perform1();
	perform2();
	...

	// will do nothing if reached normally with no exceptions in the process
	CATCH: switch (e) {
	case e instanceof PerformError:
		console.log("Non-fatal perform error:", e);
		break;
	}

	// exceptions here will _not_ be caught by the statement
	perform3();
	...
}
```

The statement under `CATCH` must always be a `switch (varname) { ... }` (catch-switch), and it has a little different semantics from a usual `switch`.

The `switch` expression in catch-switch must always be a single identifier, which denotes a local variable that will be visible inside the switch block and will be assigned with the error to catch
(similarly to `catch (varname)` in the traditional `try/catch`).

The `case` expressions are not values to compare to the `switch` expression - instead, these are bool-ish expresions, presumably using the catch-switch variable name, that check if the caught item
satisfies a certain criteria. They are evaluated in turn similarly to usual `case`-s, but the matching case will be the first one that evaluates to non-false.

`default` case is allowed and, like in usual `switch`, behaves as a 'catch-all' clause if no other case matches. However, unlike in usual `switch`, if `default` is omitted, it doesn't mean that the
catch-switch statement will be just silently skipped. If no `case` matched and `default` is not provided, then the thrown item propagation will continue. Next handler that will have a chance to handle it
can be another catch-switch down the block:

```
{
	var result1 = process1();

	CATCH: switch (e) {
	case e instanceof RecoverableError:
		console.warn("Recoverable failure at stage 1", e);
		result1 = DEFAULT_VALUE_1;
		break;
	}

	var result2 = process2(result1);

	CATCH: switch (e) {
	case e instanceof RecoverableError:
	case e instanceof LessRecoverableError:
		// this can be reached from either process2, or immediately from process1 if it throws LessRecoverableError
		// and also in case if RecoverableError or LessRecoverableError is thrown from inside the previous CATCH-switch itself!
		console.warn("Recoverable failure at stages 1-2", e);
		result2 = DEFAULT_VALUE_2;
		break CATCH; // by the way, CATCH is also a usual label from its inside
	}

	return process3(result2);

	// it is ok to place catch-switch after return, although devtools may complain
	CATCH: switch (e) {
	default:
		console.error("Unrecoverable error at stages 1-3", e);
		return TOTALLY_DEFAULT_VALUE;
	}
}
```

Catch-switch is considered to be still inside its containing block, so, if used in one block with `FINALLY` labels, then `FINALLY`s will execute after any `CATCH`-es (similarly to usual `try/catch/finally`).
But `FINALLY`s that are bypassed by a throw and forward-jump will not be executed:

```
{
	var file1 = openFile(...);
	FINALLY: file1.close();

	var file2 = openFile(...);
	FINALLY: file2.close();

	CATCH: switch (e) {
	default:
		console.error("File error!", e);
		if (!file1) console.error("File 1 was NOT opened"); // file1.close will not execute if this is the case
		if (!file2) console.error("File 2 was NOT opened"); // file2.close will not execute if this is the case
	}
}
```

Like `FINALLY` statements, the catch-switch shares flat lexical visibility of the symbols of the immediately nesting block. But there is a very important caveat here. The forward-jump on the throw
can bypass the declarations, including `const`, classes and functions (function declarations are not hoisted inside blocks with `FINALLY` or `CATCH` and only come into effect when normally reached).

The QS convention on these cases is as follows: the symbols with bypassed declarations are explicitly `undefined`. So, if your code uses a potentially bypassed symbol, do not rely on its value for granted
and always do `if (typeof (symbol) !== 'undefined')` check. Since this is a not so unfrequent case, QS provides a shortcut for this expression: `DEFINED(nameOrExpression)`.

```
{
	const result1 = ...;

	CATCH: switch (e) {
		...
	}

	const result2 = ...;

	CATCH: switch (e) {
		...
	}

	var result3 = DEFINED(result1) && DEFINED(result2) ? combineResults(result1, result2) : DEFAULT_VALUE;
	...
}
```

<a name="_Av07GN9C-1"></a>
## Variable and property references ##

A reference is an object with `value` property reading and writing to which is forwarded to some other destination.
For example, a reference to a variable would look like this:

```
var a = 0;

const refToA = {
	get value() { return a; },
	set value(x) { a = x; }
};

refToA.value = refToA.value + 100;
// or: refToA.value += 100;
// same as: a += 100;
```

In QS, there is a shortcut for this: `REF(varname)`. For example:
```
function getByKey(key, refResult) {
	var node = getNodeByKey;
	if (node) { refResult.value = node.value; return true; }
	else return false;
}

var r;
if (getByKey(..., REF(r))) {
	console.log("Result", r);
}
```

It is also possible to make references to other lvalues (that is, object properties or array indices), but these cases are a bit more complex.

For example, how would we treat a reference to lvalue `arr[i]`? Unlike varname lvalue, it is an expression that depends on multiple variables, and
their values can change at any time. So, we have two distinct possible strategies:

- _bind_ reference to the lvalue expression. A `reference.value` is literally an alias to `arr[i]`, and the lvalue expression is evaluated every time
the reference is read from or written to.
- _pin_ reference to the specific object and property determined by the lvalue at time of the reference creation. The expression is evaluated only once
at that point, and then all reading/writing to this reference will go to that object+property, regardless on further changes to any values contributing
to the source expression.

Instead of choosing the most "natural" strategy of these two, QS supports both and requires you to specify your intent explicitly if the lvalue is
an expression:

```
// bind-type reference example
var array = [...];
var i, refI = REF(array[i], BIND);
for (i = 0; i < array.length; i++) refI.value += 10; // same as array[i] += 10;

// pin-type reference example
var arrayIncreasers = [];
function increase(refToVal) { refToVal.value += 10; }
for (var i = 0; i < array.length; i++)
	arrayIncreasers.push(increase.bind(globalThis, REF(array[i], PIN)));
// note that using BIND here would cause the wrong result from the code below

for (var increaser of arrayIncreasers) increaser();
```

Note that with `BIND`-type reference, due to the logic of the expression binding, the lvalue expression is not allowed to contain `await` or `yield [*]`
operators.

<a name="_Av0jwSYX-1"></a>
## Static and precaltulated expressions ##

With these tools you can explicitly specify that certain inline expressions only need to be evaluated once per certain scope.

<a name="_Av0jwSYX-4"></a>
### Static expressions ###

An expression `STATIC(expr)` will only be evaluated once when it is first reached, and use this value on all next evaluations of this particular code location.

```
var rads = [...], degs = [];
for (var i = 0; i < rads.length; i++) {
	degs[i] = rads[i] * STATIC(180.0 / Math.PI);
}

// note that every STATIC is evaluated on its own, even if it is exactly same expression as some other STATIC
// so this only makes sense for an expression that only occurs once somewhere inside a deep loop
console.log("Degrees in radians:", STATIC(180.0 / Math.PI));
```

But what if we want to evaluate once not globally, but, say, once per certain function call?

In this case, we can use version of `STATIC` with explicit scope specification:

```
function getNormalizedArray(srcArr) {
	var result = [];
	SCOPE: NormArrayScope; // mark the scope with meta-label SCOPE followed by an identifier
	SCOPE: NAS2; // a block can have multiple scope marks for better manageability

	for (var i = 0; i < srcArr.length; i++) {
		result[i] = srcArr[i] * STATIC[NormArrayScope](1.0 / srcArr.reduce(((a, c) => a + c), 0));
	}
}
```

`STATIC[ScopeId]` will be evaluated only once per each entrance into innermost outer block marked with `SCOPE: ScopeId`. Note a couple of points about
scope marks:
- a scope mark with same id can only be used once in a block, but can be re-used in its nested blocks - the more nested marks are not visible to code
outside the blocks that contain them, and shadow the marks from outer blocks.
- a scope mark must be declared prior to the code that uses it, even in the case if it overrides an outer mark:
```
{
	STATIC[X](expr1); // not valid
	SCOPE: X;
	STATIC[X](expr2); // valid

	{
		STATIC[X](expr3); // not valid
		SCOPE: X;
		STATIC[X](expr4); // valid (refers to the inner X)
	}

	STATIC[X](expr5); // valid (refers to the outer X again)
}
```

<a name="_Av0jwSYX-7"></a>
### Precalculated expressions ###

Static expressions only evaluate when the code that uses them is first executed, but that may happen at indefinite time, or never. But what if we need
some expression to be evaluated regardless on that?

For such purposes there is a similar concept - precalculated expression: `PRECALC[Scope](expr)`. It is guaranteed to evaluate at the given scope whenever
that scope is reached:
```
{
	var eventSubscriptionSet = newEventSubscriptionSet();
	SCOPE: Subs; // location of SCOPE label here is important
	var subscription = eventSource.subscribe(eventSubscriptionSet);
	FINALLY: subscription.close();

	EVENT_LOOP: for (;;) {
		var event = await subscription.expectNextEvent();
		switch (event.typeId) {
		case PRECALC[Subs](eventSubscriptionSet.addEvent('QUIT').typeId):
			break EVENT_LOOP;
		case PRECALC[Subs](eventSubscriptionSet.addEvent('HELLO').typeId):
			console.log("Hello");
			break;
		...
		}
	}
}
```
It behaves the same as:
```
{
	var eventSubscriptionSet = newEventSubscriptionSet();
	const
		case1 = eventSubscriptionSet.addEvent('QUIT').typeId,
		case2 = eventSubscriptionSet.addEvent('HELLO').typeId;
	var subscription = eventSource.subscribe(eventSubscriptionSet);
	FINALLY: subscription.close();

	EVENT_LOOP: for (;;) {
		var event = await subscription.expectNextEvent();
		switch (event.typeId) {
		case case1:
			break EVENT_LOOP;
		case case2:
			console.log("Hello");
			break;
		...
		}
	}
}
```

In `PRECALC` expression, specifying the scope is mandatory, and not only the scope block itself matters, but the location of `SCOPE` label as well.
Evaluation of the expression occurs in a scope generally different than one it is used in (keep that in mind when using `PRECALC`s), and the `SCOPE` label
designates the specific location where the evaluation will be inserted at. So, in our example, it will be added after `var eventSubscriptionSet = ...`,
but before `var subscription = ...`. At the same time, the `event` variable for example will not be valid in these `PRECALC`s. But in any case, both
expressions will always be evaluated, regardless on whether the case labels that use them will ever be triggered. If several `PRECALC`s refer to same
scope label, the order of their evaluation will be the same as they follow in the code (like, in our case, 'QUIT' goes first, 'HELLO' goes second).

There is an important caveat when using `PRECALC`s inside blocks where the corresponding `SCOPE` labels (and therefore the implicitly inserted evaluations)
can be bypassed by forward-jump to a `CATCH` label.

To prevent questionable behavior in such occurrences, QS requires that a `SCOPE` label and the site of `PRECALC` that references it did not have a `CATCH`
between them. This is called `CATCH`-fence and will trigger compile-time error:
```
{
	SCOPE: A;
	PRECALC[A](expr1); // ok

	CATCH: switch(e) {...} // catch fence

	PRECALC[A](expr2); // error!
	SCOPE: B;
	PRECALC[B](expr3); // ok
}
```

Like with `STATIC`, `PRECALC` can only refer to scope labels that are located earlier in the code.

If the restrictions of `PRECALC` are ok for your use case, you may prefer it to `STATIC` as it generates a slightly more performant underlying code due to saving on
a first-run check.

<a name="_Av0jwSYX-10"></a>
## Static template tags ##

This feature group enhances JS tagged template string feature, allowing you to override standard runtime handling of tagged template expressions of certain format (``Identifier `string-with-placeholders` `` and
``Identifier(args) `string-with-placeholders` `` for particular identifiers, optionally ``"Identifier" `...` `` and ``"Identifier"(...)`...` ``) and replace it with preprocessing-time handling, which enables
to do things not normally possible.

<a name="_Av0jwSYX-13"></a>
### Custom algebras ###

Operator overloading is a useful feature in (some) static typed languages, which poorly borrows as is into dynamic typed world. Known approaches, like Lua metatables, are rather clumsy and more like
"just to check the box" type.

In JS, there is a tagged template string feature that allows to express an expression with custom operators like this: ``MyNonStandardNumericExpression `0.5 * (${val1} + ${val2})` `` (we will call this approach
a __custom algebra__). In plain JS, however, this approach requires quite a significant boilerplate and suffers from several limitations imposed by the way tagged template strings are handled. In particular,
every evaluation of the expression needs at least a lookup on the template string components.

QS allows to deal with both, providing easy high-level method of defining custom algebras for use in QS-wrapped code and translating their expressions directly to code that doesn't need tag manipulation layer
in the actual runtime.

<a name="_Av1lOlMA-1"></a>
#### Preface ####

For clarity, explanation of QS custom algebra features will be given on example of a custom algebra for 2D vectors. It will start off a very simple
and basic specification, which will be extended in each next section as each new feature is introduced. If you struggle to keep track on what the current code
looks like, or want to take a quick look-ahead, see here for the complete example: `Custom algebra example sum-up`[>>](#_Av1lOlMA-4)

<a name="_Av0vcVXw-1"></a>
#### Basic principles and operators specification ####

So, let's say, we are implementing a custom algebra for 2D vectors represented by arrays of length 2.

```
// step 1: define the custom algebra specification (outside QS-wrapped code)
const algebraVec2D = QUADSUGAR.staticAlgebraTag((ct) => [
	// operators are specified in order of decreasing precedence
	ct.prefixOperator('-').evaluation('ARG', arg => [-arg[0], -arg[1]]),
	[
		// if there are several operators at same level of precedence, put them into an array
		ct.leftBinOperator('-').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => [lhs[0] - rhs[0], lhs[1] - rhs[1]]),
		ct.leftBinOperator('+').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => [lhs[0] + rhs[0], lhs[1] + rhs[1]])
	]
]);

QUADSUGAR
.useStaticTags({
	// step 2: when QS-wrapping a code, add .useStaticTags clause with IDs to associate with your algebra(s)
	// and the algebra object created at step 1 as their values
	Vec2D: algebraVec2D
})
.wrap(() => {

console.log (
	// step 3: use it in your code as YourAlgebraTag `...expression...`
	Vec2D `${[1, 0]} + ${[0, 1]} - -(${[-1, 2]} + ${[-1, 0]})` // algebra has built-in support of parenthesized subexpressions

	// NOTE! Use the Vec2D (or Vec2D(...), as we'll see later) as the raw identifier, without wrapping into parenthesis, and without
	// aliasing by a constant/variable/expression - only the Tag `...` or Tag (...) `...` will be recognized and handled as static tags.
	// The enabled static tags should be considered as reserved words within this wrapped code, and should only be used for the tagged
	// expressions as shown - avoid using them for variable/constant/argument names to avoid misinterpretation.
	// Other versions of tagged strings, as well as tag IDs not declared in the useStaticTags, will be handled as vanilla JS string tags.
);

console.log("Vec2D" `${[100, 200]}`); // it is also allowed to use the tags stringified in double or single quotes, which can help
// if you are using non-ID keys; possibly it even makes sense to do this always to distinguish the use case, but it is more verbose,
// so we'll stick to using syntax with ID

});
```

Some more detailed explanation in addition to what is said in the comments.

The `staticAlgebraTag` method to create the algebra specification is expected in form `(ct) => [...]`, where `ct` denotes a __construction toolkit__ object containing the seeding methods for
entry specifications, and the expected return value is the array of the entry specifications.

A specification entry is made in builder pattern alike manner using appropriate seeding methods for start. Most obviously expected specifications are those of algebra operators. In the example
you see a unary prefix operator (seeded by `ct.prefixOperator(OperatorToken)`) and left-associative binary operator (seeded by `ct.leftBinOperator(OperatorToken)`). Other options include
unary postfix (`ct.postfixOperator(OperatorToken)`) and right-associative binary (`ct.rightBinOperator(OperatorToken)`) operators. Only the operators declared in the specification can be used in this
algebra expressions, not counting built-in support of parenthesized subexpressions that always have the highest precedence.

You can also see some primary patterns of operators declaration.

An operator token is the stringified operator symbol, which can be any valid JS token. The operators don't have to match the rules and precedence of their JS conterparts, e. g. you can have `++` as a binary
operator, or have `*` as a prefix operator, or `=` as a left-associative with higher precedence than binary `+`. Additionally, the operator may be not just an actual operator, but as well a punctuator,
an identifier/keyword, or a constant (numeric, string, and even regexp). In case of constants, note that matching the token as an operator value is done on verbatim raw equality, that is `1.0`, `1`, `+1`
are all different tokens, as well as `'a'` and `"a"`.

If a certain token is not recognized as one of declared operators in a valid position, an attempt is made to interpret it as a literal, but more on that later.

All of the operator declarations behave this way, with one (more exactly, three) exceptions: the parenthesis (in context where they can not be interpreted as a subexpression), the braces and the brackets
(the brackets for all 3 hereinafter, for short), if specified as operators, must be specified as `()`, `{}`, `[]` respectively (the matching pair with no spaces in between) and can only be `leftBinOperator`'s:
if such specifications exist then subexpressions in the corresponding brackets following the left hand side operand are considered the right hand side operand (e. g., `op1(op2)`, `op1[op2]`, `op1{op2}`), and
their behavor follows some special rules in order to match the intuitive notion of brackets:
- evaluation of subexpressions inside the brackets always has higher precedence than of the surrounding operators and the bracket operator itself. For example, if we have operators `+` and `[]`, and an expression
`1+2[3+4]`, then `3+4` is always the highest priority, and the whole expression will be treated as `(1+2)[3+4]` if `+` is declared with higher precedence than `()`, or `1+(2[3+4])` if `()` is
declared with higher precedence than `+`.
- if the `()/{}/[]` operator is followed by a postfix operator of higher precedence, then precedence of the bracket operator is elevated to be above the postfix operator, so the latter is applied to the result
of the bracket operator, not to its right operand. For example, if `++` has lower precedence than `[]` and `+`, then `1+2[3]++` is treated as `(1+2[3])++`, but if `++` has higher precendence than both of them,
then it is treated as `1+(2[3]++)`, not as `1+2[(3)++]`.
- an empty `()/{}/[]` in the expression is treated as invocation of the corresponding operator with a right-hand side operand of special type `void`.
Additionally, an empty subexpression (`()`) in a value context is also treated as a value of type `void`.

An operator is typically followed by `.evaluation` clause, which is a common pattern not just for operator specification, but for most other specifications that will be described below.
It is called __evaluator specification__.
The `.evaluation` contains a number of arguments, the last of which must be a function that will do the actual evaluation at runtime (the evaluator), and the preceding arguments are evaluator argument
specifiers - string constants describing what arguments will be passed to the evaluator. The evaluator must take the arguments in the same order and same amount as specified, and treat each one in the same
meaning as prescriber by the matching specifier, and return the evaluation result.

The set of allowed argument specifiers depends on the declared entry. Thus, for prefix and postfix operators, `'ARG'` specifier denotes the argument value, and for binary operators `'LHS_ARG'` and `'RHS_ARG'`
denote left hand side and right hand side values, respectively.

Result of evaluation also depends on context. For an operator, for example, it should be the internal representation of the operation result that we chose
to represent the value with that attributed static typename in JS. (Thus, a vector will be represented by an array.)

The representation does not have to be internally associated with the particular static typename - so, for example, an array or a string can represent
multiple typenames, or, conversely, a typename can be represented by a variety of internal JS types. The QS algebra framework will do the magic to ensure
a representation of a typename only goes to places where this typename is appropriate, and it is up to you to ensure that appropriate representations are
consistently expected in appropriate places (and not to screw the specification, of course).

In general, `.evaluation` clause is optional if the subject entry is 'one-in - one-out' type (e. g. unary operators). If skipped, then the intended evaluation is assumed an _identity_, or _no-op_, operation -
the input will just be passed to the output. Thus, we could add declaration of a prefix '+' operator this way:
```
...
	[
		ct.prefixOperator('-').evaluation('ARG', arg => [-arg[0], -arg[1]]), // unary minus
		ct.prefixOperator('+') // unary plus, no evaluation - the argument will be directly taken as the result
	]
...
```

For binary operators, however, the evaluation is mandatory.

When specifying several operators at same level of precedence, note that all of them must be of the same type (prefix, postfix, left-bin or right-bin). It is not allowed to mix unary and binary operators,
or operators of different prefixness/postfixness, or operators of different associativity.

In addition to placing operators of same precedence as different entries in a sub-array, it is also possible to specify several operators to go under same evaluator:
```
...
	ct.leftBinOperator('-', '+').evaluation(...) // but how will we differ between the operators?
...
```

In this case, it makes sense to add an argument `'OPERATOR'` to the evaluator, which will be set to the operator token:
```
	ct.leftBinOperator('-', '+').evaluation('LHS_ARG', 'RHS_ARG', 'OPERATOR', (lhs, rhs, op) => {
		if (op === '-') return [lhs[0] - rhs[0], lhs[1] - rhs[1]];
		else /* op === '+' */ return [lhs[0] + rhs[0], lhs[1] + rhs[1]];
	}) // actually a somewhat suboptimal way to define two distinct operators in this particular case
```

<a name="_Av0Be0yK-1"></a>
#### Type control ####

Vector algebra is incomplete without scalar multiplication, let's fix it:

```
...
	ct.prefixOperator('-').evaluation(.../*as earlier*/),
	// new operator of precedence between binary ops and unary minus
	ct.leftBinOperator('*').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => [lhs * rhs[0], lhs * rhs[1]]), // assume scalar is on the left
	[
		ct.leftBinOperator('-').evaluation(.../*as earlier*/),
		ct.leftBinOperator('+').evaluation(.../*as earlier*/)
	]
...
```

But it is now possible to write like this:
```
Vec2D `${[1, 0]} * ${2}` // forgot that scalar must be to the left
Vec2D `-${2} * ${[1, 0]}` // but unary '-' is only defined in assumption it is applied to vector
```

We of course will do our best to avoid such mistakes, but it would be nice if the system helped us a bit. In static typed languages, this could be controlled using the types.
In JS we have no static (compile-time) types. But QS custom algebra allows to use static type hinting within the algebra's expressions.

Each operand, operator result, subexpression, and expression in overall is actually assigned a type. In QS, the type is just a string denoting a _typename_. There is no inheritance or any other
non-trivial relation between types other than equality (by equality of typenames), or any other properties of a type beside its name. Type names for each algebra make an isolated namespace and
have no effect on expressions in other algebras. A type requires no special declaration other than use of its typename, and there are 2 built-in types that always exist in a custom algebra:
- `dynamic`: the default type which is assigned to values from placeholders, operation results and arguments, if no explicit type for them is given (but it is also ok to specify it explicitly).
- `void`: a type with some special properties that we'll touch later, it is assigned to expression `()` (an empty subexpression), and also to right-hand side operands of operators `()`, `[]`, `{}` if they
are empty (i. e. `arg()`, `arg[]`, `arg{}`).

In our examples so far, we have not specified any types, so all of them are `dynamic` one. Let's elaborate.

```
...
	[
		ct.prefixOperator('-').argType('vec2d').resultType('vec2d').evaluation('ARG', arg => [-arg[0], -arg[1]]),
		// makes sense to define one for a number too
		ct.prefixOperator('-').argType('number').resultType('number').evaluation('ARG', arg => -arg)
	],
	ct.leftBinOperator('*').argTypes('number', 'vec2d').resultType('vec2d').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => [lhs * rhs[0], lhs * rhs[1]]),
	[
		ct.leftBinOperator('-').argTypes('vec2d', 'vec2d').resultType('vec2d').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => [lhs[0] - rhs[0], lhs[1] - rhs[1]]),
		ct.leftBinOperator('+').argTypes('vec2d', 'vec2d').resultType('vec2d').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => [lhs[0] + rhs[0], lhs[1] + rhs[1]])
	]
...
```

Here, we added type specifications for operator input arguments (`argType(type)` for unary, `argTypes(leftType, rightType)` for binary) and for result (`resultType(type)`). The names `number` and `vec2d`
are absolutely arbitrary - like said before, it only matters that they are distinct strings, and it is up to us to use them consistently across the algebra. Also note that we added "overload" of a unary
minus for number as well.

Let's try our updated algebra...
```
...
	console.log(Vec2D `${2} * ${[1,0]}`);
...
```
...and we get an error that may seem a bit cryptic at first:

`SyntaxError: ..., 'Vec2D': Vec2D expression: failed to match expression to any valid type, interim cast failures: 54:19 placeholder #1 -> 'vec2d', x:x placeholder #0 -> 'number', x:x lit/opr '*' -> 'vec2d'; farthest successfully matched fragment was at: <no data>`

The issue is that we forgot that placeholders, as said before, are assigned `dynamic` type by default, and there is no way to deduct them from the actual javascript value, as the algebra processing occurs
statically. There are ways to strengthen the type deduction, but for now we will go the simplest way - provide a type hint inline using a dedicated operator.

```
...
	// make these operators of higher precedence than unary minuses, and make them postfix for a change
	[
		ct.postfixOperator('N').argType('dynamic').resultType('number'),
		ct.postfixOperator('V').resultType('vec2d') // argType('dynamic') can be actually omitted
	],
	[
		ct.prefixOperator('-').argType('vec2d').resultType('vec2d')... /* as earlier */,
		ct.prefixOperator('-').argType('number').resultType('number')... /* as earlier */
	],
...
```

Note these new operators do not have `.evaluation` specified, so they are no-op - their only job is to assign new type to the input value.

Our test expression now has to be modified appropriately...
```
...
	console.log(Vec2D `${2}N * ${[1,0]}V`);
	// and a few more variations...
	console.log(Vec2D `-${2}N * ${[1,0]}V`);
	console.log(Vec2D `${2}N * -${[1,0]}V`);
...
```
And it works! And if we now try to:
```
...
	console.log(Vec2D `${[1,0]}V * ${2}N`);
...
```
then, as expected, it will throw error at us:

`SyntaxError: ..., 'Vec2D': Vec2D expression: failed to match expression to any valid type, interim cast failures: x:x lit/opr 'N' -> 'vec2d', x:x lit/opr 'V' -> 'number', x:x lit/opr '*' -> 'vec2d'; farthest successfully matched fragment was at: <no data>`

With a closer look, the error message is quite comprehensible: we have all of the locations where, directly or by implication, an operation failed to deliver one of the types allowed in that context.

This way we achieved our initial intent. Although it is still possible to write things like ``Vec2D `${[1,0]}N` `` (or occasionally put there a vector-delivering expression), but this is something we can handle
from our dynamic typing experience, right? Also, it is possible to add `.evaluation` clause to `N` and `V` operators with value coercion or check - but let's not bother, there are more interesting possibilities
ahead.

<a name="_Av0Be0yK-4"></a>
#### Literal parsing ####

Now we have more or less decent 2D vector algebra, but there is still space for improvement.

Like we said earlier, a token that can not be recognized as a legit operator in its location can be interpreted as a literal. But that comes with no defaults
and needs some work. Let's say we want to support numeric literals. We will need to add the following...
```
	ct.parseLiteral('number').isApplicable(strVal => {
		return !Number.isNaN(parseInt(strVal));
	}).evaluation('VALUE', strVal => {
		return parseInt(strVal);
	}),
	[
	// ...operators we already have...
	],
	...
```

The `parseLiteral(typename)` definition takes a typename to assign to the literal, and contains the following clauses:
- `.isApplicable(checkerFunc)` (mandatory): applicability checker. `checkerFunc` should be a function that takes in the verbatim token string and returns true if this parser is
applicable to this token. Note this function will be invoked at compile-time and may be called repeatedly for same token, to avoid unnecessary side effects.
- `.evaluation(...args, evaluatorFunc)` (mandatory): the evaluator specification. For literal parser, it can take `'VALUE'` argument, which will be set to the token's verbatim
string (same as passed to the checker set by `isApplicable` ). It should return the value for the literal, naturally matching the declared type.
The evaluator will be called at runtime. When exactly and how much times for a particular token, depends on whether the parser is or is not idempotent
(see below).
- `.nonIdempotent()` (optional, not shown here). If this clause is present, the literal parser is declared as non-idempotent. Otherwise (as by default),
it is idempotent.

Idempotent parsers are assumed to return value that only depends on the input argument and always returns same value for same input, not depending on any
implicit state. As such, the evaluator for them is only called once per each identical token within the algebra (once per QS-wrapped code snippet, to be
more exact), and it happens ahead, at the very start of the QS-wrapped code snippet for all encountered idempotent tokens.
Note that evaluator for an idempotent parser can only take exactly one argument, and specifier for it can only be `'VALUE'`.

Non-idempotent parsers may return different values for each token and on each evaluation, so they are evaluated every time on evaluation of an expression
for each of their inputs (even matching ones). This may be useful when meaning of tokens is context dependent.
Non-idempotent parsers have less limitations on the the passed arguments, but one of them must be `'VALUE'`.

There can be multiple literal parsers specified - each of them is tried against a literal token, and the applicable one is chosen. If there are more than
one applicable parser, the choice will be attempted based on type deduction (more on that later), and if it still does not allow to resolve the ambiguity,
a compile-time error will be generated like this: `'Vec2D': Vec2D expression: expression ambiguity with the following possible types: ...list of typenames...`

Declaration of literal parser is not limited by precedence consideration and can occur anywhere at top level of the algebra declaration array (same actually
applies to all declarations except for operators).

<a name="_Av0YJqGU-2"></a>
#### Placeholder casting ####

Similarly, you can add type casting to placeholders, although you are more limited to the detection options here as the placeholder value is not known in advance.

```
...
	ct.placeholderCast('number').evaluation('VALUE', p => +p),
	ct.placeholderCast('vec2d'), // assume the vectors will be passed as arrays and no additional casting evaluation is needed

	ct.parseLiteral('number').isApplicable(strVal => { // continued from the previous section
	...
...
```

The `placeholderCast(typename)` definition takes a typename to assign to the placeholder, and can contain the following clauses:
- `.evaluation(...args, evaluatorFunc)` (optional): the evaluator specification. For placeholder cast, the evaluator can take the `'VALUE'` argument, which will be the source placeholder value
(as evaluated by the corresponding JS expression), unless `.placeholderMode` (see below) is applied.
- `.placeholderMode(mode)` (optional): this is quite a powerful option, so there will be a dedicated section later for it - for now we'll just stick to basics.

Like with literal parsers, the available placeholder casts will be tried, and the one matching in the context will be used.

Note now that the expression:
```
console.log(Vec2D `2 * ${[1,0]} + ${3 + 1} * ${[0,1]}`);
```
no longer requires to use `N` and `V` operators for type elaboration, as the algebra now contains enough information to deduce the types in this context.
On the other hand,
```
console.log(Vec2D `${[1,0]}`);
```
will complain on the ambiguity between `dynamic`, `number` and `vec2d` (all the 3 types a single placeholder can be now interpreted as, remember `dynamic` is the default one),
so you will still have to be specific in this case:
```
console.log(Vec2D `${[1,0]}V`);
```

Note that, since now the only option for a `N` operator argument is `dynamic`, the placeholder cast to use will be default-`dynamic`, in order to deliver the operand type expected by `N`.
But for example if we replace existing implementation of `N` with two ones for `dynamic` and `number` input...
```
	...
	ct.placeholderCast('number').evaluation('VALUE', p => (console.log("Number placeholder cast used"), +p)), // add placeholder cast for number, with logging
	ct.placeholderCast('dynamic').evaluation('VALUE', p => (console.log("Dynamic placeholder cast used"), p)), // override default dynamic placeholder cast with explicit, to insert a logging
	...
	[
		ct.postfixOperator('N').argType('dynamic').resultType('number'),
		ct.postfixOperator('N').argType('number').resultType('number'),
		ct.postfixOperator('V').resultType('vec2d') // as before
	]
	...
```
...well, we get `operand ambiguity with the following possible types: 'number' (unary 'N' [dynamic]), 'number' (unary 'N' [number])` at this time, for the reasons possibly obvious. Do the magic for now:
```
...
	ct.placeholderCast('dynamic').evaluation('VALUE', p => (console.log("Dynamic placeholder used"), p)).secondary(), // replace the placeholderCast('dynamic') with this
...
```
and now, ``Vec2D `${1}N` `` will tell us that number placeholder cast was used.

More explanations will follow, for now just keep in mind that, when determining suitable casts, placeholder casts and operand types, the ones with no specified evaluators (i. e. identity-type implementations)
are preferred over ones with evaluators, explicitly user-defined ones are preferred over default ones (for example, we can comment out the `ct.placeholderCast('dynamic')...` to let the default one
have effect, and there will be no ambiguity issues), and ones without `.secondary()` clause are preferred over the ones with one.

<a name="_Av0Be0yK-10"></a>
#### Implicit value casting ####

In addition to placeholder casts, which only apply to the placeholder values, you can define implicit casts between values of different types. They will come into play if there are no operator definitions
with an matching operand type, but there is a cast from one to the required one.

Let's add a string type which can be specified by a quoted literal, and cast from it to number:
```
...
	ct.parseLiteral('string').isApplicable(strVal => {
		return strVal.startsWith('"');
	}).evaluation('VALUE', strVal => {
		return JSON.parse(strVal);
	}),
	ct.typeCast('string').to('number').evaluation('VALUE', str => +str),
...
```

The `typeCast(typename)` definition takes an input typename, and can contain the following clauses:
- `.to(typename)` (optional, default is `dynamic`): the destination typename.
- `.evaluation(...args, evaluatorFunc)` (optional): the evaluator specification. For value cast, the evaluator can take the `'VALUE'` argument, which will be the source value.

Source typename can be any except for `void` (while `to` typename can be `void` as well). By design, cast to `void` is irrevertible, and `void` values are not castable to anything - they can only be
operands to operators, or the operator results.

Now, despite we have no "string * vec2d" operator,
```
console.log(Vec2D `"2" * ${[1,0]}`);
```
will deliver us the expected value.

Like placeholder cast and prefix/postfix operators, the value cast can have `evaluation` omitted and can have added `.secondary()` clause.

There are built-in default casts from any value to `dynamic` (except for from `void`), they are identity-type operations and will be used on occasion if no explicit casts to `dynamic` are provided (which
typically is sufficient).

<a name="_Av0YJqGU-5"></a>
#### Cast rules and tracing ####

Now, to summarize the rules QS custom algebra uses for desambiguation of types in the overall exprssion.

The expression is first parsed as an Abstract Syntax Tree with only operator and value nodes with no types attributed to each node. Due to convention on each operator level can only contain
operators of same type, structure of such AST is always unambiguous.

Then, an attempt is made to attribute the types to each operand and operator node, based on the algebra specification. There are typically options to choose from, and desambiguation rules are used
to reduce their set. The goal is that every node and the expression in overall ended up with exactly one attributed type.

The rules for type collection and reduction are as follows:

- For an operator, the operands are first attributed the set of all types that its corresponding operands are allowed to have.
- Additionally, types are added that can be cast to one of allowed operand types by an implicit value cast, using no more than one cast.
- Then, type options are filtered out based on number of casts involved. Operands that require no cast are preferred over operands that require the cast. For binary operators,
the sum of casts is considered. The option that requires cast for both operands is less preferrable then option that requires cast only for one, and it in turn is less preferrable than option with
no casts. Options that require a cast only for left or only for right operand have equal preference - if they both are encountered, the unnecessary one can note be ruled out at this stage.
- If more than one option remains, then they are filtered by transitional terminality: a node that is a placeholder or a literal, or that goes to a placeholder/literal via chain of unary operators or
implicit value casts all of which have "identity" type implementation (omitted `.evaluation`), is "more terminal" than one screened by a non-identity operation in the way, and is preferred over the latter.
- Additionally, the nodes are filtered by secondarity: if a literal parser, a placeholder cast, a value cast, or an operator has `.secondary()` clause in its declaration, then its matching option
is less preferrable than non-secondary one; also, if built-in default implementation exists (specifically for implicit value casts and placeholder casts), then it is less preferrable than explicit user-specified
one.
- If, after all these stages, there is still more than one type option remains for a node, then it is an ambiguity error.
- After type reduction of the whole expression, if no type options remains for the rootmost node, then it is a "failed to match to a valid type" error.

It is sufficient to support reasonably terse expressions for an average algebra, but do not rely on implicitness too much and prefer simplicity. If your specification set becomes intricate enough, you may
end up with not the set of types and operators choice you'd intuitively expect, and it can be a very subtle error.

In order to assist in algebra diagnostics and control its development, QS supports algebra tag tracing:
```
QUADSUGAR
.useStaticTags({Vec2D})
.traceAlgebraTags("Vec2D")
.wrap(() => {
	// for example
	console.log(
		Vec2D `"2" * ${[1,0]} + "2"`
	);
}, (x) => eval(x));
```

will print you the detailed dump of the AST with resolved types for the successfully compiled expressions from the algebra tags you specified to trace, e. g.:
```
Agebra trace[Vec2D]: ...:x:x, compiles to AST
vec2d <- LEFT_BIN['*'](
 number <- CAST(
  string <- LIT('"2"'))
 ),
 vec2d <- PLACEHOLDER #1
)
```

<a name="_Av0YJqGU-8"></a>
#### Placeholder modes ####

Let's say, we now want to implement `+=` operator (and `=` on that account) for a vector. We can leverage `REF` feature and go this way:

```
...
	[
		...
		ct.leftBinOperator('+'). ... 
	], // the priority will be after binary +/-
	[
		ct.rightBinOperator('=').rhsArgType('vec2d').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => lhs.value = rhs),
		ct.rightBinOperator('+=').rhsArgType('vec2d').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => lhs.value = [lhs.value[0] + rhs[0], lhs.value[1] + rhs[1]])
	]
...
```

(note that for bin operators we can use just `.lhsArgType(lhsTypename)` and `.rhsArgType(rhsTypename)` instead of `.argTypes(lhsTypename, rhsTypename)` - unspecified types will be left as `dynamic`).

and then use it like this:
```
...
	var v;
	Vec2D `${REF(v)} = ${[1, 0]}`;
	Vec2D `${REF(v)} += ${[-1, 1]}`;
	console.log(v);
...
```

but this looks somewhat ugly. QS custom algebra allows to do this better by specifying an appropriate __placeholder mode__ for a placeholder cast of a certain type. Let's address this:
```
...
	[
		...
		ct.leftBinOperator('+'). ... 
	],
	// we'll use a type named 'vec2d_lvalue' for this...
	ct.placeholderCast('vec2d_lvalue').placeholderMode('REF_PIN'), // no need for evaluator here, but it could be present
	// now the actual operators...
	[
		ct.rightBinOperator('=').argTypes('vec2d_lvalue', 'vec2d').resultType('vec2d').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => lhs.value = rhs),
		ct.rightBinOperator('+=').argTypes('vec2d_lvalue', 'vec2d').resultType('vec2d').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => lhs.value = [lhs.value[0] + rhs[0], lhs.value[1] + rhs[1]])
	]
...
```

The `.placeholderMode(mode)` clause to `.placeholderCast` can specify the mode to treat the placeholder expression:
- `'VALUE'` (also default if `.placeholderMode` is not used): a usual value used as is,
- `'REF_PIN'`: a lvalue, is passed as if it was wrapped into `REF(..., PIN)` (or `REF(...)` if it is a single var expression),
- `'REF_BIND'`: a lvalue, is passed as if it was wrapped into `REF(..., BIND)` (or `REF(...)` if it is a single var expression).
Note that when we use a REF-mode, the value passed to the evaluator will be a reference (in QS terms), so you will have to get/set the actual value via `.value` property.

Now our expressions will look nicely:
```
...
	var v;
	Vec2D `${v} = ${[1, 0]}`;
	Vec2D `${v} += ${[-1, 1]}`;
	console.log(v);
	var v1;
	Vec2D `${v1} = ${v} += ${[-1, 1]}`; // and even chained like this, since =/+= result is a vec2d
	console.log(v1);
...
```

We can extend our operators to use `number_lvalue` as well:

```
...
	ct.placeholderCast('vec2d_lvalue').placeholderMode('REF_PIN'),
	ct.placeholderCast('number_lvalue').placeholderMode('REF_PIN'),
	[
		ct.rightBinOperator('=').argTypes('vec2d_lvalue', 'vec2d').resultType('vec2d').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => lhs.value = rhs),
		ct.rightBinOperator('+=').argTypes('vec2d_lvalue', 'vec2d').resultType('vec2d').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => lhs.value = [lhs.value[0] + rhs[0], lhs.value[1] + rhs[1]]),
		ct.rightBinOperator('=').argTypes('number_lvalue', 'number').resultType('number').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => lhs.value = rhs),
		ct.rightBinOperator('+=').argTypes('number_lvalue', 'number').resultType('number').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => lhs.value += rhs)
	]
...
```

although now we will have to use desambiguation for placeholder right hand side values:
```
...
	var v;
	Vec2D `${v} = ${[1, 0]} V`;
	console.log(v);
	var v1;
	Vec2D `${v1} = ${1} N`; // but would not need if it was `${v1} = 1`, as in our current algebra it would be number-type literal
	console.log(v1);
...
```

Finally, to show off both a more intricate example and a use of a bracket-type operator, let's enable addressing a vector by component...
```
...
	[
		...
		ct.postfixOperator('V').resultType('vec2d')
	],
	// we'll place this by priority between postfic N/V and unary minus...
	// remember that braces/brackets/parenthesis can only be left-bin operators
	ct.leftBinOperator('[]').argTypes('vec2d_lvalue', 'number').resultType('number_lvalue').evaluation('LHS_ARG', 'RHS_ARG',
		//(lhs, rhs) => REF(lhs.value[rhs]) // alas, we are defining this algebra outside a QUADSUGAR wrapping, so we can't leverage the REF sugar... working around this inconvenience is a small homework ;)
		// for now let's just do it by hand
		(lhs, rhs) => ({ get value() { return lhs.value[rhs]; }, set value(x) { lhs.value[rhs] = x; }})
		),
	// this one is for a rvalue component access, not necessary, but better to be consistent than to run into surprises
	ct.leftBinOperator('[]').argTypes('vec2d', 'number').resultType('number').evaluation('LHS_ARG', 'RHS_ARG',
			(lhs, rhs) => lhs[rhs]
			),
	[
		ct.prefixOperator('-').argType('vec2d'). ...
		...
	]
...
```

Now this works too:
```
	var v;
	Vec2D `${v} = ${[1, 0]} V`;
	Vec2D `${v}[1] = 3`;
	console.log(v);
```

Funny enough, it works even this way:
```
	var v;
	Vec2D `${v} = ${[1, 0]} V`;
	Vec2D `${v[1]} = 3`;
	console.log(v);
```
(but, of course, no magic here - this case works as a direct `number_lvalue` placeholder and no `[]` operator from our algebra is involved, you can see it in algebra trace mode.)

<a name="_Av0Be0yK-13"></a>
#### Lazy arguments ####

Let's say, we want a `&&` and `||` operators for vectors, where `null` or a `[0, 0]` vector is considered a false.

Update the algebra specs...
```
...
	[
		ct.leftBinOperator('&&').argTypes('vec2d', 'vec2d').resultType('vec2d').evaluation('LHS_ARG', 'RHS_ARG',
			(lhs, rhs) => !lhs || !(lhs[0] || lhs[1]) ? lhs : rhs),
		ct.leftBinOperator('||').argTypes('vec2d', 'vec2d').resultType('vec2d').evaluation('LHS_ARG', 'RHS_ARG',
			(lhs, rhs) => lhs && (lhs[0] || lhs[1]) ? lhs : rhs)
	], // place it at precedence level right before '='/'+='
	[
		ct.rightBinOperator('=').argTypes('vec2d_lvalue', 'vec2d').resultType('vec2d').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => lhs.value = rhs),
		...
	],
...
```

The code:
```
console.log(Vec2D `${[1, 0]}V || ${[0, 0]}V || ${[0, 1]}V`);
console.log(Vec2D `${[1, 0]}V && ${[0, 0]}V && ${[0, 1]}V`);
```
works, but there is something fishy about it. In real language, `&&`s and `||`s shortcut the evaluation on first false/true, and in our case the
evaluation is done faithfully on every operand. Can we fix it?

Actually we can: QS custom algebra supports lazy arguments for an operator that can evaluate on demand. Modify the declaration as follows...
```
...
	[
		ct.leftBinOperator('&&').argTypes('vec2d', 'vec2d').resultType('vec2d').evaluation('LHS_ARG_LAZY', 'RHS_ARG_LAZY',
			(lhs, rhs) => (lhs = lhs(), !lhs || !(lhs[0] || lhs[1]) ? lhs : rhs())),
		ct.leftBinOperator('||').argTypes('vec2d', 'vec2d').resultType('vec2d').evaluation('LHS_ARG_LAZY', 'RHS_ARG_LAZY',
			(lhs, rhs) => (lhs = lhs(), lhs && (lhs[0] || lhs[1]) ? lhs : rhs()))
	],
...
```
The difference you can see here is that we use `'LHS_ARG_LAZY'` and `'RHS_ARG_LAZY'` evaluator argument specifiers instead of `'LHS_ARG'` and `'RHS_ARG'`
respectively. Another difference is that an argument from `..._LAZY` conuterpart is not passed as a direct value, but instead as a callable that returns
that value. The evaluation of the whole operand (including its suboperations and subexpressions) will only be performed when you invoke it (be sure to do
this at most once, as there is no control against double calls).

Due to limitations of the underlying JS code, placeholder expressions that fall under lazy branches can not use `await` and `yield [*]` operators, so keep that
in mind.

Also, you can mix usage of lazy argument on one hand side and non-lazy argument on another one hand side (be careful on which of them is lazy and which is not,
and on which you need to use function call, and on which you don't). Thus, the above specification can be modified to be more concise:
```
...
	[
		ct.leftBinOperator('&&').argTypes('vec2d', 'vec2d').resultType('vec2d').evaluation('LHS_ARG', 'RHS_ARG_LAZY',
			(lhs, rhs) => !lhs || !(lhs[0] || lhs[1]) ? lhs : rhs()),
		ct.leftBinOperator('||').argTypes('vec2d', 'vec2d').resultType('vec2d').evaluation('LHS_ARG', 'RHS_ARG_LAZY',
			(lhs, rhs) => lhs && (lhs[0] || lhs[1]) ? lhs : rhs())
	],
...
```

For design consistency, a lazy argument is also supported on unary operators (`'ARG_LAZY'` argument specifier), but in most cases it makes little to no sense
to have a single lazy operand.

<a name="_Av0Be0yK-19"></a>
#### Context object ####

It is possible to introduce a __context object__ that will be created on each evaluation of the expression and shared by all the evaluators and other
callbacks. To do this, we need to declare a __context constructor__ in our algebra:

```
...
	ct.contextConstructor('VALUE_TYPE', (valType, userObject, label) => {
		console.log("Context ctor for type:", valType, "with label:", label);
		return userObject;
	}),
...
```

Arguments to the `contextConstructor` definition are much like for an evaluator, where the final argument is a __context constructor function__ to call, while the preceding
ones specify the argument to pass to it. For a context constructor, one of allowed argument specifiers is `'VALUE_TYPE'`, which it the statically deduced
typename of the whole expression.
Similarly to evaluator, the specified arguments are passed in the corresponding order, but they are just the leftmost minimum of the arguments that will
be passed to the constructor. The remaining arguments are taken from `(...)` following the algebra tag, if present. For example, we can now write the
following expression in our algebra:
```
console.log(Vec2D(new Object(), "label") `${[1, 0]}V || ${[0, 0]}V || ${[0, 1]}V`);
```

The context constructor will be invoked at start of the expression evaluation, and the value returned by it will be used as the context object. It can actually
be any value, even one of parameters passed to it returned straight away, like in our case.

How can we make use of the context object?

Let's say, we want to add functions evaluation to our expression, and the set of bound functions is to be passed in place as methods of an object, e. g.:
```
console.log(Vec2D({
	test(x, y) { return x + y }
}, "label") `test(1, 2)N * ${[1, 0]}`); // since the value from user function is dynamic, we'll need to use N to hint
```

It may look tricky, but look how it is possible:
Step 1.
```
...
	ct.typeCast('string'). ...
	// add this after typeCast('string') line
	ct.parseLiteral('id').isApplicable(strVal => {
		return !!strVal.match(/^[a-zA-Z_][a-zA-Z_0-9]*$/);
	}).evaluation('VALUE', strVal => {
		return strVal;
	}),
...
```
We introduce a new type `id`, which will be assigned to an identifier token in a literal position. Note that this way, to our implementing code, it will be
represented by a string.

Step 2.
```
...
	[
		ct.rightBinOperator('='). ...
		...
	],
	// place this after '='/'+=' operators
	[
		ct.leftBinOperator(',').argTypes('dynamic', 'dynamic').resultType('argslist').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => [lhs, rhs]),
		ct.leftBinOperator(',').argTypes('argslist', 'dynamic').resultType('argslist').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => (lhs.push(rhs), lhs)),
		//^ here we make use of the fact that array returned from previous arglist chain is created by previous ',' and was so far only passed to current ',',
		// so we can be sure we are its only owner at this point, so we can safely modify it inplace and return as the new value
		// we could play safer by creating new array, i. e. (lhs, rhs) => [...lhs, rhs], but this is unneeded here... and is an unrelated digression anyway
	]
...
```
We introduce a new type `arglist`, which is attributed to a list of at least two comma separated values, and is represented by an array.

Step 3.
```
...
	[
		ct.leftBinOperator('[]').argTypes('vec2d_lvalue', 'number').resultType('number_lvalue').evaluation('LHS_ARG', 'RHS_ARG',
			//(lhs, rhs) => REF(lhs.value[rhs])
			(lhs, rhs) => ({ get value() { return lhs.value[rhs]; }, set value(x) { lhs.value[rhs] = x; }})
			),
		// wrap a [] operator we've added earlier into brackets and add the following into this list...
		ct.leftBinOperator('()').argTypes('id', 'argslist').evaluation('LHS_ARG', 'RHS_ARG', 'CONTEXT',
			(lhs, rhs, context) => context[lhs](...rhs)),
		ct.leftBinOperator('()').argTypes('id', 'dynamic').evaluation('LHS_ARG', 'RHS_ARG', 'CONTEXT',
			(lhs, rhs, context) => context[lhs](rhs, 0)),
		ct.leftBinOperator('()').argTypes('id', 'void').evaluation('LHS_ARG', 'RHS_ARG', 'CONTEXT',
			(lhs, rhs, context) => context[lhs](0, 0))
	],
...
```
Here we added a `()` operator, in a number of versions, at same precedence level as `[]` operator from previous section. They will correspond to expressions
`id(val2,val2,...)`, `id(val)`, and `id()` respectively. (Note we avoided generalising `argslist` to single argument case - you can try some alternatives
and ensure that it is easier to keep simple.)

But most importantly, note the added `'CONTEXT'` argument specifier, and how it is used in the operator implementations. For all evaluators, value passed
for this argument will be the context object. In our case, according to our design, it is the one that contains our functions library. In general,
you can use it to store any related data or state you want to pass around the algebra evaluators of the expression.

Declaration of context constructor is mandatory if there is at least one declaration in algebra that make use of `'CONTEXT'` argument, but the QS custom
algebra implementation uses "don't pay for what you don't use" principle for a context object: if the expression contains no operations with evaluators that
use context argument, then no context object is not created, and the context constructor is not invoked. Be careful though, using algebra tag with non-empty
arguments list (i. e. ``Vec2D(...)`...` ``) is always counted as explicit usage of context constructor.

<a name="_Av0Be0yK-16"></a>
#### Post-evaluation ####

It is possible to specify a post-evaluation function to be applied to the overall expression result and possibly to post-process it.

```
...
	// anywhere at algebre top level...
	// for number and vec2d types, we return the value as is, with logging of the case
	ct.postEvaluation('number', 'vec2d').evaluation('VALUE', 'VALUE_TYPE', (val, valType) => {
		console.log("Post-evaluate on explicitly type " + valType + " - return as is");
		return val;
	}),
	// for all other types, we attempt to post-evaluate by passing the value to .eval method of the context object
	// if one exists, or just return the value as is if there is no such method
	ct.postEvaluation().evaluation('VALUE', 'VALUE_TYPE', 'CONTEXT', (val, valType, ctx) => {
		console.log("Calculating generic type " + valType + " via context.eval");
		return ctx && ctx.eval ? ctx.eval(val) : val;
	}),
...
```

`postEvaluation(...typenames)` definition takes a list of typenames to apply this post-evaluation to, and sets the evaluator to wrap the result of the
expression. The value returned by the evaluator will be used as final result of the evaluated expression.

If no typenames are specified, it is treated the same as specification of a single `dynamic` type. The post-evaluator for `dynamic` type, if specified,
will be used as default for a type that has no explicitly assigned post-evaluator.

Additionally, it is possible to set a mode for a post-evaluator, e. g.:
```
...
	ct.postEvaluation('argslist').mode('YIELD*').evaluation('VALUE', function *evaluator(val) {
		for (var item of val) yield (item);
	}),
	ct.postEvaluation('void').mode('ERROR'),
...
```

The modes are:
- `'NORMAL'`: the expression is just wrapped into the evaluator invocation, and it is the expression result.
- `'YIELD'`:
- `'YIELD*'` (no space before `*`!): the evaluator invocation is additionally wrapped into `yield`/`yield *` operator, respectively, and it is the expression result. (Only makes
possible to use expressions that match this post-evaluation in generator functions.)
- `'AWAIT'`: the evaluator invocation is additionally wrapped into `yield`/`yield *` operator, respectively, and it is the expression result. (Only makes
possible to use expressions that match this post-evaluation in async functions.)
- `'ERROR'`: a syntax error is generated when compiling an expression that matches this post-evaluation, it will point at the expression start.
- `'NONE'`: the whole expression will be replaced with a `void null`. All expressions within its placeholders will be dropped from the code entirely. May be useful for implementing assert-type constructs.

With this, you can add some brevity if you are designing an algebra for expressions that will be only for use under `yield[*]`/`await` operators. For example,
the previous `arglist` post-evaluation can be used like this:
```
...
	function *enumerateTestArgslist() {
		Vec2D `1, 2`; // under the hood, it ends up as: yield *(evaluator([1, 2]))
		// (and you will only be able to use Vec2D expression that evaluates to arglist this way)
	}

	for (var item of enumerateTestArgslist()) console.log(item);
...
```

An `'ERROR'` can be used to indicate a disallowed expression result, although the error message will be somewhat generic.

Post-evaluation can be used for a variety of purposes:
- converting a value from an interim representation into API-facing representation,
- release a resource allocated in context constructor (but it is a bit unsafe, as post-evaluation will not be run on a throw propagation; if you intend on
such usage then be sure to back up with an emergency finalization),
- levaraging the post-evaluation modes for a nicer syntax,
- etc.

<a name="_Av0Be0yK-22"></a>
#### Occurrence tag object ####

Occurrence tag is somewhat similar to context object, but it exists statically and is always the same (by reference) for all evaluations of an expression
at a particular code location.

```
var nVec2DExprs = 0; // add this before Vec2D algebra creation
var Vec2D = QUADSUGAR.staticAlgebraTag((ct) => [
...
	// replace the context constructor with the following implementation
	ct.contextConstructor('VALUE_TYPE', 'OCCURRENCE_TAG', (valType, occTag, userObject) => {
		if (!occTag.index) occTag.index = ++nVec2DExprs;
		console.log("Vec2D expression with context #", occTag.index, " evaluates to type ", valType);
		return userObject;
	}),
...
```

The occurrence tag is accessible to an evaluator via `'OCCURENCE_TAG'` argument specifier. You don't need to specifically create it - it is created statically
for each expression that involves an evaluation that needs it, and is initially an empty object (as per `new Object()` expression), but you can populate it
with any data from the evaluators, keeping in mind that the object persists between the evaluations.

<a name="_Av0YJqGU-11"></a>
#### Summary on evaluator argument specifiers ####

A quick recap summary on the argument specifierss that you can pass to evaluators.

<table>
<tr><th>Argument Specifier</th><th>Applicable To Evaluators In...</th><th>Value Passed</th></tr>
<tr>
<td>

`'ARG'`

</td>
<td>

- `prefixOperator`, `postfixOperator`
</td>
<td>

Input value for the unary operator's operand

</td>
</tr>

<tr>
<td>

`'ARG_LAZY'`

</td>
<td>

- `prefixOperator`, `postfixOperator`
</td>
<td>

Input value for the unary operator's operand, passed in a lazy manner (as wrapper function with no arguments which has to be invoked for the evaluation
to occur, and that returns the operand's evaluated value)

</td>
</tr>

<tr>
<td>

`'LHS_ARG'`, `'RHS_ARG'`

</td>
<td>

- `leftBinOperator`, `rightBinOperator`
</td>
<td>

Input values for the binary operator's operands, left and right hand sides, respectively

</td>
</tr>

<tr>
<td>

`'LHS_ARG_LAZY'`, `'RHS_ARG_LAZY'`

</td>
<td>

- `leftBinOperator`, `rightBinOperator`
</td>
<td>

Input values for the binary operator's operands, left and right hand sides, respectively, passed in a lazy manner (as wrapper function with no arguments which
has to be invoked for the evaluation to occur, and that returns the operand's evaluated value)

</td>
</tr>

<tr>
<td>

`'VALUE'`

</td>
<td>

- `typeCast`
- `placeholderCast`
- `parseLiteral`
- `postEvaluation`
</td>
<td>

Input value for the cast operation, or the evaluated expression value for post-evaluator, or input token string (verbatim) for literal parser.
For all evaluators where `'VALUE'` specifier is applicable, it is mandatory (must be one of the arguments to the evaluator).

</td>
</tr>

<tr>
<td>

`'VALUE_TYPE'`

</td>
<td>

- `contextConstructor(...)`
- `postEvaluation`
</td>
<td>

Typename statically deduced for the expression, a string

</td>
</tr>

<tr>
<td>

`'OPERATOR'`

</td>
<td>

- `prefixOperator`, `postfixOperator`
- `leftBinOperator`, `rightBinOperator`
</td>
<td>

The operator token as string (verbatim), useful if several operators are implemented via a single evaluator

</td>
</tr>

<tr>
<td>

`'CONTEXT'`

</td>
<td>

- all, except `contextConstructor(...)`
</td>
<td>

Context object value, as returned by the context constructor. A new object is created for each evaluation of the expression where any operations using `'CONTEXT'`
argument specifier are involved.

</td>
</tr>

<tr>
<td>

`'OCCURRENCE_TAG'`

</td>
<td>

- all
</td>
<td>

Occurrence tag value, statically persistent and shared by all evaluations of the same expression occurrence in the code. Can be used to tag the expression.

</td>
</tr>
</table>

<a name="_Av1lOlMA-4"></a>
#### Custom algebra example sum-up ####

The complete algebra specification from our example after following all of the above sections looks like this:

```
var nVec2DExprs = 0;
var Vec2D = QUADSUGAR.staticAlgebraTag((ct) => [
	ct.contextConstructor('VALUE_TYPE', 'OCCURRENCE_TAG', (valType, occTag, userObject) => {
		if (!occTag.index) occTag.index = ++nVec2DExprs;
		console.log("Vec2D expression with context #", occTag.index, " evaluates to type ", valType);
		return userObject;
	}),
	ct.placeholderCast('number').evaluation('VALUE', p => (console.log("Number placeholder used"), +p)),
	ct.placeholderCast('vec2d'),
	ct.parseLiteral('number').isApplicable(strVal => {
		return !Number.isNaN(parseInt(strVal));
	}).evaluation('VALUE', strVal => {
		return parseInt(strVal);
	}),

	ct.parseLiteral('string').isApplicable(strVal => {
		return strVal.startsWith('"');
	}).evaluation('VALUE', strVal => {
		return JSON.parse(strVal);
	}),
	ct.typeCast('string').to('number').evaluation('VALUE', str => +str),

	ct.parseLiteral('id').isApplicable(strVal => {
		return !!strVal.match(/^[a-zA-Z_][a-zA-Z_0-9]*$/);
	}).evaluation('VALUE', strVal => {
		return strVal;
	}),

	[
		ct.postfixOperator('N').argType('dynamic').resultType('number'),
		ct.postfixOperator('N').argType('number').resultType('number'),
		ct.postfixOperator('N').argType('number_lvalue').resultType('number').evaluation('ARG', v => v.value),
		ct.postfixOperator('V').resultType('vec2d')
	],
	[
		ct.leftBinOperator('[]').argTypes('vec2d_lvalue', 'number').resultType('number_lvalue').evaluation('LHS_ARG', 'RHS_ARG',
			//(lhs, rhs) => REF(lhs.value[rhs])
			(lhs, rhs) => ({ get value() { return lhs.value[rhs]; }, set value(x) { lhs.value[rhs] = x; }})
			),
		ct.leftBinOperator('[]').argTypes('vec2d', 'number').resultType('number').evaluation('LHS_ARG', 'RHS_ARG',
			(lhs, rhs) => lhs[rhs]
			),
		ct.leftBinOperator('()').argTypes('id', 'argslist').evaluation('LHS_ARG', 'RHS_ARG', 'CONTEXT',
			(lhs, rhs, context) => context[lhs](...rhs)),
		ct.leftBinOperator('()').argTypes('id', 'dynamic').evaluation('LHS_ARG', 'RHS_ARG', 'CONTEXT',
			(lhs, rhs, context) => context[lhs](rhs, 0)),
		ct.leftBinOperator('()').argTypes('id', 'void').evaluation('LHS_ARG', 'RHS_ARG', 'CONTEXT',
			(lhs, rhs, context) => context[lhs](0, 0))
	],
	[
		ct.prefixOperator('-').argType('vec2d').resultType('vec2d').evaluation('ARG', arg => [-arg[0], -arg[1]]),
		ct.prefixOperator('-').argType('number').resultType('number').evaluation('ARG', arg => -arg),
	],
	ct.leftBinOperator('*').argTypes('number', 'vec2d').resultType('vec2d').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => [lhs * rhs[0], lhs * rhs[1]]),
	[
		ct.leftBinOperator('-').argTypes('vec2d', 'vec2d').resultType('vec2d').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => [lhs[0] - rhs[0], lhs[1] - rhs[1]]),
		ct.leftBinOperator('+').argTypes('vec2d', 'vec2d').resultType('vec2d').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => [lhs[0] + rhs[0], lhs[1] + rhs[1]])
	],

	ct.placeholderCast('vec2d_lvalue').placeholderMode('REF_PIN'),
	ct.placeholderCast('number_lvalue').placeholderMode('REF_PIN'),
	ct.typeCast('number_lvalue').to('number').evaluation('VALUE', v => v.value),
	ct.typeCast('vec2d_lvalue').to('vec2d').evaluation('VALUE', v => v.value),
	[
		ct.leftBinOperator('&&').argTypes('vec2d', 'vec2d').resultType('vec2d').evaluation('LHS_ARG', 'RHS_ARG_LAZY',
			(lhs, rhs) => !lhs || !(lhs[0] || lhs[1]) ? lhs : rhs()),
		ct.leftBinOperator('||').argTypes('vec2d', 'vec2d').resultType('vec2d').evaluation('LHS_ARG', 'RHS_ARG_LAZY',
			(lhs, rhs) => lhs && (lhs[0] || lhs[1]) ? lhs : rhs())
	],
	[
		ct.rightBinOperator('=').argTypes('vec2d_lvalue', 'vec2d').resultType('vec2d').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => lhs.value = rhs),
		ct.rightBinOperator('+=').argTypes('vec2d_lvalue', 'vec2d').resultType('vec2d').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => lhs.value = [lhs.value[0] + rhs[0], lhs.value[1] + rhs[1]]),
		ct.rightBinOperator('=').argTypes('number_lvalue', 'number').resultType('number').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => lhs.value = rhs),
		ct.rightBinOperator('+=').argTypes('number_lvalue', 'number').resultType('number').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => lhs.value += rhs)
	],
	[
		ct.leftBinOperator(',').argTypes('dynamic', 'dynamic').resultType('argslist').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => [lhs, rhs]),
		ct.leftBinOperator(',').argTypes('argslist', 'dynamic').resultType('argslist').evaluation('LHS_ARG', 'RHS_ARG', (lhs, rhs) => (lhs.push(rhs), lhs)),
	],

	ct.postEvaluation('number', 'vec2d').evaluation('VALUE', 'VALUE_TYPE', (val, valType) => {
		console.log("Post-evaluate on explicitly type " + valType + " - return as is");
		return val;
	}),
	ct.postEvaluation().evaluation('VALUE', 'VALUE_TYPE', 'CONTEXT', (val, valType, ctx) => {
		console.log("Calculating generic type " + valType + " via context.eval");
		return ctx && ctx.eval ? ctx.eval(val) : val;
	}),
	ct.postEvaluation('argslist').mode('YIELD*').evaluation('VALUE', function *evaluator(val) {
		for (var item of val) yield (item);
	}),
	ct.postEvaluation('void').mode('ERROR'),
	
]);
```

And the test code that can use it might look like this:
```
QUADSUGAR
.useStaticTags({Vec2D})
.wrap(() => {
	console.log("Case 1");
	Vec2D `${v} = ${[1, 1]}V`;
	Vec2D `${v}[1] += 2`;

	console.log("Case 2");
	console.log(
		Vec2D `"2" * ${v}`,
		Vec2D `${[0, 1]}V + (-${3}N * ${[1, 0]}V)[${1}N] * ${[1,1]}V`,
		Vec2D `${[0, 1]}V + ${v}[${1}N] * ${[1,1]}V`
	);

	console.log("Case 3");
	console.log(Vec2D({ test() {} }, "label") `${[1, 0]}V || ${[0, 0]}V || ${[0, 1]}V`);

	console.log("Case 4");
	console.log(Vec2D({ test(x, y) { return x + y; } }, "label") `test(${2}N, 3)N * ${[1, 0]}`);

	console.log("Case 5");
	function *enumerateTestArgslist() {
		Vec2D({}) `1, 2`;
	}

	for (var item of enumerateTestArgslist()) console.log(item);

	console.log("Case 6");
	console.log(Vec2D({ test(x, y) { return x + y; } }, "label") `test()`);
}, (x) => eval(x));
```

At a glance, it looks very like plain JS tagged template strings, both in look and in the logic (except for placeholder and post-evaluation modes, which are not possible in plain JS). But, if you manage
to take a look into the preprocessed code, it is translated to something very different (code beautified and enabled with comments for clarity):
```
((__QS_0) => {
    const __QS_3 = __QS_0.staticTagProcessors.Vec2D.functionShortcuts;
    const __QS_4 = __QS_3[26]; /* Vec2D: RIGHT_BIN '=' (vec2d_lvalue, vec2d) -> vec2d */
    const __QS_5 = __QS_0.staticTagProcessors.Vec2D.contextConstructorFunc;
    const __QS_6 = new Object(); /* Vec2D: occurrence tag for 160:2 */
    const __QS_7 = __QS_3[32]; /* Vec2D: post-evaluator on number,vec2d */
    const __QS_8 = __QS_3[2]; /* Vec2D: literal -> number */
    const __QS_9 = __QS_8(
        "1"); /* Vec2D: idempotent lit val */
    const __QS_10 = __QS_3[10]; /* Vec2D: LEFT_BIN '[]' (vec2d_lvalue, number) -> number_lvalue */
    const __QS_11 = __QS_8("2"); /* Vec2D: idempotent lit val */
    const __QS_12 = __QS_3[29]; /* Vec2D: RIGHT_BIN '+=' (number_lvalue, number) -> number */
    const __QS_13 = new Object(); /* Vec2D: occurrence tag for 161:2 */
    const __QS_14 = __QS_3[3]; /* Vec2D: literal -> string */
    const __QS_15 = __QS_14(
        "\"2\""); /* Vec2D: idempotent lit val */
    const __QS_16 = __QS_3[4]; /* Vec2D: cast (string) -> number */
    const __QS_17 = __QS_3[17]; /* Vec2D: LEFT_BIN '*' (number, vec2d) -> vec2d */
    const __QS_18 = new Object(); /* Vec2D: occurrence tag for 165:3 */
    const __QS_19 = __QS_3[0]; /* Vec2D: placeholder -> number */
    const __QS_20 = __QS_3[16]; /* Vec2D: PREFIX '-' (number) -> number */
    const __QS_21 = __QS_3[11]; /* Vec2D: LEFT_BIN '[]' (vec2d, number) -> number */
    const __QS_22 = __QS_3[19]; /* Vec2D: LEFT_BIN '+' (vec2d, vec2d) -> vec2d */
    const __QS_23 = new Object(); /* Vec2D: occurrence tag for 166:3 */
    const __QS_24 = new Object(); /* Vec2D: occurrence tag for 167:3 */
    const __QS_25 = __QS_3[25]; /* Vec2D: LEFT_BIN '||' (vec2d, vec2d) -> vec2d */
    const __QS_26 = new Object(); /* Vec2D: occurrence tag for 171:14 */
    const __QS_27 = __QS_3[5]; /* Vec2D: literal -> id */
    const __QS_28 = __QS_27(
        "test"); /* Vec2D: idempotent lit val */
    const __QS_29 = __QS_8("3"); /* Vec2D: idempotent lit val */
    const __QS_30 = __QS_3[30]; /* Vec2D: LEFT_BIN ',' (dynamic, dynamic) -> argslist */
    const __QS_31 = __QS_3[12]; /* Vec2D: LEFT_BIN '()' (id, argslist) -> dynamic */
    const __QS_32 = new Object(); /* Vec2D: occurrence tag for 174:14 */
    const __QS_33 = new Object(); /* Vec2D: occurrence tag for 178:3 */
    const __QS_34 = __QS_3[34]; /* Vec2D: post-evaluator on argslist */
    const __QS_35 = __QS_3[14]; /* Vec2D: LEFT_BIN '()' (id, void) -> dynamic */
    const __QS_36 = new Object(); /* Vec2D: occurrence tag for 184:14 */
    const __QS_37 = __QS_3[33]; /* Vec2D: post-evaluator on dynamic */
    {
        let __QS_1;
        console.log("Case 1"); /* Vec2D 160:2 */
        (
            __QS_7(__QS_4((({
                get value() {
                    return v;
                },
                set value(__QS_2) {
                    v = __QS_2;
                }
            })), ([1, 1])), "vec2d")); /* Vec2D 161:2 */
        (
            __QS_7(__QS_12(__QS_10((({
                get value() {
                    return v;
                },
                set value(__QS_2) {
                    v = __QS_2;
                }
            })), __QS_9), __QS_11), "number"));
        console.log("Case 2");
        console.log( /* Vec2D 165:3 */ (
            __QS_7(__QS_17(__QS_16(__QS_15), (v)), "vec2d")), /* Vec2D 166:3 */ (
            __QS_7(__QS_22(([0, 1]), __QS_17(__QS_21(__QS_17(__QS_20(__QS_19(3)), ([1, 0])), __QS_19(1)), ([
                1, 1
            ]))), "vec2d")), /* Vec2D 167:3 */ (
            __QS_7(__QS_22(([0, 1]), __QS_17(__QS_21((v), __QS_19(1)), ([1, 1]))), "vec2d")));
        console.log("Case 3");
        console.log( /* Vec2D 171:14 */ (__QS_1 = __QS_5("vec2d", __QS_26, {
            test() {}
        }, "label"), __QS_7(__QS_25(__QS_25(([1, 0]), () => (([0, 0]))), () => (([0, 1]))), "vec2d")));
        console.log("Case 4");
        console.log( /* Vec2D 174:14 */ (__QS_1 = __QS_5("vec2d", __QS_32, {
            test(x, y) {
                return x + y;
            }
        }, "label"), __QS_7(__QS_17(__QS_31(__QS_28, __QS_30(__QS_19(2), __QS_29), __QS_1), ([1, 0])),
            "vec2d")));
        console.log("Case 5");

        function* enumerateTestArgslist() {
            let __QS_1; /* Vec2D 178:3 */
            (
                yield*(__QS_1 = __QS_5("argslist", __QS_33, {}), __QS_34(__QS_30(__QS_9, __QS_11))));
        }
        for (var item of enumerateTestArgslist()) console.log(item);
        console.log("Case 6");
        console.log( /* Vec2D 184:14 */ (__QS_1 = __QS_5("dynamic", __QS_36, {
            test(x, y) {
                return x + y;
            }
        }, "label"), __QS_37(__QS_35(__QS_28, (void 0), __QS_1), "dynamic", __QS_1)));
    }
});
```
So, as you can see, the custom algebra expressions are translated to as efficient inline code as reasonably possible.

<a name="_Av1urGT0-1"></a>
### Simple static tag processors ###

If QS custom algebra does not provide you enough flexibility (or, conversely, it looks like an overkill), there is an alternative tool that can be used under the static tag umbrella -
a __simple static tag processors__. It allows you to handle the template strings in a manner much closer to how it is done in plain JS, with the difference that you do it in a compile-time context
and have a different way to control the things.

Declaration and use of a simple static tag processor is done in a following way:
```
var SimpleTag = QUADSUGAR.staticSimpleTag(function evaluatorFactory(ct, strings) {
	...
	return function evaluate(evalArgs, placeholderArgs) {
		// depending on your design, can also be function * or async function
		...
	};
});
...
// the usage follows the same interface as for static algebra tag
QUADSUGAR
.useStaticTags({SimpleTag})
.wrap(() => {
	SimpleTag`blahblahblah ${"placeholder value"} blahblahblah`;
});
```

Argument to `.simpleStaticTag(...)` is a __simple tag evaluator factory__, a function that takes the following arguments, in the order:
- `strings` (array of string): constant fragments of the string template,
- `ct`: construction toolkit (see below).

`strings` is the same as you would get as first argument in tag processor of a plain JS (`["string before placeholder #1", "string b/w placeholders #1 and #2", ..., "string after last placeholder"]`,
always exactly one element greater than the number of placeholders). But, unlike in plain JS, the evaluator factory runs in a compile-time context, so you don't have access to the actual placeholder
values. Instead, the tag evaluator factory must return a __tag evaluator__ - function that will take in the following arguments, in the order:
- `evalArgs` (array of values): when you invoke the tag in a form with arguments (``SimpleTag(arg1, arg2, ...) `...` ``), it is the array of argument values (`arg1`, `arg2`, etc.), or empty in case
of ``SimpleTag() `...` `` or ``SimpleTag `...` ``.
- `placeholderArgs`: array of the placeholder values - the placeholder values of the actual evaluation, in the order of them in the expression. The values of this array can be affected by
__placeholder modes__ set by the factory - see below for details.

A placeholder factory will be invoked ahead, exactly once per each occurrence of an expression with the `SimpleTag` (you can use this fact to tag the occurrences), the evaluator function returned
for each expression will be cached, and then be called each time the code hits this expression - the value it returns will be taken as the evaluation result.

The constructor toolkit `ct` allows you to do some additional adjustments to how the expression and its placeholders are evaluated. It provides the following methods:
- `ct.setEvaluationMode(mode)`: set the evaluation mode for this expression. `mode` can be either of:
  - `'NORMAL'` (also default it you don't invoke this method): the expression evaluation is just the value returned by the evaluator function,
  - `'YIELD'`:
  - `'YIELD*'` (no space before `*`!): the expression value is the result of `yield`/`yield *` (respectively) operator applied to value returned by the evaluator function, such expression will only
  be valid inside a generator,
  - `'AWAIT'`: the expression value is the result of `await` operator applied to value returned by the evaluator function, such expression will only be valid inside an async function,
  - `'ERROR'`: compile-time error will be generated for this expression, pointing at its start (but the evaluator factory has to finish first). The error message will be quite generic, so it makes sense
  for the evaluator factory to print an additional elaboration message before returning.
  - `'NONE'`: the whole expression will be replaced with `void null`. All expressions within its placeholders will be dropped from the code entirely. May be useful for implementing assert-type constructs.

- `ct.setPlaceholderArgMode(placeholderIndex, mode)`: set the interpretation mode of a placeholder argument with given `placeholderIndex` (0-based, remember the number of placeholders is 1 less than of
elements in `strings`, and they are enumerated in order of occurrence in the expression). The mode determines what value will actually get for that placeholder's element in the `placeholderArgs` array
argument of the evaluator.
`mode` can be either of:
  - `'VALUE'`: the value of placeholder is passed as is,
  - `'LAZY'`, or `'VALUE LAZY'` (note at least one space between the words): placeholder expression is not evaluated immediately, instead a callable no-argument function is passed for this placeholder,
  and the evaluator will have to call it to actually evaluate the expression and get its value,
  - `'REF_BIND'`: placeholder expression is treated as lvalue, and a bind-type reference object is passed to it - evaluator can access the referenced value via its `.value` property.
  - `'REF_PIN'`: similarly to `'REF_BIND'`, but a pin-type reference is used.
  - `'REF_PIN LAZY'`: lazy version of `'REF_PIN'`, the passed value is a function that evaluator must call, it will evaluate the lvalue and return the reference object with `.value` property to access
  the referenced value. `LAZY` option can only be combined with `REF_PIN`, but not with `REF_BIND`.

Due to limitations of the underlying JS code, placeholder expressions for which you set any version of lazy mode can not use `await` and `yield [*]` operators, so keep that in mind.

An example of simple static tag declaration and its usage:
```
var SimpleTag = QUADSUGAR.staticSimpleTag((ct, strings) => {
	// StaticTag `set ${var} = ${value}`
	if (strings.length === 3 && strings[0].trim().toLowerCase() === 'set' &&
		strings[1].trim() === '=' && strings[2].trim() === '') {
		ct.setPlaceholderArgMode(0, 'REF_PIN');
		return function evaluateSet(tagArgs, placeholderArgs) {
			return (placeholderArgs[0].value = placeholderArgs[1]);
		};
	}

	// StaticTag `if ${var} then ${value1} else ${value2}` (only expression on the matching branch is evaluated)
	if (strings.length === 4 && strings[0].trim().toLowerCase() === 'if' &&
		strings[1].trim().toLowerCase() === 'then' && strings[2].trim().toLowerCase() === 'else' &&
		strings[3].trim() === '') {
		ct.setPlaceholderArgMode(1, 'LAZY');
		ct.setPlaceholderArgMode(2, 'LAZY');
		return function evaluateIfThenElse(tagArgs, placeholderArgs) {
			return placeholderArgs[0] ? placeholderArgs[1]() : placeholderArgs[2]();
		};
	}

	// StatigTag(...args) `enumerate*` (for use in generator)
	if (strings.length === 1 && strings[0].trim().toLowerCase() === 'enumerate*') {
		ct.setEvaluationMode('YIELD*');
		return function *evaluateEnumerateStar(tagArgs, placeholderArgs) {
			for (var val of tagArgs) yield val;
		};
	}

	console.error("Unrecognized SimpleTag expression `" + strings.join("${}") + "`");
	ct.setEvaluationMode('ERROR');
});

QUADSUGAR
.useStaticTags({SimpleTag})
.wrap(() => {
	var v;

	console.log("Case 1");
	SimpleTag `set ${v} = ${10}`;
	console.log(v);

	console.log("Case 2");
	console.log(SimpleTag `if ${true} then ${ console.log("TRUE"), 1 } else ${ console.log("FALSE"), 2 }`);

	console.log("Case 3");
	function *enumerateTest() {
		SimpleTag('a', 'b', 'c') `enumerate*`;
	}
	for (var v of enumerateTest()) console.log(v);
}
```

<a name="_Av0YJqGU-17"></a>
## Quadsugar configuration ##

Quadsugar wrapper is configurable.

You already encountered this via `.useStaticTags(...)` and `.traceAlgebraTags(...)` clauses of the static tempate tag usage examples. But there are more options, all of which are specified
in the "builder pattern" style. The complete list is:
```
QUADSUGAR
[.useStaticTags({ ...tagsDictionary })]
[.useKeywordOverrides({ ...keywordsDictionary })]
[.useInternalPrefix({ ...keywordsDictionary })]
[.traceAlgebraTags(...tagsList)]
[.generateSourceMaps(bool)]
[.generateComments(bool)]
[.useProfilingWithLabel(string)]
[.useSyncCache(cache)]
[.useAsyncCache(cache)]
[.disableCacheHit(bool)]
.wrap(() => { ...wrapped code...})
```

The configuration is not global and only applied to this particular wrapped code. You can, however, assign a prepared configuration context to a value and use it to wrap multiple code snippets:

```
const QSCfg = QUADSUGAR
.useStaticTags({ ... })
.generateComments(true);

...
QSCfg.wrap(() => {
	...wrapped code 1...
});
...
QSCfg.wrap(() => {
	...wrapped code 2...
});
...
```

It is possible to construct a configuration context object "in parts":

```
const QSCfg = QUADSUGAR
.useStaticTags({ ... }); // at least one clause is required to instantiate the configuration context object

if (USE_COMMENTS) {
	QSCfg.generateComments(true);
}

if (USE_PROFILING) {
	QSCfg.useProfilingWithLabel("MyProfilingLabel");
}
...
QSCfg.wrap(...);
```

but it is strictly recommended to do all of these parts in a single code place, for sake of consistency and readability. Once prepared, the configuration object should be considered as frozen.
To enforce this, it is actually frozen after first wrap that uses it, and any modification attempted to it afterwards will cause an error. If you need a modified configuration based off some existing one,
use `QUADSUGAR.copyConfig(configObject)` method:

```
const QSCfg2 = QUADSUGAR.copyConfig(QSCfg)
.generateComments(false);

// or, again, modify it in parts
QSCfg2.useStaticTags({ ...more static tags... });
...
QSCfg2.wrap(...);
...
QSCfg.wrap(...); // and old configuration can still be used, too
```

Now, what does each of the configuration options do...

__Enabling static tags__

Provide the static tags you will be able to use in this wrapped code, as dictionary `tag => tagDeclarationObject`.
```
QUADSUGAR
.useStaticTags({
	Tag1: tag1DeclarationObject,
	Tag2: tag2DeclarationObject,
	...
}).wrap(() => {
	Tag1 `...`;
	Tag2 `...`;
	...
});
```

Tag declaration objects must be created in advance using `QUADSUGAR.staticAlgebraTag` and/or `QUADSUGAR.staticSimpleTag` methods (see `Static template tags`[>>](#_Av0jwSYX-10)).

If multiple `.useStaticTags` clauses are used on the same configuration object, the tags from each clause are added up, as if it was a single merged dictionary. In case of a confliciting tag, the tag
from the latest clause is in effect.

## Keyword overriding

QS allows to change the keywords it uses in the wrapped code, although this is not recommended just for vanity - it is a feature meant to deal with emergency cases when QS keywords are in collision with
names from some 3rd party middleware.
```
QUADSUGAR
.useKeywordOverrides({
	STATIC: "_static",
	SCOPE: "_scope"
}).wrap(() => {
	_scope: Module;
	...
	console.log(_static[Module](factorial(6)));
	...
});
```

You can override any (sub)set of the keywords used by QS: `TRY`, `THROW`, `CATCH`, `FINALLY`, `SCOPE`, `STATIC`, `PRECALC`, `REF`, `BIND`, `PIN`, `DEFINED`. The overriding keywords must be valid JS identifiers,
must be different from each other, and must not match any of JS's own keywords.

## Changing internal variable prefix

Code generated by QS uses numerous internal variables and constants with "private" names, but, due to JS syntax limitations, they are not actually private and may theoretically collide with a poorly chosen
identifier. QS allows to address such cases by changing the prefix used by its internal identifiers. By default, it is `__QS_` (which should already be unique enough, but just in case).
```
QUADSUGAR
.useInternalPrefix("__custom_QS$")
.wrap(() => {
...
});
```

The prefix should be a valid JS identifier.

__Algebra tags tracing__

Enable additional logs with ASTs for static algebra tag expressions, useful for debugging the custom algebras. The traces are enabled on per-tag basis.
```
QUADSUGAR
.useStaticTags({
	Algebra1: algebraTag1,
	Algebra2: algebraTag2,
	...
})
.traceAlgebraTags("Algebra1", "Algebra2", ...)
wrap(() => {
	var a1 = Algebra1 `...`;
	var a2 = Algebra2 `...`;
	...
});
```
By default, all traces are disabled, it is only possible to enable them, and lists from several `.traceAlgebraTags(...)` combine, so be careful on this when copying configurations.

`.traceAlgebraTags` only affects algebra tags (ones created with `QUADSUGAR.staticAlgebraTag`), not simple tags (`QUADSUGAR.staticSimpleTag`).

## Source maps generation control

By default, QS generates code with embedded source maps. This is by the way the reason why it is recommended to fit `wrap(() => {` on one line: QS uses the stack trace to determine the location of the
wrapped code - it is tested to work at least in Firefox (SpiderMonkey) and Chrome/Chromium/Node.JS (V8) JS engines, although Node.JS unfortunately can not make use of the maps.
The source maps usually don't hurt, but if for some reason you want do strip them out, you can do so by the option:
```
QUADSUGAR
.generateSourceMaps(bool)
...
```
Pass `false` argument to disable the source maps for this wrapping, `true` to enable it (for example if you base off a config copy where it is disabled and want it back).

## Comments generation control

QS can add some comments about the generated code to facilitate disassembling it, should you want to do such an excercise for some reason. For example, this option has been used in generation of sample
for `sum-up`.
```
QUADSUGAR
.generateComments(bool)
...
```
Set to `true` to enable this feature, `false` (also by default) to disable it.

## Profiling control

QS allows to enable profiling of preprocessing the wrapped code, by adding `console.time(label)...console.timeEnd(label)` around the code preparation.
```
QUADSUGAR
.useProfilingWithLabel(string)
...
```
where the argument is the label to use in `console.time`.

The profiling only applies to QS preprocessing of the code, not the code running itself (if you need the latter, you can add it to the code itself).

## Cache control

`.useSyncCache` and `.useAsyncCache` can enable one of two QS caching strategies, with `.disableCacheHit` as an additional control valve.
Caching is a separate complex subject that will be discussed in its own section.

<a name="_Av0YJqGU-20"></a>
### Compiled code caching ###

QS tries into performance. Nevertheless, you should realize that its pipeline assumes triple overhead:
- initial compilation of the wrapped code by JS,
- QS preprocessing,
- re-compilation of the preprocessed code by JS.

If amount of the wrapped code is small, it doesn't matter much. But, if you are counting megabytes or even tens of them (yes, we are counting big), the accumulated delay can become a nuisance, especially
when using an edit-refresh turnaround development cycle.

You can reduce the first part of overhead to some degree by wrapping the wrapped code into `/* QS-SCREEN` comment:
```
QUADSUGAR.wrap(() => {
	/*** QS-SCREEN
	...wrapped code...
	// there can be any number of asterisks and whitespaces in front of QS-SCREEN (QS-SCREEN itself is case sensitive,
	// and must be typed as is), and any number of whitespaces before the comment opener,
	// but make sure this opener is the only content on that line, and that it is the first non-blank line
	// after the code's initial '{'
	*/
});
```
but it will only address one third of the problem. Also, it is only recommended to use it only at the very end, when your code is complete and correct: one of assumptions QS relies on is that the code
to preprocess passes JS compilation, it allows to reduce amount and complexity of checks inside QS itself - but, when the code is comment-wrapped, this assumption no longer holds, so cryptic failures and
subtle inconsistencies become possible if the code gets syntactically incorrect.

And, in any case, the QS preprocessing stage is typically the most time-expensive.

In traditional add-ons on top of JS, like TS, CoffeeScript, JSX/React.JS/Svelte etc., the compilation time problem is usually addressed by concocting a pipeline that creates and stores precompiled files,
which are then incorporated into the final artifact statically or on the fly. QS does not offer out-of-the-box-ready solution like this, one of the reasons being that its own pipeline design assumes direct
interaction with the actual runtime. Instead, it offers two strategies for caching compiled code, and provides several built-in cache implementations.

In the overview, the approach looks like this:

Step 1. Create a cache object and perform its implementation specific initialization, if any:
```
const qsCache = ...; // for example one of QS built-in caches, see below
```

Step 2. Enable the appropriate caching strategy and pass the cache object:
```
QUADSUGAR
.useSyncCache(qsCache) // for sync cache
//.useAsyncCache(qsCache) // or, for async cache
.wrap(() => {
...
});
...
// at some later point, if using async cache:
//qsCache.commit().then(() => console.log("Wrapped code finished!"));
```

Step 3. After no more QS wraps using this cache object remain to be done, perform implementation specific of cache object, if any.

Different wrapped code fragments can use different caches and caching strategies, so the resulting flow can become somewhat complicated - try to avoid bestiary of caches whenever possible.

Caching can drastically decrease QS preprocessing overhead on repeated reloads of unchanged code, so keeping your wrapped code fragments reasonably granular makes sense in both development and operation phase:
the less code has to be preprocessed on an update, the faster the turnaround will be.

<a name="_Av1Csx6x-3"></a>
#### Caching strategies ####

There are two possible caching strategies:
- *Synchronous*. The cache operates in synchronous manner, so operation of the wrapping code is much like without one: preprocessing and execution of the wrapped code occurs synchronously inside
`QUADSUGAR.wrap`, and the code following it immediately has access to the results and effects. Unfortunately, there are very limited methods that can be used to implement a cache in synchronous manner,
so in many cases this luxury may be not affordable.
- *Asynchronous*. The cache operates in asynchronous manner, so the operation flow is more complex. Preprocessing and execution of the wrapped code do not occur immediately. Instead, at some later point,
you will have to invoke `.commit()` method of the cache object, which will perform the preprocessing and execution of the enqueued wraps - asynchronously, but guaranteeing running them in turn and in the order
they were `.wrap`-d. This is quite reasonable within multiple wrapped fragments that interact with each other, as long as they are served by the same cache. But for other code, specifically for JS inline
and non-module scripts (which are synchronous in nature), interaction with the QS wrapped code will get essentially more intricate. It will be wise to determine the target caching strategy at the very beginning
and to accomodate to it.

A small advantage of the asynchronous caching is that you may use async function under `.wrap`. This wrapped code will still execute sequentially relative to the other wrapped fragments and in its proper order,
but you will be able to use `await` inside it:
```
var publishedByA;
// goes first
QUADSUGAR
.useAsyncCache(qsCache)
.wrap(async () => {
	publishedByA = await somethingAsync();
});

// goes second
QUADSUGAR
.useAsyncCache(qsCache)
.wrap(() => {
	console.log("I can use symbol published by A:", publishedByA);
});

// goes last
qsCache.commit().then(() => {
	// but as for the other code, publishedByA will be set no earlier than the flow gets here
	... 
});
```

Some bundling systems like [Emery Spinner](https://github.com/sbtrn-devil/emery-spinner) (a shameless plug), have means to make non-module scripts loading transparently asyncronous and to alleviate this sort
of inconvenience.

<a name="_Av1Csx6x-6"></a>
#### Cache object interface ####

A cache object is any object that complies the following interface:

```
{
	[async] setItem(hash, codeString): void,
	[async] getItems(hashes): object { hash: codeString },
	commit: any-dummy-value // a reserved writeable slot (required for async strategy only)
}
```

Additionally, it can implement its own implementation specific methods, e. g. for pruning and cleanup.

`.setItem` and `.getItems` must be synchronous for a synchronous cache, or can be asynchronous for asynchronous cache.
Note that a synchronous cache implementation can be used with both synchronous and asynchronous cache strategies, while an asynchronous cache implementation can only be used with asynchronous strategy.

QS provides several built-in cache implemenations (`QS built-in cache implementations`[>>](#_Av1Cta1B-3)), but you can implement and use your own caches.

<u>**Properties**</u>

<a name="_Av1CzoeF-7"></a>
##### commit #####

In a newly created object, this must be a reserved writable slot not used in any way by the object implementation itself. When using the cache object for async cache strategy,
on the first call to `QUADSUGAR.wrap` with this cache object QS will fill this slot with an async `.commit()` callable.

This injected `.commit()` method will perform the actual preprocessing and execution of wrapped fragments enqueued so far on this cache, and will asynchronously complete after all of them are
finished. It is not generally recommended to use the cache object in any way until the `.commit()` call completes, but after that it can be called again.

<u>**Methods**</u>

<a name="_Av1Csx6x-9"></a>
##### .setItem(hash, codeString) #####

Store an item in the cache under the given hash as a key. Overwrite possibly existing one.

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

`hash`[>>](#_Av1Cta1B-1)

</td><td>

String. The code fragment hash (a stringified 16 digit hex number). Must be used as the cache key.

</td>
</tr>
<tr>
<td>

`codeString`[>>](#_Av1CzoeF-1)

</td><td>

String. The actual code fragment to store under the given hash key.

</td>
</tr>
</table>

<u>**Arguments (detailed)**</u>

<a name="_Av1Cta1B-1"></a>
###### hash ######

String. The code fragment hash (a stringified 16 digit hex number). Must be used as the cache key.

<a name="_Av1CzoeF-1"></a>
###### codeString ######

String. The actual code fragment to store under the given hash key.

<a name="_Av1CzoeF-2"></a>
##### .getItems(hashes) #####

Retreive a set of items from the cache by the given list of hashes.

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

`hashes`[>>](#_Av1CzoeF-4)

</td><td>

Array of strings. The list of hashes to retrieve the items by. Each is assumed to be a hash possibly used earlier in `.setItem(hash, codeString)`[>>](#_Av1Csx6x-9).

</td>
</tr>
</table>

<u>**Returns:**</u>

A dictionary of the found items, as JS object where a key is a hash and the value is the cached code fragment (as string). Values for the unfound hashes must be undefined or set to null.

<u>**Arguments (detailed)**</u>

<a name="_Av1CzoeF-4"></a>
###### hashes ######

Array of strings. The list of hashes to retrieve the items by. Each is assumed to be a hash possibly used earlier in `.setItem(hash, codeString)`[>>](#_Av1Csx6x-9).

<a name="_Av2HZ06M-1"></a>
#### Caching and static tag processing ####

There is a caveat worth to be noted: when using caching, some static tag processing callbacks can be not called or can be called in different environment in cache-hit conditions. Specifically:
- custom algebra tag evaluations applicable at compile-time (`.parseLiteral.isApplicable`) is not run,
- custom algebra traces (if enabled) will not be printed,
- simple tag processing evaluator factory will be called with dummy construction toolkit, whose methods will have no actual effect as the code is already compiled.

In most cases, when the code is reasonably consistent, this difference should not have any adverse effect. Just in case, try avoid weird hacks like:
- passing stateful information between different compile-time callbacks, and between compile-time and runtime callbacks, other than mediated by `'OCCURRENCE_TAG'` and `'CONTEXT'` arguments (for custom algebras)
of via evaluator fatory constructor's closure (for simple static tags),
- non-idempotent or random results of compile-time callbacks,
- passing any compile-time information between unrelated static tag expression occurrences - each expression is assumed to exist on its own and should implement the same logic regardless on presence or absence
of the others.

Additionally, when the cache identity is calculated, the QS settings that can essentially affect the generated code are taken into consideration - that includes callbacks code in the static tag specification,
but not any external parameters that may affect behavior of this code. So, if your static tag processing is controlled by any such parameters, prefer to use them at static tag declaration level than
in callback level:
```
var ENABLE_SOMETHING = true;

// BAD!
var SimpleTag = QUADSUGAR.staticSimpleTag((ct, strings) => {
	if (ENABLE_SOMETHING) return A;
	else return B;
});

// better
var SimpleTag = QUADSUGAR.staticSimpleTag(ENABLE_SOMETHING ? (ct, strings) => {
	return A;
} : (ct, strings) => {
	return B;
});

```

Finally, caching behavior can add some challenges at stage of development and debugging the static tag processors. In order to make this more deterministic, you can use
`.disableCacheHit` configuration clause:

```
QUADSUGAR
.useAsyncCache(...)
.disableCacheHit(true) // remove or comment out after the development
.wrap(() => {
...
} ...);
```

If this clause is added with `true` parameter (or with no parameter), then "always cache miss" mode is enabled, while the caching strategy itself and adding cache items still remain in place.

<a name="_Av1Cta1B-3"></a>
#### QS built-in cache implementations ####

QS provides several built-in cache implementations, primarily browser environment oriented.

<a name="_Av1J43qP-1"></a>
##### OptionalSyncCache #####

A synchronous cache that does no actual caching by default, but can be configured to load pre-compiled cache or to capture the cached items. It can be
used in both browser and Node.js environment, with some differences in the available features.

There are following uses for this cache implementation:
- Use as dummy to adapt your code for asynchronous cache strategy (since `.useAsyncCache` option requires to specify a sync or async cache object).
- Use a cache compiled ahead, e. g. to a JSON file, and/or prepare data for such a cache. Although QS has no complete solution for a traditional pre-compile
pipeline, the `OptionalSyncCache` can be used as building blocks for one.

In order to enable capturing the items, you need to call `captureNewItems(yes)`[>>](#_Av1J43qP-2) with `true` before using the cache.

<u>**Properties**</u>

<a name="_Av1J43qP-15"></a>
###### commit [placeholder] ######

Placeholder for `async commit()` method, filled after first use of the cache with async strategy.

<u>**Methods**</u>

<a name="_Av1J43qP-2"></a>
###### captureNewItems(yes) ######

Enable or disable capturing new items into the cache (disabled by default). If not enabled, the `setItem(hash, codeString)`[>>](#_Av1J43qP-11) will be a no-op (but the
items supplied via `setPrecapturedItems(dictionary)`[>>](#_Av1J43qP-8) will still be available via `getItems(hashes)`[>>](#_Av1J43qP-6)).
Note that the cache is not persistent, so in order to make use of the cached changes you will need to use one of the saving methods.

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

`yes`[>>](#_Av1J43qP-33)

</td><td>

`true` if adding new items to the cache must be enabled, `false` otherwise

</td>
</tr>
</table>

<u>**Returns:**</u>

Self, allowing method chaining

<u>**Arguments (detailed)**</u>

<a name="_Av1J43qP-33"></a>
###### yes ######

`true` if adding new items to the cache must be enabled, `false` otherwise

<a name="_Av1J43qP-3"></a>
###### OptionalSyncCache() [constructor] ######

Construct the instance of `OptinalSyncCache`. Use via `new QUADSUGAR.OptionalSyncCache()` or `QUADSUGAR.OptionalSyncCache()`.

<u>**Returns:**</u>

`OptinalSyncCache` instance

<a name="_Av1J43qP-6"></a>
###### getItems(hashes) ######

The synchronous implementation of `.getItems(hashes)`[>>](#_Av1CzoeF-2). Returns empty dictionary, unless precaptured content is supplied via
`setPrecapturedItems(dictionary)`[>>](#_Av1J43qP-8), or new items capturing is enabled by `captureNewItems(yes)`[>>](#_Av1J43qP-2).

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

`hashes`[>>](#_Av1J43qP-9)

</td><td>

Array of strings. The list of hashes to retrieve the items by.

</td>
</tr>
</table>

<u>**Returns:**</u>

A dictionary of the found items.

<u>**Arguments (detailed)**</u>

<a name="_Av1J43qP-9"></a>
###### hashes ######

Array of strings. The list of hashes to retrieve the items by.

<a name="_Av1J43qP-8"></a>
###### setPrecapturedItems(dictionary) ######

Prepopulate the cache with the given items. They will be available via `getItems(hashes)`[>>](#_Av1J43qP-6)).

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

`dictionary`[>>](#_Av1J43qP-18)

</td><td>

An object that works as dictionary, with hash as key and the cached code fragment string as value (similarly to return value of
`getItems(hashes)`[>>](#_Av1J43qP-6)).


</td>
</tr>
</table>

<u>**Returns:**</u>

Self, allowing method chaining

<u>**Arguments (detailed)**</u>

<a name="_Av1J43qP-18"></a>
###### dictionary ######

An object that works as dictionary, with hash as key and the cached code fragment string as value (similarly to return value of
`getItems(hashes)`[>>](#_Av1J43qP-6)).

If called repeatedly, the method adds new items to the existing ones (overwriting the ones with same hash).

<a name="_Av1J43qP-11"></a>
###### setItem(hash, codeString) ######

The synchronous implementation of `.setItem(hash, codeString)`[>>](#_Av1Csx6x-9). Does nothing by default, unless new items capturing is enabled via
`captureNewItems(yes)`[>>](#_Av1J43qP-2), otherwise adds the item to precaptured cpntent. Keep in mind that the cache is transient, so in order to make sense
of this mode the captured content should be saved explicitly.

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

`hash`[>>](#_Av1J43qP-13)

</td><td>

The code fragment hash.

</td>
</tr>
<tr>
<td>

`codeString`[>>](#_Av1J43qP-14)

</td><td>

The actual code fragment to store under the given hash key.

</td>
</tr>
</table>

<u>**Arguments (detailed)**</u>

<a name="_Av1J43qP-13"></a>
###### hash ######

The code fragment hash.

<a name="_Av1J43qP-14"></a>
###### codeString ######

The actual code fragment to store under the given hash key.

<a name="_Av1J43qP-20"></a>
###### nodejsLoadPrecapturedItemsFromFileSync(filePath[, suppressWarning]) ######

[Node.js only] Prepopulate the cache from the given JSON file. In case of failure, the method will work as no-op, but a warning will be logged.

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

`filePath`[>>](#_Av1J43qP-24)

</td><td>

String. Path to the JSON file.

</td>
</tr>
<tr>
<td>

`suppressWarning`[>>](#_Av1J43qP-25)

</td><td>

Bool, optional (default is `false`). Set to `true` if you need to suppress the warning in case of file reading error.

</td>
</tr>
</table>

<u>**Returns:**</u>

Self, allowing method chaining

The JSON file is expected to contain hash object with hashes as the keys and strings for the values.
One of methods to generate such file is `nodejsSaveCapturedItemsToFileSync(filePath)`[>>](#_Av1J43qP-22)/`async nodejsSaveCapturedItemsToFileAsync(filePath)`[>>](#_Av1J43qP-23).

If called repeatedly, the method adds new items to the existing ones (overwriting the ones with same hash).

<u>**Arguments (detailed)**</u>

<a name="_Av1J43qP-24"></a>
###### filePath ######

String. Path to the JSON file.

<a name="_Av1J43qP-25"></a>
###### suppressWarning ######

Bool, optional (default is `false`). Set to `true` if you need to suppress the warning in case of file reading error.

<a name="_Av1J43qP-22"></a>
###### nodejsSaveCapturedItemsToFileSync(filePath) ######

[Node.js only] Save the currently captured items into a JSON file, which can be later used with `nodejsLoadPrecapturedItemsFromFileSync(filePath[, suppressWarning])`[>>](#_Av1J43qP-20)/
`async nodejsLoadPrecapturedItemsFromFileAsync(filePath[, suppressWarning])`[>>](#_Av1J43qP-27). You must enable `captureNewItems(yes)`[>>](#_Av1J43qP-2) before using this method.

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

`filePath`[>>](#_Av1J43qP-50)

</td><td>

String. Path to the target JSON file.

</td>
</tr>
</table>

<u>**Returns:**</u>

`true` if the file has been saved successfully, `false` otherwise.

<u>**Arguments (detailed)**</u>

<a name="_Av1J43qP-50"></a>
###### filePath ######

String. Path to the target JSON file.

<a name="_Av1J43qP-23"></a>
###### async nodejsSaveCapturedItemsToFileAsync(filePath) ######

[Node.js only] The async counterpart of `nodejsSaveCapturedItemsToFileSync(filePath)`[>>](#_Av1J43qP-22). Works exacty the same, but returns asynchronously.

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

`filePath`[>>](#_Av1J43qP-53)

</td><td>

String. Path to the target JSON file.

</td>
</tr>
</table>

<u>**Returns:**</u>

`true` if the file has been saved successfully, `false` otherwise.

<u>**Arguments (detailed)**</u>

<a name="_Av1J43qP-53"></a>
###### filePath ######

String. Path to the target JSON file.

<a name="_Av1J43qP-27"></a>
###### async nodejsLoadPrecapturedItemsFromFileAsync(filePath[, suppressWarning]) ######

[Node.js only] The async counterpart of `nodejsLoadPrecapturedItemsFromFileSync(filePath[, suppressWarning])`[>>](#_Av1J43qP-20). Works exacty the same, but returns asynchronously.

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

`filePath`[>>](#_Av1J43qP-29)

</td><td>

String. Path to the JSON file.

</td>
</tr>
<tr>
<td>

`suppressWarning`[>>](#_Av1J43qP-30)

</td><td>

Bool, optional (default is `false`). Set to `true` if you need to suppress the warning in case of file reading error.

</td>
</tr>
</table>

<u>**Returns:**</u>

Self, allowing method chaining (but note it is an async return)

<u>**Arguments (detailed)**</u>

<a name="_Av1J43qP-29"></a>
###### filePath ######

String. Path to the JSON file.

<a name="_Av1J43qP-30"></a>
###### suppressWarning ######

Bool, optional (default is `false`). Set to `true` if you need to suppress the warning in case of file reading error.

<a name="_Av1J43qP-35"></a>
###### cacheModified() ######

Returns true if new items were added to the cache, or existing have been modified, after creating blank cache or initializing it with
`setPrecapturedItems(dictionary)`[>>](#_Av1J43qP-8). New items capturing must be enabled by `captureNewItems(yes)`[>>](#_Av1J43qP-2) in order for this to work.

<u>**Returns:**</u>

`true` if the cache was changed, `false` otherwise.

Use this method if you fetch cache from a persistent storage that is meant to be up to date with the current code state, to check if an update is needed.

<a name="_Av1J43qP-38"></a>
###### prune() ######

Delete all items from the cache that have been not updated or requested up to this point. May result in modification of cache (as returned by `cacheModified()`[>>](#_Av1J43qP-35)).
`cacheModified()`[>>](#_Av1J43qP-35)).

<u>**Returns:**</u>

Self, allowing method chaining (but note it is an async return)

If you are updating the external storage with the cache, invoke the methods in the sequence after all wrappings intended for this cache are processed:
1) `prune()`[>>](#_Av1J43qP-38), 2) `cacheModified()`[>>](#_Av1J43qP-35) to verify if the cache was modified, 3) if modified, then update the storage
(for example via `nodejsSaveCapturedItemsToFileSync(filePath)`[>>](#_Av1J43qP-22)/`async nodejsSaveCapturedItemsToFileAsync(filePath)`[>>](#_Av1J43qP-23)).

<a name="_Av1J43qP-42"></a>
###### getCapturedJson() ######

Returns the items captured into the cache, along with unchanged prepopulated ones, stringified into JSON object. De-stringified back, object from this JSON
can be used with `setPrecapturedItems(dictionary)`[>>](#_Av1J43qP-8). You must enable `captureNewItems(yes)`[>>](#_Av1J43qP-2) before using this method.

<u>**Returns:**</u>

String, the cache as stringified JSON.

<a name="_Av1J43qP-45"></a>
###### browserDownloadCapturedJson(name) ######

[Browser only] Issues a download request with the cache serialized into JSON file, which can be deserialized back and used with
`setPrecapturedItems(dictionary)`[>>](#_Av1J43qP-8). You also can specify the name for the downloadable file.

<u>**Returns:**</u>

`true`

<a name="_Av1J43qP-47"></a>
###### name ######

String, name for the downloaded file (with no ".json" extension)

<a name="_Av1J43qP-55"></a>
##### LocalStorageSyncCache #####

A synchronous cache that caches items in [browser's local storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).
Only can be used in browser environment.

It is a synchronous cache, which makes it more convenient, but due to limitations on local storage it may be not suitable if the total amount of wrapped code
on the page spans multiple megabytes. In such cases, consider using `IndexedDbAsyncCache`[>>](#_Av1J43qP-56).

<u>**Properties**</u>

<a name="_Av1J43qP-69"></a>
###### commit [placeholder] ######

Placeholder for `async commit()` method, filled after first use of the cache with async strategy.

<u>**Methods**</u>

<a name="_Av1J43qP-57"></a>
###### LocalStorageSyncCache(name) [constructor] ######

Construct the instance of `LocalStorageSyncCache`. Use via `new QUADSUGAR.LocalStorageSyncCache(...)` or `QUADSUGAR.LocalStorageSyncCache(...)`.

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

`name`[>>](#_Av1J43qP-59)

</td><td>

String. Prefix for local storage key names that will be used for this cache - should guarantee no conflict occurs with your own application
specific local storage keys, and must differ from names you specified for other `LocalStorageSyncCache`-s, if you use multiple ones per application.

</td>
</tr>
</table>

<u>**Returns:**</u>

`LocalStorageSyncCache` instance

<u>**Arguments (detailed)**</u>

<a name="_Av1J43qP-59"></a>
###### name ######

String. Prefix for local storage key names that will be used for this cache - should guarantee no conflict occurs with your own application
specific local storage keys, and must differ from names you specified for other `LocalStorageSyncCache`-s, if you use multiple ones per application.

<a name="_Av1J43qP-61"></a>
###### getItems(hashes) ######

The synchronous implementation of `.getItems(hashes)`[>>](#_Av1CzoeF-2).

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

`hashes`[>>](#_Av1J43qP-63)

</td><td>

Array of strings. The list of hashes to retrieve the items by.

</td>
</tr>
</table>

<u>**Returns:**</u>

A dictionary of the found items.

<u>**Arguments (detailed)**</u>

<a name="_Av1J43qP-63"></a>
###### hashes ######

Array of strings. The list of hashes to retrieve the items by.

<a name="_Av1J43qP-65"></a>
###### setItem(hash, codeString) ######

The synchronous implementation of `.setItem(hash, codeString)`[>>](#_Av1Csx6x-9).

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

`hash`[>>](#_Av1J43qP-67)

</td><td>

The code fragment hash.

</td>
</tr>
<tr>
<td>

`codeString`[>>](#_Av1J43qP-68)

</td><td>

The actual code fragment to store under the given hash key.

</td>
</tr>
</table>

<u>**Arguments (detailed)**</u>

<a name="_Av1J43qP-67"></a>
###### hash ######

The code fragment hash.

<a name="_Av1J43qP-68"></a>
###### codeString ######

The actual code fragment to store under the given hash key.

<a name="_Av1J43qP-71"></a>
###### clear() ######

Clear all items from the cache.

<u>**Returns:**</u>

Self, allowing method chaining

<a name="_Av1J43qP-74"></a>
###### prune() ######

Clears all keys from the cache that have been not updated or requested up to this point. Call after all of the planned wraps have finished to keep the cache size under control.

<u>**Returns:**</u>

Self, allowing method chaining

<a name="_Av1J43qP-56"></a>
##### IndexedDbAsyncCache #####

An asynchronous cache that caches items in [browser's IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API).
Only can be used in browser environment.

If your total amount of wrapped code is large enough, it is the recommended cache to use.

<u>**Properties**</u>

<a name="_Av1J43qP-89"></a>
###### commit [placeholder] ######

Placeholder for `async commit()` method, filled after first use of the cache with async strategy.

<u>**Methods**</u>

<a name="_Av1J43qP-77"></a>
###### IndexedDbAsyncCache(name) [constructor] ######

Construct the instance of `IndexedDbAsyncCache`. Use via `new QUADSUGAR.IndexedDbAsyncCache(...)` or `QUADSUGAR.IndexedDbAsyncCache(...)`.

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

`name`[>>](#_Av1J43qP-79)

</td><td>

String. Name to use for cache IDB - should be different from names of your application specific IDBs, if any, and from names you
specified for other `IndexedDbAsyncCache`-s, if you use multiple ones per application.

</td>
</tr>
</table>

<u>**Returns:**</u>

`IndexedDbAsyncCache` instance

<u>**Arguments (detailed)**</u>

<a name="_Av1J43qP-79"></a>
###### name ######

String. Name to use for cache IDB - should be different from names of your application specific IDBs, if any, and from names you
specified for other `IndexedDbAsyncCache`-s, if you use multiple ones per application.

<a name="_Av1J43qP-81"></a>
###### async getItems(hashes) ######

The asynchronous implementation of `.getItems(hashes)`[>>](#_Av1CzoeF-2).

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

`hashes`[>>](#_Av1J43qP-83)

</td><td>

Array of strings. The list of hashes to retrieve the items by.

</td>
</tr>
</table>

<u>**Returns:**</u>

A dictionary of the found items.

<u>**Arguments (detailed)**</u>

<a name="_Av1J43qP-83"></a>
###### hashes ######

Array of strings. The list of hashes to retrieve the items by.

<a name="_Av1J43qP-85"></a>
###### async setItem(hash, codeString) ######

The asynchronous implementation of `.setItem(hash, codeString)`[>>](#_Av1Csx6x-9).

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

`hash`[>>](#_Av1J43qP-87)

</td><td>

The code fragment hash.

</td>
</tr>
<tr>
<td>

`codeString`[>>](#_Av1J43qP-88)

</td><td>

The actual code fragment to store under the given hash key.

</td>
</tr>
</table>

<u>**Arguments (detailed)**</u>

<a name="_Av1J43qP-87"></a>
###### hash ######

The code fragment hash.

<a name="_Av1J43qP-88"></a>
###### codeString ######

The actual code fragment to store under the given hash key.

<a name="_Av1J43qP-91"></a>
###### clear() ######

Clear all items from the cache.

<u>**Returns:**</u>

Self, allowing method chaining (but note it is an async return)

<a name="_Av1J43qP-94"></a>
###### async prune() ######

Clears all keys from the cache that have been not updated or requested up to this point. Call after all of the planned wraps have finished to keep the cache size under control.

<u>**Returns:**</u>

Self, allowing method chaining (but note it is an async return)

<a name="_Av1J43qP-97"></a>
###### async close() ######

Close the cache backing IDB. Call after `async prune()`[>>](#_Av1J43qP-94) to flush the DB and release its connection resources. No usage of the cache object is expected after that.
Although it is still possible, but any usage after closing will automatically re-open the DB, and you will have to close it again, so better be consistent.


---
The page generated by Logipard 1.0.3 using lpgwrite-example + lpgwrite-example-render-md generator
