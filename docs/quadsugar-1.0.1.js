(function () {
// This fragment is based off jsTokens library
// The MIT License (MIT)
// Copyright (c) 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024 Simon Lydell
// see https://github.com/lydell/js-tokens for full license text

// Adjusted for QS to attach line and column numbers.
var HashbangComment, Identifier, JSXIdentifier, JSXPunctuator, JSXString, JSXText, KeywordsWithExpressionAfter, KeywordsWithNoLineTerminatorAfter, LineTerminatorSequence, MultiLineComment, Newline, NumericLiteral, Punctuator, RegularExpressionLiteral, SingleLineComment, StringLiteral, Template, TokensNotPrecedingObjectLiteral, TokensPrecedingExpression, WhiteSpace, jsTokens;
RegularExpressionLiteral = /\/(?![*\/])(?:\[(?:[^\]\\\n\r\u2028\u2029]+|\\.)*\]?|[^\/[\\\n\r\u2028\u2029]+|\\.)*(\/[$_\u200C\u200D\p{ID_Continue}]*|\\)?/yu;
Punctuator = /--|\+\+|=>|\.{3}|\??\.(?!\d)|(?:&&|\|\||\?\?|[+\-%&|^]|\*{1,2}|<{1,2}|>{1,3}|!=?|={1,2}|\/(?![\/*]))=?|[?~,:;[\](){}]/y;
Identifier = /(\x23?)(?=[$_\p{ID_Start}\\])(?:[$_\u200C\u200D\p{ID_Continue}]+|\\u[\da-fA-F]{4}|\\u\{[\da-fA-F]+\})+/yu;
StringLiteral = /(['"])(?:[^'"\\\n\r]+|(?!\1)['"]|\\(?:\r\n|[^]))*(\1)?/y;
NumericLiteral = /(?:0[xX][\da-fA-F](?:_?[\da-fA-F])*|0[oO][0-7](?:_?[0-7])*|0[bB][01](?:_?[01])*)n?|0n|[1-9](?:_?\d)*n|(?:(?:0(?!\d)|0\d*[89]\d*|[1-9](?:_?\d)*)(?:\.(?:\d(?:_?\d)*)?)?|\.\d(?:_?\d)*)(?:[eE][+-]?\d(?:_?\d)*)?|0[0-7]+/y;
Template = /[`}](?:[^`\\$]+|\\[^]|\$(?!\{))*(`|\$\{)?/y;
WhiteSpace = /[\t\v\f\ufeff\p{Zs}]+/yu;
LineTerminatorSequence = /\r?\n|[\r\u2028\u2029]/y;
MultiLineComment = /\/\*(?:[^*]+|\*(?!\/))*(\*\/)?/y;
SingleLineComment = /\/\/.*/y;
HashbangComment = /^#!.*/;
JSXPunctuator = /[<>.:={}]|\/(?![\/*])/y;
JSXIdentifier = /[$_\p{ID_Start}][$_\u200C\u200D\p{ID_Continue}-]*/yu;
JSXString = /(['"])(?:[^'"]+|(?!\1)['"])*(\1)?/y;
JSXText = /[^<>{}]+/y;
TokensPrecedingExpression = /^(?:[\/+-]|\.{3}|\?(?:InterpolationIn(?:JSX|Template)|NoLineTerminatorHere|NonExpressionParenEnd|UnaryIncDec))?$|[{}([,;<>=*%&|^!~?:]$/;
TokensNotPrecedingObjectLiteral = /^(?:=>|[;\]){}]|else|\?(?:NoLineTerminatorHere|NonExpressionParenEnd))?$/;
KeywordsWithExpressionAfter = /^(?:await|case|default|delete|do|else|instanceof|new|return|throw|typeof|void|yield)$/;
KeywordsWithNoLineTerminatorAfter = /^(?:return|throw|yield)$/;
Newline = RegExp(LineTerminatorSequence.source);
function *jsTokens(input, {jsx = false, startLine = 0, startColumn = 0} = {}) {
	var braces, firstCodePoint, isExpression, lastIndex, lastSignificantToken, length, match, mode, nextLastIndex, nextLastSignificantToken, parenNesting, postfixIncDec, punctuator, stack;
	({length} = input);
	lastIndex = 0;
	lastSignificantToken = "";
	stack = [
		{tag: "JS"}
	];
	braces = [];
	parenNesting = 0;
	postfixIncDec = false;
	var curLine = startLine, curColumn = startColumn, prevIndex = 0;
	if (match = HashbangComment.exec(input)) {
		yield ({
			line: curLine,
			column: curColumn,
			type: "HashbangComment",
			value: match[0]
		});
		lastIndex = match[0].length;
	}
	while (lastIndex < length) {
		for (; prevIndex < lastIndex; prevIndex++) {
			curColumn++;
			switch (input.charCodeAt(prevIndex)) {
			case 13:
				if (input.charCodeAt(prevIndex + 1) == 10) prevIndex++; // \r and \r\n
				// fallthrough!
			case 10: // standalone \n
			case 0x2028: // line separator
			case 0x2029: // paragraph separator
				curLine++;
				curColumn = 0;
			default: break;
			}
		}

		mode = stack[stack.length - 1];
		switch (mode.tag) {
			case "JS":
			case "JSNonExpressionParen":
			case "InterpolationInTemplate":
			case "InterpolationInJSX":
				if (input[lastIndex] === "/" && (TokensPrecedingExpression.test(lastSignificantToken) || KeywordsWithExpressionAfter.test(lastSignificantToken))) {
					RegularExpressionLiteral.lastIndex = lastIndex;
					if (match = RegularExpressionLiteral.exec(input)) {
						lastIndex = RegularExpressionLiteral.lastIndex;
						lastSignificantToken = match[0];
						postfixIncDec = true;
						yield ({
							line: curLine,
							column: curColumn,
							type: "RegularExpressionLiteral",
							value: match[0],
							closed: match[1] !== void 0 && match[1] !== "\\"
						});
						continue;
					}
				}
				Punctuator.lastIndex = lastIndex;
				if (match = Punctuator.exec(input)) {
					punctuator = match[0];
					nextLastIndex = Punctuator.lastIndex;
					nextLastSignificantToken = punctuator;
					switch (punctuator) {
						case "(":
							if (lastSignificantToken === "?NonExpressionParenKeyword") {
								stack.push({
									tag: "JSNonExpressionParen",
									nesting: parenNesting
								});
							}
							parenNesting++;
							postfixIncDec = false;
							break;
						case ")":
							parenNesting--;
							postfixIncDec = true;
							if (mode.tag === "JSNonExpressionParen" && parenNesting === mode.nesting) {
								stack.pop();
								nextLastSignificantToken = "?NonExpressionParenEnd";
								postfixIncDec = false;
							}
							break;
						case "{":
							Punctuator.lastIndex = 0;
							isExpression = !TokensNotPrecedingObjectLiteral.test(lastSignificantToken) && (TokensPrecedingExpression.test(lastSignificantToken) || KeywordsWithExpressionAfter.test(lastSignificantToken));
							braces.push(isExpression);
							postfixIncDec = false;
							break;
						case "}":
							switch (mode.tag) {
								case "InterpolationInTemplate":
									if (braces.length === mode.nesting) {
										Template.lastIndex = lastIndex;
										match = Template.exec(input);
										lastIndex = Template.lastIndex;
										lastSignificantToken = match[0];
										if (match[1] === "${") {
											lastSignificantToken = "?InterpolationInTemplate";
											postfixIncDec = false;
											yield ({
												line: curLine,
												column: curColumn,
												type: "TemplateMiddle",
												srcType: "TemplateMiddle",
												value: match[0]
											});
										} else {
											stack.pop();
											postfixIncDec = true;
											yield ({
												line: curLine,
												column: curColumn,
												type: "TemplateTail",
												srcType: "TemplateTail",
												value: match[0],
												closed: match[1] === "`"
											});
										}
										continue;
									}
									break;
								case "InterpolationInJSX":
									if (braces.length === mode.nesting) {
										stack.pop();
										lastIndex += 1;
										lastSignificantToken = "}";
										yield ({
											line: curLine,
											column: curColumn,
											type: "JSXPunctuator",
											value: "}"
										});
										continue;
									}
							}
							postfixIncDec = braces.pop();
							nextLastSignificantToken = postfixIncDec ? "?ExpressionBraceEnd" : "}";
							break;
						case "]":
							postfixIncDec = true;
							break;
						case "++":
						case "--":
							nextLastSignificantToken = postfixIncDec ? "?PostfixIncDec" : "?UnaryIncDec";
							break;
						case "<":
							if (jsx && (TokensPrecedingExpression.test(lastSignificantToken) || KeywordsWithExpressionAfter.test(lastSignificantToken))) {
								stack.push({tag: "JSXTag"});
								lastIndex += 1;
								lastSignificantToken = "<";
								yield ({
									line: curLine,
									column: curColumn,
									type: "JSXPunctuator",
									value: punctuator
								});
								continue;
							}
							postfixIncDec = false;
							break;
						default:
							postfixIncDec = false;
					}
					lastIndex = nextLastIndex;
					lastSignificantToken = nextLastSignificantToken;
					yield ({
						line: curLine,
						column: curColumn,
						type: "Punctuator",
						value: punctuator
					});
					continue;
				}
				Identifier.lastIndex = lastIndex;
				if (match = Identifier.exec(input)) {
					lastIndex = Identifier.lastIndex;
					nextLastSignificantToken = match[0];
					switch (match[0]) {
						case "for":
						case "if":
						case "while":
						case "with":
							if (lastSignificantToken !== "." && lastSignificantToken !== "?.") {
								nextLastSignificantToken = "?NonExpressionParenKeyword";
							}
					}
					lastSignificantToken = nextLastSignificantToken;
					postfixIncDec = !KeywordsWithExpressionAfter.test(match[0]);
					yield ({
						line: curLine,
						column: curColumn,
						type: match[1] === "#" ? "PrivateIdentifier" : "IdentifierName",
						value: match[0]
					});
					continue;
				}
				StringLiteral.lastIndex = lastIndex;
				if (match = StringLiteral.exec(input)) {
					lastIndex = StringLiteral.lastIndex;
					lastSignificantToken = match[0];
					postfixIncDec = true;
					yield ({
						line: curLine,
						column: curColumn,
						type: "StringLiteral",
						value: match[0],
						closed: match[2] !== void 0
					});
					continue;
				}
				NumericLiteral.lastIndex = lastIndex;
				if (match = NumericLiteral.exec(input)) {
					lastIndex = NumericLiteral.lastIndex;
					lastSignificantToken = match[0];
					postfixIncDec = true;
					yield ({
						line: curLine,
						column: curColumn,
						type: "NumericLiteral",
						value: match[0]
					});
					continue;
				}
				Template.lastIndex = lastIndex;
				if (match = Template.exec(input)) {
					lastIndex = Template.lastIndex;
					lastSignificantToken = match[0];
					if (match[1] === "${") {
						lastSignificantToken = "?InterpolationInTemplate";
						stack.push({
							tag: "InterpolationInTemplate",
							nesting: braces.length
						});
						postfixIncDec = false;
						yield ({
							line: curLine,
							column: curColumn,
							type: "TemplateHead",
							srcType: "TemplateHead",
							value: match[0]
						});
					} else {
						postfixIncDec = true;
						yield ({
							line: curLine,
							column: curColumn,
							type: "NoSubstitutionTemplate",
							value: match[0],
							closed: match[1] === "`"
						});
					}
					continue;
				}
				break;
			case "JSXTag":
			case "JSXTagEnd":
				JSXPunctuator.lastIndex = lastIndex;
				if (match = JSXPunctuator.exec(input)) {
					lastIndex = JSXPunctuator.lastIndex;
					nextLastSignificantToken = match[0];
					switch (match[0]) {
						case "<":
							stack.push({tag: "JSXTag"});
							break;
						case ">":
							stack.pop();
							if (lastSignificantToken === "/" || mode.tag === "JSXTagEnd") {
								nextLastSignificantToken = "?JSX";
								postfixIncDec = true;
							} else {
								stack.push({tag: "JSXChildren"});
							}
							break;
						case "{":
							stack.push({
								tag: "InterpolationInJSX",
								nesting: braces.length
							});
							nextLastSignificantToken = "?InterpolationInJSX";
							postfixIncDec = false;
							break;
						case "/":
							if (lastSignificantToken === "<") {
								stack.pop();
								if (stack[stack.length - 1].tag === "JSXChildren") {
									stack.pop();
								}
								stack.push({tag: "JSXTagEnd"});
							}
					}
					lastSignificantToken = nextLastSignificantToken;
					yield ({
						line: curLine,
						column: curColumn,
						type: "JSXPunctuator",
						value: match[0]
					});
					continue;
				}
				JSXIdentifier.lastIndex = lastIndex;
				if (match = JSXIdentifier.exec(input)) {
					lastIndex = JSXIdentifier.lastIndex;
					lastSignificantToken = match[0];
					yield ({
						line: curLine,
						column: curColumn,
						type: "JSXIdentifier",
						value: match[0]
					});
					continue;
				}
				JSXString.lastIndex = lastIndex;
				if (match = JSXString.exec(input)) {
					lastIndex = JSXString.lastIndex;
					lastSignificantToken = match[0];
					yield ({
						line: curLine,
						column: curColumn,
						type: "JSXString",
						value: match[0],
						closed: match[2] !== void 0
					});
					continue;
				}
				break;
			case "JSXChildren":
				JSXText.lastIndex = lastIndex;
				if (match = JSXText.exec(input)) {
					lastIndex = JSXText.lastIndex;
					lastSignificantToken = match[0];
					yield ({
						line: curLine,
						column: curColumn,
						type: "JSXText",
						value: match[0]
					});
					continue;
				}
				switch (input[lastIndex]) {
					case "<":
						stack.push({tag: "JSXTag"});
						lastIndex++;
						lastSignificantToken = "<";
						yield ({
							line: curLine,
							column: curColumn,
							type: "JSXPunctuator",
							value: "<"
						});
						continue;
					case "{":
						stack.push({
							tag: "InterpolationInJSX",
							nesting: braces.length
						});
						lastIndex++;
						lastSignificantToken = "?InterpolationInJSX";
						postfixIncDec = false;
						yield ({
							line: curLine,
							column: curColumn,
							type: "JSXPunctuator",
							value: "{"
						});
						continue;
				}
		}
		WhiteSpace.lastIndex = lastIndex;
		if (match = WhiteSpace.exec(input)) {
			lastIndex = WhiteSpace.lastIndex;
			yield ({
				line: curLine,
				column: curColumn,
				type: "WhiteSpace",
				value: match[0]
			});
			continue;
		}
		LineTerminatorSequence.lastIndex = lastIndex;
		if (match = LineTerminatorSequence.exec(input)) {
			lastIndex = LineTerminatorSequence.lastIndex;
			postfixIncDec = false;
			if (KeywordsWithNoLineTerminatorAfter.test(lastSignificantToken)) {
				lastSignificantToken = "?NoLineTerminatorHere";
			}
			yield ({
				line: curLine,
				column: curColumn,
				type: "LineTerminatorSequence",
				value: match[0]
			});
			continue;
		}
		MultiLineComment.lastIndex = lastIndex;
		if (match = MultiLineComment.exec(input)) {
			lastIndex = MultiLineComment.lastIndex;
			if (Newline.test(match[0])) {
				postfixIncDec = false;
				if (KeywordsWithNoLineTerminatorAfter.test(lastSignificantToken)) {
					lastSignificantToken = "?NoLineTerminatorHere";
				}
			}
			yield ({
				line: curLine,
				column: curColumn,
				type: "MultiLineComment",
				value: match[0],
				closed: match[1] !== void 0
			});
			continue;
		}
		SingleLineComment.lastIndex = lastIndex;
		if (match = SingleLineComment.exec(input)) {
			lastIndex = SingleLineComment.lastIndex;
			postfixIncDec = false;
			yield ({
				line: curLine,
				column: curColumn,
				type: "SingleLineComment",
				value: match[0]
			});
			continue;
		}
		firstCodePoint = String.fromCodePoint(input.codePointAt(lastIndex));
		lastIndex += firstCodePoint.length;
		lastSignificantToken = firstCodePoint;
		postfixIncDec = false;
		yield ({
			line: curLine,
			column: curColumn,
			type: mode.tag.startsWith("JSX") ? "JSXInvalid" : "Invalid",
			value: firstCodePoint
		});
	}
	return void 0;
};

// end of jsTokens fragment

//
// QS main part
//

function ultraFastHash16(str) {
	// an AI generated string hash function

	let a = 0x9e3779b9, b = 0x243f6a88;
	let c = 0xdeadbeef, d = 0x41c6ce57;
    
	for (let i = 0; i < str.length; i++) {
		const x = str.charCodeAt(i);
        
		a = Math.imul(a ^ x, 0x85ebca6b);
		b = Math.imul(b ^ x, 0xc2b2ae35);
		c = Math.imul(c ^ x, 0x27d4eb2f);
		d = Math.imul(d ^ x, 0x165667b1);
	}
    
	// complex mix of all 4 hashes
	a = Math.imul(a ^ (a >>> 16), 0x7feb352d);
	b = Math.imul(b ^ (b >>> 16), 0x85ca5a1d);
	c = Math.imul(c ^ (c >>> 16), 0x27d4eb3d);
	d = Math.imul(d ^ (d >>> 16), 0x165667c3);
    
	// create unique 64-bit hash
	const h1 = (a ^ b ^ c ^ d) >>> 0;
	const h2 = (Math.imul(a, b) ^ Math.imul(c, d)) >>> 0;
    
	return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

const SYM_CONFIG = Symbol(),
	SYM_CACHE = Symbol(),
	SYM_FROZEN = Symbol();

// noise parsing
// A noise is a group type of token that aggregates a ganeric sequence of other tokens, any of which can be either an atomic token or a nested noise.
// The L1 parser (given L0 is lexer) parses the sequence of tokens, grouping sequences bounded by brackets/braces/parenthesis into noises,
// this structure is sufficient for basic syntax analysis without exhaustive delving into depths of JS grammar.

function parseAsL1Noise(jsSrc, startLine, startColumn) {
	// remove screen comment if any, and replace it with equal number of spaces
	{
		const qsScreenMatch = jsSrc.match(/(\)\s*(?:=>)?\s*\{\s*)(\/\*+\s*QS-SCREEN\s*?)(?=\n|$)/);
		if (qsScreenMatch) {
			const startIndex = qsScreenMatch.index;
			const matchLength = qsScreenMatch[0].length;

			// also ensure this match actually goest first in the function code (not counting the header)
			const firstPrefixMatch = jsSrc.match(/\)\s*(?:=>)?\s*\{\s*/);
			if (firstPrefixMatch.index === startIndex) {
			    jsSrc = jsSrc.substring(0, startIndex) + 
					qsScreenMatch[1] + ' '.repeat(qsScreenMatch[2].length) + 
					jsSrc.substring(startIndex + matchLength);
			}
		}
	}

	var cursor = jsTokens(jsSrc, { startLine, startColumn }), endReached = false;

	function nextToken() {
		var theNext, afterNewline = false;
		NEXT:
		while (!endReached && !(theNext = cursor.next(), endReached = theNext.done)) {
			var theNextValue = theNext.value;
			switch (theNextValue.type) {
			case "WhiteSpace":
			case "MultiLineComment":
			case "SingleLineComment":
			case "HashbangComment":
			case "LineTerminatorSequence":
				if (Newline.test(theNextValue.value)) afterNewline = true;
				continue NEXT;
			}

			theNextValue.afterNewline = afterNewline;
			return theNextValue;
		}
	}

	function toSimplifiedToken(token) {
		var result = token; // construct inplace for performance

		switch (token.type) {
		case "StringLiteral":
		case "RegularExpressionLiteral":
		case "NumericLiteral":
			result.type = "literal";
			return result;

		case "TemplateHead":
		case "TemplateMiddle":
			result.type = "tfrag";
			result.tfragValue = token.value.slice(1, -2);
			return result;

		case "TemplateTail":
		case "NoSubstitutionTemplate":
			result.type = "tfrag";
			result.tfragValue = token.value.slice(1, -1);
			return result;

		case "IdentifierName":
		case "PrivateIdentifier":
			result.type = "id";
			return result;

		default:
			result.type = "symbol";
			return result;
		}
	}

	const bracketClosers = {
		__proto__: null,
		"{": ((t) => t.value === "}"),
		"[": ((t) => t.value === "]"),
		"(": ((t) => t.value === ")")
	};

	const middleOrTail = ((t) => t.srcType === "TemplateMiddle" || t.srcType === "TemplateTail");

	function parseNoise(target, endChecker) {
		NEXT_TOKEN:
		for (var token = nextToken(); token; token = nextToken()) {

			// it is an expected closing token - return it
			if (endChecker && endChecker(token)) return token;

			// is it bracket run starter?
			var bracketCloser = bracketClosers[token.value];
			if (bracketCloser) {
				var noiseToken = {
					line: token.line,
					column: token.column,
					type: "noise",
					noise: [ toSimplifiedToken(token) ], // will be appended further
					isBracedNoise: token.value === "{",
					isBracketedNoise: token.value === "[",
					isParenthesizedNoise: token.value === "(",
					afterNewline: token.afterNewline
				};
				target.push(noiseToken);

				var finisher = parseNoise(noiseToken.noise, bracketCloser);
				if (finisher) {
					noiseToken.noise.push(finisher);
				}
				continue;
			}
			
			// is it a template starter?
			if (token.type === "TemplateHead") {
				var noiseToken = {
					line: token.line,
					column: token.column,
					type: "noise",
					noise: [ toSimplifiedToken(token) ], // will be appended further
					isStringTemplate: true,
					afterNewline: token.afterNewline
				};
				target.push(noiseToken);

				for (;;) {
					var inargNoise = new Array();
					var nextTFrag = parseNoise(inargNoise, middleOrTail);
					noiseToken.noise.push({
						line: inargNoise.length > 0 ? inargNoise[0].line : 0,
						column: inargNoise.length > 0 ? inargNoise[0].column : 0,
						type: "noise",
						noise: inargNoise,
						afterNewline: inargNoise[0] && inargNoise[0].afterNewline
					});
					if (nextTFrag) {
						noiseToken.noise.push(toSimplifiedToken(nextTFrag));
						if (nextTFrag.srcType === "TemplateTail") continue NEXT_TOKEN;
					} else if (!nextTFrag) {
						// unclosed end of input
						return null;
					}
					// otherwise it is TemplateMiddle - proceed to next fragment
				}
			}

			if (token.type === "NoSubstitutionTemplate") {
				target.push({
					line: token.line,
					column: token.column,
					type: "noise",
					noise: [ toSimplifiedToken(token) ], // a single element template string
					isStringTemplate: true,
					afterNewline: token.afterNewline
				});
				continue NEXT_TOKEN;
			}

			// neither of these - just push the token
			target.push(toSimplifiedToken(token));
		}
	}


	var result = new Array();
	parseNoise(result, false);

	return result;
}

// noise manipulation and tokens matching

const TkMatchNull = (token) => !token;

function newMatcherByValue(value) {
	return (token) => token && token.value === value;
}

const TkMatchOpenPar = newMatcherByValue("("),
	TkMatchOpenBracket = newMatcherByValue("["),
	TkMatchOpenBrace = newMatcherByValue("{"),
	TkMatchClosePar = newMatcherByValue(")"),
	TkMatchCloseBracket = newMatcherByValue("]"),
	TkMatchCloseBrace = newMatcherByValue("}"),
	// misc punctuators
	TkMatchQmark = newMatcherByValue("?"),
	TkMatchColon = newMatcherByValue(":"),
	TkMatchSemicolon = newMatcherByValue(";"),
	TkMatchRightArrow = newMatcherByValue("=>"),
	TkMatchDot = newMatcherByValue("."),
	TkMatchDots = newMatcherByValue("..."),
	TkMatchComma = newMatcherByValue(","),
	TkMatchAssign = newMatcherByValue("="),
	TkMatchStar = newMatcherByValue("*"),
	// single keywords
	TkMatchCase = newMatcherByValue("case"),
	TkMatchElse = newMatcherByValue("else"),
	TkMatchCatch = newMatcherByValue("catch"),
	TkMatchFinally = newMatcherByValue("finally"),
	TkMatchExtends = newMatcherByValue("extends"),
	TkMatchStatic = newMatcherByValue("static"),
	TkMatchAsync = newMatcherByValue("async"),
	TkMatchFunction = newMatcherByValue("function"),
	TkMatchFor = newMatcherByValue("for"),
	TkMatchWhile = newMatcherByValue("while"),
	TkMatchIf = newMatcherByValue("if"),
	TkMatchSwitch = newMatcherByValue("switch");

function newMatcherByType(type) {
	return (token) => token && token.type === type;
}

const TkMatchTokenID = newMatcherByType("id"),
	TkMatchTokenSymbol = newMatcherByType("symbol"),
	TkMatchTokenLiteral = newMatcherByType("literal"),
	TkMatchTokenNoise = newMatcherByType("noise"),
	TkMatchTokenTFrag = newMatcherByType("tfrag"),
	TkMatchEtc = newMatcherByType("etc"); // in the end of array matcher, means "matches the rest of the test noise"

function TkMatchTokenBoundedNoise(matcher1, matcher2) {
	return (token) => token && token.type === 'noise' && token.noise.length > 0 &&
				matcher1(token.noise[0]) && matcher2(token.noise[token.noise.length - 1]);
}

const TkMatchTokenParenthesizedNoise = TkMatchTokenBoundedNoise(TkMatchOpenPar, TkMatchClosePar),
	TkMatchTokenBracketedNoise = TkMatchTokenBoundedNoise(TkMatchOpenBracket, TkMatchCloseBracket),
	TkMatchTokenBracedNoise = TkMatchTokenBoundedNoise(TkMatchOpenBrace, TkMatchCloseBrace),
	TkMatchTokenTFragNoise = TkMatchTokenBoundedNoise(TkMatchTokenTFrag, TkMatchTokenTFrag);
	
function newMatcherByRegexp(regexp) {
	return (token) => token && typeof (token.value) === 'string' && regexp.test(token.value);
}

// given a noise provided as an array of tokens, or a noise token, or a single non-noise token (treated as one-element noise),
// casts it to array of its component tokens
function castNoiseToArray(noiseTokenOrArr) {
	if (!noiseTokenOrArr) return [];
	return noiseTokenOrArr.type ? (noiseTokenOrArr.type === 'noise' ? noiseTokenOrArr.noise : [noiseTokenOrArr]) : noiseTokenOrArr;
}

function castToNoiseToken(noiseArrOrToken) {
	if (!noiseArrOrToken) {
		// empty token or non-token, hence an empty noise
		return {
			type: "noise",
			noise: []
		};
	}

	if (Array.isArray(noiseArrOrToken)) {
		var resultArray = noiseArrOrToken; // convert array in place (we won't use its source version anyway)
		for (var i = 0; i < noiseArrOrToken.length; i++) {
			var element = noiseArrOrToken[i];
			if (!element || !element.type) {
				// a non-token encountered - attempt to cast in-place
				if (Array.isArray(element)) resultArray[i] = castToNoiseToken(element);
				else throw new Error("Invalid noise element type");
			}
		}
		return {
			line: noiseArrOrToken.length > 0 ? noiseArrOrToken[0].line : undefined,
			column: noiseArrOrToken.length > 0 ? noiseArrOrToken[0].column : undefined,
			type: "noise",
			noise: resultArray
		};
	}

	// otherwise, assuming a token
	if (noiseArrOrToken.type === "noise") return noiseArrOrToken;

	// otherwise, assuming a single token
	return {
		line: noiseArrOrToken.line,
		column: noiseArrOrToken.column,
		type: "noise",
		noise: [noiseArrOrToken]
	};
}

function newNoiseMatcher(templateArr) {
	for (var i = 0; i < templateArr.length; i++) {
		if (typeof (templateArr[i]) === 'string')
			templateArr[i] = newMatcherByValue(templateArr[i]);
	}
	const len = templateArr.length;
	return (noiseTokenOrArr, startAt) => {
		var noise = castNoiseToArray(noiseTokenOrArr);
		for (var i = 0; i < len; i++) {
			//if (templateArr[i] === TkMatchEtc) return true; // reached "etc" end of the matcher
			//^ this was never used for now, so commented out, but leaving it be for possible future improvements
			if (!templateArr[i](noise[startAt + i])) return false;
		}
		return true;
	};
}

function newTokenNoiseMatcher(templateArr) {
	const noiseMatcher = newNoiseMatcher(templateArr);
	return (token) => token && token.noise && noiseMatcher(token.noise, 0);
}

// after reading through how all this stuff is used across the code and a certain dose of backtracking,
// you will understand the value of STATIC and PRECALC from our toolkit
const NsMatch_ID_Colon = newNoiseMatcher([TkMatchTokenID, TkMatchColon]),
	NsMatch_Async_Function = newNoiseMatcher([TkMatchAsync, TkMatchFunction]),
	NsMatch_ID_ParenthesizedNoise_BracedNoise = newNoiseMatcher([TkMatchTokenID, TkMatchTokenParenthesizedNoise, TkMatchTokenBracedNoise]),
	NsMatch_BracketedNoise_ParenthesizedNoise_BracedNoise = newNoiseMatcher([TkMatchTokenBracketedNoise, TkMatchTokenParenthesizedNoise, TkMatchTokenBracedNoise]),
	NsMatch_Star_ID_ParenthesizedNoise_BracedNoise = newNoiseMatcher([TkMatchStar, TkMatchTokenID, TkMatchTokenParenthesizedNoise, TkMatchTokenBracedNoise]),
	NsMatch_Star_BracketedNoise_ParenthesizedNoise_BracedNoise = newNoiseMatcher([TkMatchStar, TkMatchTokenBracketedNoise, TkMatchTokenParenthesizedNoise, TkMatchTokenBracedNoise]),
	NsMatch_Dots_ID = newNoiseMatcher([TkMatchDots, TkMatchTokenID]),
	NsMatch_Dot_ID = newNoiseMatcher([TkMatchDot, TkMatchTokenID]),
	NsMatch_For_ParenthesizedNoise = newNoiseMatcher([TkMatchFor, TkMatchTokenParenthesizedNoise]),
	NsMatch_While_ParenthesizedNoise = newNoiseMatcher([TkMatchWhile, TkMatchTokenParenthesizedNoise]),
	NsMatch_If_ParenthesizedNoise = newNoiseMatcher([TkMatchIf, TkMatchTokenParenthesizedNoise]),
	NsMatch_Switch_ParenthesizedNoise_BracedNoise_Null = newNoiseMatcher([TkMatchSwitch, TkMatchTokenParenthesizedNoise, TkMatchTokenBracedNoise, TkMatchNull]),
	NsMatch_OpenPar_NoiseID_ClosePar_Null = newNoiseMatcher([TkMatchOpenPar, newTokenNoiseMatcher([TkMatchTokenID]), TkMatchClosePar, TkMatchNull]),
	NsMatch_ID_Semicolon_Null = newNoiseMatcher([TkMatchTokenID, TkMatchSemicolon, TkMatchNull]),
	NsMatch_ID_Null = newNoiseMatcher([TkMatchTokenID, TkMatchNull]),
	NsMatch_Dot_ID_Null = newNoiseMatcher([TkMatchDot, TkMatchTokenID, TkMatchNull]),
	NsMatch_BracketedNoise_Null = newNoiseMatcher([TkMatchTokenBracketedNoise, TkMatchNull]),
	NsMatch_Function_ID_ParenthesizedNoise_BracedNoise = newNoiseMatcher([TkMatchFunction, TkMatchTokenID, TkMatchTokenParenthesizedNoise, TkMatchTokenBracedNoise]),
	NsMatch_Function_ParenthesizedNoise_BracedNoise = newNoiseMatcher([TkMatchFunction, TkMatchTokenParenthesizedNoise, TkMatchTokenBracedNoise]),
	NsMatch_ParenthesizedNoise_RightArrow_BracedNoise = newNoiseMatcher([TkMatchTokenParenthesizedNoise, TkMatchRightArrow, TkMatchTokenBracedNoise]),
	NsMatch_Async_Function_ID_ParenthesizedNoise_BracedNoise = newNoiseMatcher([TkMatchAsync, TkMatchFunction, TkMatchTokenID, TkMatchTokenParenthesizedNoise, TkMatchTokenBracedNoise]),
	NsMatch_Async_Function_ParenthesizedNoise_BracedNoise = newNoiseMatcher([TkMatchAsync, TkMatchFunction, TkMatchTokenParenthesizedNoise, TkMatchTokenBracedNoise]),
	NsMatch_Async_ParenthesizedNoise_RightArrow_BracedNoise = newNoiseMatcher([TkMatchAsync, TkMatchTokenParenthesizedNoise, TkMatchRightArrow, TkMatchTokenBracedNoise]);

// explode noise by a given delimiter token matcher and return the result as array of arrays,
// delimiters not included
function explodeNoise(noiseTokenOrArr, delimiterTokenMatcher, handleDelimiter = 'DISCARD') {
	var resultArrays = new Array(),
		currentArray = new Array(),
		noiseArr = castNoiseToArray(noiseTokenOrArr);
	for (var token of noiseArr) {
		if (delimiterTokenMatcher(token)) {
			// delimiter found, finalize the segemnt and begin the next
			switch (handleDelimiter) {
			case 'APPEND': // append delimiter to the previous segment
				currentArray.push(token);
				resultArrays.push(currentArray);
				break;
			case 'KEEP':  // append delimiter as next segment
				resultArrays.push(currentArray);
				resultArrays.push([token]);
			default: // (incl. 'DISCARD') discard the delimiter
				resultArrays.push(currentArray);
			}
			currentArray = new Array();
		} else {
			currentArray.push(token);
		}
	}

	// push the tail
	resultArrays.push(currentArray);

	return resultArrays;
}

function unwrapParenthesizedNoiseToken(noiseToken) {
	while (noiseToken.isParenthesizedNoise) {
		noiseToken = noiseToken.noise[1];
	}
	return noiseToken;
}

function newBlankNoiseToken() {
	return { type: "noise", noise: new Array() };
}

//
// source map emission
//

const integerToChar = new Object();
'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
.split('')
.forEach(function (char, i) {
	integerToChar[i] = char;
});

function encodeVLQ(value) {
	let result = '';
	for (let i = 0; i < value.length; i += 1) {
		result += encodeVLQInt(value[i]);
	}
	return result;
}

function encodeVLQInt(num) {
	let result = '';
	if (num < 0) {
		num = (-num << 1) | 1;
	} else {
		num <<= 1;
	}

	do {
		let clamped = num & 31;
		num >>>= 5;
		if (num > 0) {
			clamped |= 32;
		}

		result += integerToChar[clamped];
	} while (num > 0);

	return result;
}

var NEWLINES_REGEXP = /\r\n?|[\n\u2028\u2029]/g;

function encodeAlmostURI(str) {
	var replacements = {
		"#": "%23",
		"?": "%3F",
		"&": "%26",
		"=": "%3D",
		"%22": "\"",
		"%5B": "[",
		"%5D": "]",
		"%7B": "{",
		"%7D": "}",
		"%2C": ",",
	};
	return encodeURI(str).replace(/[#?&=]|%([57][BD]|2[2C])/g, (m) => replacements[m]);
}

function emitWithSourceMap(noise, srcName, inputCode, qsConfig) {
	var emittedResult = new Array(),
		emittedColumn = 0,
		lastEmittedColumn = 0,
		lastTokenLine = 0,
		prevLineToken = null,
		mappings = new Array(),
		mappingsLine = new Array(),
		sources = [srcName],
		sourcesContent = inputCode ? [inputCode] : [],
		requireNewline = false,
		prevReturn = false;

	function emitMappingForToken(token) {
		if (typeof (token.line) === 'number') {
			mappingsLine.push([
				emittedColumn - lastEmittedColumn,
				0, // we have only 1 source file
				token.line,
				token.column
			]);
		} else {
			// token with no mapping
			mappingsLine.push([
				emittedColumn - lastEmittedColumn
			]);
		}
	}

	function flushMappingsLine() {
		mappings.push([...mappingsLine]);
		mappingsLine.length = 0;
	}

	if (!qsConfig.generateSourceMap) {
		emitMappingForToken = flushMappingsLine = function() {}
	}

	function emitNoise(noise) {
		for (var token of noise) {
			// a noise token - emit recursively
			if (token.noise) {
				emitNoise(token.noise);
				continue;
			}

			// just a single token - emit as is
			if ((typeof (token.line) === 'number' && lastTokenLine !== token.line && !prevReturn) || requireNewline) {
				requireNewline = false;
				lastTokenLine = token.line;
				emittedResult.push("\n");
				emittedColumn = 0;
				lastEmittedColumn = 0;
				flushMappingsLine();
				prevLineToken = null;
			} else {
				///*
				if (prevLineToken &&
					!(!/[,:;]$/.test(prevLineToken.value) && /^[\[\(\{,:;\]\}\)]/.test(token.value))&&
					!/^[\[\(]/.test(prevLineToken.value) &&
					!/[\]\}\)]$/.test(prevLineToken.value) &&
					//!(/^\./.test(token.value) && !/\.$/.test(prevLineToken.value)) &&
					//!(!/^\./.test(token.value) && /\.$/.test(prevLineToken.value))) 
					//^ these are actually not possible in a valid JS code
					!(/^\./.test(token.value) || /\.$/.test(prevLineToken.value))) {
					emittedResult.push(" ");
					emittedColumn++;
				}
				//*/
				//if (prevLineToken) emittedResult.push(" "); // allegedly more performant
				//emittedColumn++;
			}

			emittedResult.push(token.value);
			prevLineToken = token;
			emitMappingForToken(token);
			lastEmittedColumn = emittedColumn;
			emittedColumn += token.value.length;
			// ^not quite correct for multi-line token, but in that case it will be \n-case corrected on next token

			// flush mappings line once for every newline inside the token.value
			var newlineMatches = token.value.match(NEWLINES_REGEXP);
			if (newlineMatches) {
				for (var i = 0; i < newlineMatches.length; i++) {
					flushMappingsLine();
				}
				requireNewline = true; // also in this case we explicitly require a newline for the next token
				// (which requires to start over from 0th column to make up for the introduced emittedColumn discrepancy)
			}

			prevReturn = (token.value === "return");
		}
	}

	emitNoise(noise);
	flushMappingsLine();

	if (qsConfig.generateSourceMap) {
		// correct mappings to use offsets as per fucked-up sourcemap convention
		var last0, last1 = 0, last2 = 0, last3 = 0; // last0's are already filled
		for (var i = 0; i < mappings.length; i++) {
			var mapLine = mappings[i];
			for (var j = 0; j < mapLine.length; j++) {
				var [newLast0, newLast1, newLast2, newLast3] = mapLine[j];
				if (typeof (newLast1) === 'number') {
					mapLine[j] = encodeVLQ([
						newLast0,
						newLast1 - last1,
						newLast2 - last2,
						newLast3 - last3
					]);
					[last0, last1, last2, last3] = [newLast0, newLast1, newLast2, newLast3];
				} else {
					mapLine[j] = encodeVLQ([
						newLast0
					]);
					last0 = newLast0;
				}
			}
			mappings[i] = mapLine.join(',');
		}

		var sourceMap = JSON.stringify({
			version: 3,
			file: srcName,
			//sourceRoot: "\\",
			sourceRoot: "", // seems to perform more correct than '\' when browser tries to load sources
			sources,
			sourcesContent,
			mappings: mappings.join(';'),
			names: []
		});
	} else {
		var sourceMap = "";
	}

	return [emittedResult.join(''), sourceMap];
}

if (typeof (exports) !== 'undefined') {
	function encodeBase64(str) {
		return Buffer.from(str).toString('base64');
	}
} else {
	function encodeBase64(str) {
		return btoa(str);
	}
}

// for algebras
const TYPENAME_DYNAMIC = "dynamic",
	TYPENAME_VOID = "void";

// the main preprocessor

function Preprocessor(srcFile, qsConfig, runtimeConfig) {

var commentTokens;
const NO_COMMENTS = [];

// comments or empty, depending on "generateComments" section
if (qsConfig.generateComments)
	commentTokens = function commentTokens(commentText) {	
		return [{ type: "other", value: `/* ${commentText} */` }];
	};
else
	commentTokens = function commentTokens() { return NO_COMMENTS; }

const
	ID_TRY = qsConfig.keywordOverrides.TRY || "TRY",
	ID_THROW = qsConfig.keywordOverrides.THROW || "THROW",
	ID_CATCH = qsConfig.keywordOverrides.CATCH || "CATCH",
	ID_FINALLY = qsConfig.keywordOverrides.FINALLY || "FINALLY",
	ID_SCOPE = qsConfig.keywordOverrides.SCOPE || "SCOPE",
	ID_STATIC = qsConfig.keywordOverrides.STATIC || "STATIC",
	ID_PRECALC = qsConfig.keywordOverrides.PRECALC || "PRECALC",
	ID_REF = qsConfig.keywordOverrides.REF || "REF",
	ID_BIND = qsConfig.keywordOverrides.BIND || "BIND",
	ID_PIN = qsConfig.keywordOverrides.PIN || "PIN",
	ID_DEFINED = qsConfig.keywordOverrides.DEFINED || "DEFINED";

const ERROR_EXPLICIT_SEMICOLON = "QS disallows optional semicolons and object/statement ambiguity - use explicit ';' or '(...)' to elaborate expression or statement delimitation, and explicit newline between consecutive block statements";

// syntax error helper

function getAtomicToken(token, fallbackToken) {
	if (token) {
		// drill down to the first atomic token
		while (token.type == 'noise' && token.noise.length > 0) token = token.noise[0];
	}

	// fallback token is the previous token to use in case if the main token is null (past input stream)
	if (fallbackToken) {
		// drill down to the last atomic token
		while (fallbackToken.type == 'noise' && fallbackToken.noise.length > 0) fallbackToken = fallbackToken.noise[fallbackToken.noise.length - 1];
	}

	token = token || fallbackToken;

	while (token.type == 'noise' && token.noise.length > 0) token = token.noise[0];

	return token;
}

function throwSyntaxError(message, token, fallbackToken) {
	token = getAtomicToken(token, fallbackToken);
	if (token.type === 'placeholder') token.value = "static tag expression arg #" + (token.value + 1); // a case possible inside algebra static tags
	var line = token.line;
	var error = new SyntaxError(srcFile + ":" + (token.line + 1) + ", '" + token.value + "': " + message, srcFile, token.line);
	throw error;
}

// elements parser
// note: we intentionally don't add many validations, as we assume the parser input already passed JS compiler

// statement in expr:
// (...) { ... }
// => { ... }

// something that ends with a colon, inclusive
// return it as token
function parseOutLabelOrCase(cursor) {
	var cursorNoise = cursor.noise,
		result = new Array(),
		caseExpr = new Array();
	var qmark = 0; // count question marks stack
	var colonOk = false;

	result.push(cursorNoise[cursor.at++]); // 'case' or label name
	result.push(caseExpr);

	for (; cursor.at < cursorNoise.length;) {
		var token = cursorNoise[cursor.at++];
		if (TkMatchQmark(token)) qmark++;
		if (TkMatchColon(token) && (--qmark < 0)) {
			colonOk = true;
			result.push(token);
			break;
		}
		caseExpr.push(token);
	}

	// parse the expression under case
	result[1] = parseExpression(caseExpr);

	// if no colon until end of the noise, add artificial colon to cover an edge case
	if (!colonOk) result.push({ type: "symbol", value: ":" });

	result = castToNoiseToken(result);
	[result.labelName, result.tokenLabel, result.tokenCaseExpr, result.tokenColon] = [
		result.noise[0].value,
		result.noise[0],
		result.noise[1],
		result.noise[2]
	];
	return result;
}

function parseOutSingleStatement(cursor, insideSwitch) {
	var cursorNoise = cursor.noise;
	var labels = new Array(),
		hasCatch = false,
		hasFinally = false,
		hasScope = false;
	while (NsMatch_ID_Colon(cursorNoise, cursor.at) ||
		TkMatchCase(cursorNoise[cursor.at])) {
		var label = parseOutLabelOrCase(cursor);
		labels.push(label);
		// use token ref rather than flag for possible error construction
		if (label.labelName == ID_FINALLY) hasFinally = label;
		if (label.labelName == ID_CATCH) hasCatch = label;
		if (label.labelName == ID_SCOPE) hasScope = label;
	}

	var result = [...labels],
		statement,
		nextToken = cursorNoise[cursor.at];

	function parseOutEnclosedExpression(cursor) {
		var parNoise = cursor.noise[cursor.at],
			result = new Array(),
			opener;
		cursor.at++;

		var unwrappedExpressionNoise = parNoise.noise.slice(1, -1);
		result.push(opener = parNoise.noise[0]); // '(' (or '{')
		result.push(parseExpression(unwrappedExpressionNoise)); // the actual parenthesized stuff
		result.push(parNoise.noise[parNoise.noise.length - 1]); // ')' (or '}')

		result = castToNoiseToken(result);
		[result.isParenthesizedNoise, result.isBracedNoise] = [opener.value == '(', opener.value == '{'];
		return result;
	}

	if (TkMatchTokenBracedNoise(nextToken)) {
		cursor.at++;
		result.push(statement = parseBlockStatement(nextToken, false));
	} else if (nextToken && nextToken.type != 'noise') {
		switch (nextToken.value) {
		case "if":
			statement = new Array();
			statement.push(nextToken);
			cursor.at++; // the 'if'
			statement.push(parseOutEnclosedExpression(cursor)); // (...)
			statement.push(parseOutSingleStatement(cursor, false)); // post-if statement
			nextToken = cursorNoise[cursor.at]; // check for else
			if (TkMatchElse(nextToken)) {
				// 'else' is present
				statement.push(nextToken);
				cursor.at++; // the 'else'
				statement.push(parseOutSingleStatement(cursor, false)); // post-else statement
			}
			statement = castToNoiseToken(statement);
			result.push(statement);
			break;
		case "for":
		case "while":
			statement = new Array();
			statement.push(nextToken);
			cursor.at++; // the 'for'/'while'
			if (cursor.noise[cursor.at].value == "await") {
				statement.push(cursor.noise[cursor.at++]); // 'for await'
			}
			statement.push(parseOutEnclosedExpression(cursor)); // (...)
			statement.push(parseOutSingleStatement(cursor, false)); // loop body statement
			statement = castToNoiseToken(statement);
			result.push(statement);
			break;
		case "switch":
			statement = new Array();
			statement.push(nextToken);
			cursor.at++; // the 'switch'
			statement.push(parseOutEnclosedExpression(cursor)); // (...)
			statement.push(parseBlockStatement(cursorNoise[cursor.at++], true)); // switch block
			statement = castToNoiseToken(statement);
			result.push(statement);
			break;
		case "do":
			statement = new Array();
			statement.push(nextToken);
			cursor.at++; // the 'do'
			statement.push(parseOutSingleStatement(cursor, false)); // post-do statement
			nextToken = cursorNoise[cursor.at];
			statement.push(nextToken);
			cursor.at++; // the 'while'
			statement.push(parseOutEnclosedExpression(cursor)); // (...)
			nextToken = cursorNoise[cursor.at];
			if (!TkMatchSemicolon(nextToken)) {
				throwSyntaxError(ERROR_EXPLICIT_SEMICOLON, nextToken, cursorNoise[cursor.at - 1]);
			}
			statement.push(nextToken);
			cursor.at++; // the ';'
			statement = castToNoiseToken(statement);
			result.push(statement);
			break;
		case "try":
			statement = new Array();
			statement.push(nextToken);
			cursor.at++; // the 'try'
			statement.push(parseBlockStatement(cursorNoise[cursor.at++], false)); // try block
			nextToken = cursorNoise[cursor.at];
			if (TkMatchCatch(nextToken)) {
				statement.push(nextToken);
				nextToken = cursorNoise[++cursor.at]; // the 'catch', and check for next '(...)'
				if (nextToken.isParenthesizedNoise) {
					statement.push(catchVar = parseOutEnclosedExpression(cursor)); // (...)
					nextToken = cursorNoise[cursor.at];
				}
				statement.push(parseBlockStatement(nextToken, false)); // catch block
				cursor.at++;
			}
			if (TkMatchFinally(nextToken)) {
				statement.push(nextToken);
				nextToken = cursorNoise[++cursor.at]; // the 'finally'
				statement.push(parseBlockStatement(nextToken, false)); // catch block
				cursor.at++;
			}
			statement = castToNoiseToken(statement);
			result.push(statement);
			break;
		case "class":
			statement = new Array();
			// search for class name or/and body, and accumulate everything before as expression
			var classExpr = new Array(), classNameToken, classBody, extendsFound = false;
			while (cursor.at < cursor.noise.length) {
				nextToken = cursorNoise[cursor.at];
				if (nextToken.isBracedNoise) break; // found the class body
				if (!extendsFound) {
					if (TkMatchExtends(nextToken)) {
						extendsFound = true;
					} else if (TkMatchTokenID(nextToken)) {
						classNameToken = nextToken;
					}
				}
				classExpr.push(nextToken);
				cursor.at++;
			}
			statement.push(parseExpression(classExpr));
			// append the class body as braced expression
			var classBody = parseOutEnclosedExpression(cursor); // {...}
			classBody.isFunctionBoundary = true;
			classBody.isClassBoundary = true;
			statement.push(classBody);
			statement = castToNoiseToken(statement);
			statement.functionNameToken = classNameToken; // name it "functionNameToken" for uniformity with function case
			result.push(statement);
			break;
		case "var":
		case "let":
		case "const":
			statement = new Array();
			statement.push(nextToken);
			cursor.at++; // the 'let'/'const'
			statement.push(parseOutExpressionLikeStatement(cursor));
			statement = castToNoiseToken(statement);
			result.push(statement);
			// extract the declarations
			statement.declarationType = nextToken.value;
			statement.declaredIds = parseDeclaredIds(statement.noise[1]);
			break;
		case "function":
			statement = new Array();
			// search for function body, and accumulate everything before as a generic noise
			var funcHeader = new Array(), isGenerator = false, functionNameToken;
			while (cursor.at < cursor.noise.length) {
				nextToken = cursorNoise[cursor.at];
				if (nextToken.value == "*") isGenerator = true;
				if (nextToken.isBracedNoise) break; // found the function body
				if (nextToken.isParenthesizedNoise) {
					// function args, parse as expression
					nextToken = parseOutEnclosedExpression({ at: 0, noise: [castToNoiseToken(nextToken.noise)] });
				}
				if (nextToken.type == "id") {
					functionNameToken = nextToken;
				}
				funcHeader.push(nextToken);
				cursor.at++;
			}
			statement.push(castToNoiseToken(funcHeader));
			// append the function body as a block statement
			var functionBody = parseBlockStatement(nextToken, false);
			[functionBody.isFunctionBoundary, functionBody.isAsync, functionBody.isGenerator] = [true, false, isGenerator];
			statement.push(functionBody);
			cursor.at++;
			statement = castToNoiseToken(statement);
			statement.functionNameToken = functionNameToken;
			result.push(statement);
			break;
		case "throw":
		case "break":
		case "continue":
		case "return":
			statement = new Array();
			statement.push(nextToken);
			cursor.at++; // the 'throw'/'break'/'continue'/'return'
			statement.push(parseOutExpressionLikeStatement(cursor));
			if (statement.length < 2 || statement[1].noise.length < 1 || statement[1].noise[statement[1].noise.length - 1].value != ';' ||
				statement[1].line != statement[0].line) {
				throwSyntaxError(ERROR_EXPLICIT_SEMICOLON, statement[0]);
			}
			statement = castToNoiseToken(statement);
			result.push(statement);
			break;
		default:
			if (NsMatch_Async_Function(cursorNoise, cursor.at)) {
				statement = new Array();
				// search for function body, and accumulate everything before as a generic noise
				var funcHeader = new Array(), isGenerator = false, functionNameToken;
				while (cursor.at < cursor.noise.length) {
					nextToken = cursorNoise[cursor.at];
					if (nextToken.value == "*") isGenerator = true;
					if (nextToken.isBracedNoise) break; // found the function body
					if (nextToken.isParenthesizedNoise) {
						// function args, parse as expression
						nextToken = parseOutEnclosedExpression({ at: 0, noise: [castToNoiseToken(nextToken.noise)] });
					}
					if (nextToken.type == "id") {
						functionNameToken = nextToken;
					}
					funcHeader.push(nextToken);
					cursor.at++;
				}
				statement.push(castToNoiseToken(funcHeader));
				// append the function body as a block statement
				var functionBody = parseBlockStatement(nextToken, false);
				[functionBody.isFunctionBoundary, functionBody.isAsync, functionBody.isGenerator] = [true, true, isGenerator];
				statement.push(functionBody);
				cursor.at++;
				statement = castToNoiseToken(statement);
				statement.functionNameToken = functionNameToken;
				result.push(statement);
				break;
			} else {
				// looks like an expression-like statement
				result.push(statement = parseOutExpressionLikeStatement(cursor));
				break;
			}
		}
	} else {
		result.push(statement = parseOutExpressionLikeStatement(cursor));
	}

	// all otherwise, parse an expression-like statement
	result = castToNoiseToken(result);
	result.labels = labels;
	result.isStatement = true;
	result.statement = statement;
	result.hasCatch = hasCatch;
	result.hasFinally = hasFinally;
	result.hasScope = hasScope;
	return result;
}

function parseExpression(exprNoise) {
	var result = new Array(),
		usesYield = false,
		usesAwait = false;

	// identify and prepare expression and statement braces, also deep-parse tfrags (template expressions)
	for (var i = 0; i < exprNoise.length; i++) {
		var nextToken = exprNoise[i];
		if (nextToken.isBracedNoise) {
			var prevToken = exprNoise[i - 1];
			if (TkMatchRightArrow(prevToken) || TkMatchStatic(prevToken) ||
				TkMatchTokenParenthesizedNoise(prevToken) &&
				!TkMatchExtends(exprNoise[i - 2])) {
				// braced block after =>, static or (...) (except when it is "extends (...)") is a statement
				nextToken = parseBlockStatement(nextToken, false);
			} else {
				// otherwise it is an expression (but we only mark so the actual braced part)
				var bracedExpr = nextToken.noise.slice(1, -1),
					openingBrace = nextToken.noise[0],
					closingBrace = nextToken.noise[nextToken.noise.length - 1];
				nextToken = castToNoiseToken([openingBrace, parseExpression(bracedExpr), closingBrace]);
				nextToken.isBracedNoise = true;
				nextToken.usesYield = nextToken.noise[1].usesYield;
				nextToken.usesAwait = nextToken.noise[1].usesAwait;
			}
		} else if (nextToken.isParenthesizedNoise || nextToken.isBracketedNoise) {
			// (...) and [...] are expressions (but we only mark so the actual bracketed part)
			var bracketedExpr = nextToken.noise.slice(1, -1),
				openingBracket = nextToken.noise[0],
				closingBracket = nextToken.noise[nextToken.noise.length - 1],
				{isBracketedNoise, isParenthesizedNoise} = nextToken;
			nextToken = castToNoiseToken([openingBracket, parseExpression(bracketedExpr), closingBracket]);
			[nextToken.isBracketedNoise, nextToken.isParenthesizedNoise] = [isBracketedNoise, isParenthesizedNoise];
			nextToken.usesYield = nextToken.noise[1].usesYield;
			nextToken.usesAwait = nextToken.noise[1].usesAwait;
		} else if (nextToken.type === 'noise' && TkMatchTokenTFrag(nextToken.noise[0])) {
			var templateNoise = nextToken.noise,
				templateArray = new Array();
			for (var j = 0; j < templateNoise.length; j += 2) {
				templateArray.push(templateNoise[j]); // tfrag
				if (templateNoise[j + 1]) {
					templateArray.push(parseExpression(templateNoise[j + 1].noise)); // parameter expr
				}
			}
			nextToken = castToNoiseToken(templateArray);
			nextToken.isExpression = true;
			nextToken.isStringTemplate = true;
		} else if ((nextToken.value == "yield" || nextToken.value == "await") && !TkMatchDot(prevToken) &&
			!(TkMatchTokenParenthesizedNoise(exprNoise[i + 1]) && TkMatchTokenBracedNoise(exprNoise[i + 2]))
			&& !TkMatchAssign(exprNoise[i + 1])
			&& !TkMatchSemicolon(exprNoise[i + 1])) {
			// a clear yield or await operator - not member access, not function/getter, not member declaration
			// store the yield/await tokens rather than true flag, in order to keep their source origin coordinates
			// and use them to compose the outer yield */await expression if needed
			usesYield = usesYield || (nextToken.value == "yield" && nextToken);
			usesAwait = usesAwait || (nextToken.value == "await" && nextToken);
		}
		usesYield = usesYield || nextToken.usesYield;
		usesAwait = usesAwait || nextToken.usesAwait;
		result.push(nextToken);
	}

	// process functions and classes
	var result2 = new Array(),
		expectFunctionOrClass = false,
		isClass,
		isAsync,
		isGenerator,
		extendsFound = false;
	for (var i = 0; i < result.length; i++) {
		if (expectFunctionOrClass) {
			if (result[i].value == "extends") {
				extendsFound = true;
			} else if (result[i].value == "*") {
				isGenerator = true;
			} else if (result[i].isBracedNoise) {
				// function/class body (they are already parsed appropriately)
				result[i].isFunctionBoundary = true;
				result[i].isAsync = isAsync;
				result[i].isGenerator = isGenerator;
				expectFunctionOrClass = false;
			}
		} else if (result[i].value == "class" || result[i].value == "function" ||
			NsMatch_ID_ParenthesizedNoise_BracedNoise(result, i) ||
			NsMatch_BracketedNoise_ParenthesizedNoise_BracedNoise(result, i) ||
			NsMatch_Star_ID_ParenthesizedNoise_BracedNoise(result, i) ||
			NsMatch_Star_BracketedNoise_ParenthesizedNoise_BracedNoise(result, i)) {
			expectFunctionOrClass = true;
			isClass = (result[i].value == "class");
			isAsync = TkMatchAsync(result[i - 1]);
			isGenerator = result[i].value == "*";
		} else if (TkMatchRightArrow(result[i + 1])) {
			isAsync = TkMatchAsync(result[i - 1]);
			isGenerator = false;
			result2.push(result[i], result[i + 1]);
			i += 2;
			if (result[i].isBracedNoise) {
				// arrow function has brace body (it is already parsed as statement)
				[result[i].isFunctionBoundary, result[i].isAsync, result[i].isGenerator] = [true, isAsync, isGenerator];
			} else {
				// arrow function has expression body, extract it all as a single noise
				var bodyExpr = new Array(), qmCount = 0;
				while (i < result.length && result[i].value !== "," && result[i].value !== ";" && 
					!(result[i].value === ":" && qmCount <= 0) ) {
					if (result[i].value === "?") qmCount++;
					else if (result[i].value === ":") qmCount--;
					bodyExpr.push(result[i++]);
				}
				bodyExpr = parseExpression(bodyExpr);
				[bodyExpr.isFunctionBoundary, bodyExpr.isAsync, bodyExpr.isGenerator] = [true, isAsync, isGenerator];
				bodyExpr.needsClosureTrap = true;
				result2.push(bodyExpr);
			}
			i--; // to make up for loop increment
			continue;
		} 

		result2.push(result[i]);
	}
	
	result = castToNoiseToken(result2);
	[result.isExpression, result.usesYield, result.usesAwait] = [true, usesYield, usesAwait];
	return result;
}

function parseDeclaredIds(declarationsNoise) {
	var result = new Set();

	function parseDeclarations(decNoise) {
		//var declarations = explodeNoise(decNoise, ",");
		var declarations = explodeNoise(decNoise, TkMatchComma);
		for (var declaration of declarations) {
			if (declaration.length <= 0) continue; // guard against terminating commas
			if (NsMatch_Dots_ID(declaration, 0)) {
				// destructured "...id"
				result.add(declaration[1].value);
				continue;
			}
			if (TkMatchColon(declaration[1])) {
				// destructured key-value
				parseDeclarations(declaration.slice(2));
				continue;
			}
			var dec0 = declaration[0];
			if (TkMatchTokenID(dec0)) {
				// a plain single ID
				result.add(dec0.value);
				continue;
			}
			if (dec0.isBracedNoise || dec0.isBracketedNoise) {
				// destructured array or object
				parseDeclarations(dec0.noise[1].noise); // in declarations context, it should be '[' expr-noise ']'
				continue;
			}
		}
	}

	parseDeclarations(declarationsNoise);
	return result;
}

const StatementStarter = /^(?:break|continue|const|do|else|for|if|let|return|throw|try|var|while)$/;
const IdBinaryOp = /^in(?:stanceof)?$/;
const IdUnaryOp = /^(?:new|delete|yield|void|await|throw|typeof)$/;
const IdFunctionAsyncClass = /^(?:function|async|class)$/;
const IdDoElseSemicolon = /^(?:do|else|;)$/;

const TkMatchStatementStarter = newMatcherByRegexp(StatementStarter),
	TkMatchIdBinaryOp = newMatcherByRegexp(IdBinaryOp),
	TkMatchIdUnaryOp = newMatcherByRegexp(IdUnaryOp),
	TkMatchIdFunctionAsyncClass = newMatcherByRegexp(IdFunctionAsyncClass),
	TkMatchIdDoElseSemicolon = newMatcherByRegexp(IdDoElseSemicolon);

function parseOutExpressionLikeStatement(cursor) {
	var result = new Array(),
		cursorNoise = cursor.noise,
		nextToken = cursorNoise[cursor.at],
		expectBracesOrArrow = false;
	if (!nextToken) {
		throwSyntaxError(ERROR_EXPLICIT_SEMICOLON, nextToken, cursorNoise[cursor.at - 1]);
	};
	// it is at least 1 token long
	cursor.at++;
	result.push(nextToken);

	if (!TkMatchSemicolon(nextToken)) {
		// it is was not a rightaway semicolon - scan futher

		for (; cursor.at < cursorNoise.length;) {
			var nextToken = cursorNoise[cursor.at];
			if (TkMatchSemicolon(nextToken)) {
				// it is a terminating semicolon
				cursor.at++;
				result.push(nextToken);
				break;
			}

			if (expectBracesOrArrow) {
				cursor.at++;
				result.push(nextToken);
				if (nextToken.isBracedNoise || nextToken.value == '=>') {
					expectBracesOrArrow = false;
				}
				continue;
			}

			// '.identifier' is a legit part of the expression for _any_ identifier
			if (NsMatch_Dot_ID(cursorNoise, cursor.at)) {
				result.push(cursorNoise[cursor.at++]); // the '.'
				result.push(cursorNoise[cursor.at++]); // the ID
				continue;
			}

			if (TkMatchStatementStarter(nextToken)) {
				// these can not occur mid expression statement, so it is start of next statement - finish before it
				break;
			}

			if (TkMatchCase(nextToken) ||
				NsMatch_ID_Colon(cursorNoise, cursor.at)) {
				// label can not occur mid expression statement as well, so it is the start of next statement
				break;
			}

			var prevToken = cursorNoise[cursor.at - 1];

			if (TkMatchTokenID(nextToken) &&
				!TkMatchIdBinaryOp(nextToken)) {
				if (TkMatchTokenBracedNoise(prevToken)) {
					// a non-binary op ID following braces, or braces, is likely a next statement
					break;
				}
				if (TkMatchTokenSymbol(prevToken) ||
					TkMatchIdUnaryOp(prevToken)) {
					// a non-binary op ID following a symbol, likely an operator, or an id-type unary operator -
					// likely the continued expression
					cursor.at++;
					result.push(nextToken);
					if (TkMatchIdFunctionAsyncClass(nextToken)) {
						expectBracesOrArrow = true;
					}
					continue;
				}
				if (!TkMatchTokenBracedNoise(prevToken)) {
					// otherwise, only a brace noise (assuming an object in this context) is inappropriate
					throwSyntaxError(ERROR_EXPLICIT_SEMICOLON, nextToken);
				}
			}

			if (TkMatchTokenBracedNoise(prevToken) &&
				nextToken.afterNewline) {
				// something right after braces on newline in an expression statement context is ambiguous, so disallow it
				throwSyntaxError(ERROR_EXPLICIT_SEMICOLON, nextToken);
			}

			if (TkMatchIdFunctionAsyncClass(nextToken)) {
				expectBracesOrArrow = true;
			}

			// other tokens can be pushed as is
			cursor.at++;
			result.push(nextToken);
		}

	}

	// must end in semicolon or a block statement
	var lastToken = result[result.length - 1];
	if (lastToken && (!lastToken.isBracedNoise && lastToken.value != ';')) {
		nextToken = cursorNoise[cursor.at];
		throwSyntaxError(ERROR_EXPLICIT_SEMICOLON, nextToken, lastToken);
	}

	return parseExpression(result);
}

// the '{...}' noise, identified as a block statement
function parseBlockStatement(bracedNoiseToken, insideSwitch) {
	var openingBrace = bracedNoiseToken.noise[0],
		closingBrace = bracedNoiseToken.noise[bracedNoiseToken.noise.length - 1],
		cursor = { at: 0, noise: bracedNoiseToken.noise.slice(1, -1) },
		components = new Array();

	{
		// strip of labels and pre-validate
		let interimNoise = new Array(),
			interimCursor = { ...cursor },
			wasLabel = false;
		for (; interimCursor.at < interimCursor.noise.length;) {
			if (NsMatch_ID_Colon(interimCursor.noise, interimCursor.at) ||
				TkMatchCase(interimCursor.noise[interimCursor.at])) {
				parseOutLabelOrCase(interimCursor);
				wasLabel = true;
				continue;
			}
			var nextToken = interimCursor.noise[interimCursor.at++],
				i = interimNoise.length - 1;
			// statement starters (that includes first tokens after label runs) can only follow ';' or '}', or for (...)/while (...)/do/if (...)/else, or be first in the stream
			if ((wasLabel || TkMatchStatementStarter(nextToken)) &&
				!(interimNoise[i] && interimNoise[i].isBracedNoise) &&
				!TkMatchNull(interimNoise[i]) &&
				!TkMatchIdDoElseSemicolon(interimNoise[i]) &&
				!NsMatch_For_ParenthesizedNoise(interimNoise, i - 1) &&
				!NsMatch_While_ParenthesizedNoise(interimNoise, i - 1) &&
				!NsMatch_If_ParenthesizedNoise(interimNoise, i - 1)) {
				throwSyntaxError(ERROR_EXPLICIT_SEMICOLON, nextToken);
			}

			// '(...)'/'[...]'/'{...}' on same line as preceding '{...}' is disallowed as explicitly ambiguous
			if (!nextToken.afterNewline &&
				(TkMatchTokenParenthesizedNoise(nextToken) ||
				TkMatchTokenBracketedNoise(nextToken) ||
				TkMatchTokenBracedNoise(nextToken)) &&
				TkMatchTokenBracedNoise(interimNoise[i])) {
				throwSyntaxError(ERROR_EXPLICIT_SEMICOLON, nextToken);
			}

			// no issues at this point, accept the token for now...
			wasLabel = false;
			//interimNoise.push(interimCursor.noise[interimCursor.at++]);
			interimNoise.push(nextToken);
		}
	}

	// parse single statements
	for (; cursor.at < cursor.noise.length;) {
		components.push(parseOutSingleStatement(cursor, insideSwitch));
	}

	var result = castToNoiseToken([openingBrace, components, closingBrace]);
	[result.isStatement, result.statements, result.isBracedNoise, result.insideSwitch] = [true, components, true, insideSwitch];
	return result;
}

// preprocessor context
var internalIdIdx = 0;
const scopeBlockStack = new Array(), functionBlockStack = new Array();
const initialDeclarations = newBlankNoiseToken();
const internalPrefix = qsConfig.internalPrefix || "__QS_";

function newInternalId() {
	return internalPrefix + (internalIdIdx++);
}

var masterArgId = newInternalId();

function newScopeBlock() {
	return {
		isComplexBlock: false, // complex block is one with FINALLYs and/or CATCHs
		extraLets: new Set(),
		scopeMarks: {
			__proto__: null
			// scope ID => [block, noise, catchFenced]
		}
	};
}

function getCurrentScopeBlock(level = 0) {
	return scopeBlockStack[scopeBlockStack.length - 1 + level];
}

function getCurrentFunctionBlock() {
	return functionBlockStack[functionBlockStack.length - 1];
}

function pushScopeBlock(scopeBlock, isFunctionBoundary, isClassBoundary) {
	scopeBlockStack.push(scopeBlock);
	scopeBlock.isClassBoundary = isClassBoundary;
	if (isFunctionBoundary) functionBlockStack.push(scopeBlock);
	return scopeBlock;
}

function popScopeBlock() {
	var block = scopeBlockStack.pop();
	if (functionBlockStack[functionBlockStack.length - 1] === block) functionBlockStack.pop();
}

function getScopeMark(scopeMark, lookParents = true) {
	for (var i = scopeBlockStack.length - 1; i >= 0; i--) {
		var result = scopeBlockStack[i].scopeMarks[scopeMark];
		if (result) {
			if (i < scopeBlockStack.length - 1) {
				// lookup with parents means this mark is being used in this scope, so pull it down
				scopeBlockStack[scopeBlockStack.length - 1].scopeMarks[scopeMark] = result;
			}
			return result;
		}
		if (!lookParents) break;
	}

	return null;
}

function setAddAll(set, all) {
	for (var one of all) set.add(one);
}

function setRemoveAll(set, all) {
	for (var one of all) set.delete(one);
}

function preprocessSingleStatement(statementToken, caseExprPreprocessor = null) {
	var labels = new Array();
	for (var label of statementToken.labels) {
		var preprocessedLabel = new Array();
		preprocessedLabel.push(label.tokenLabel);
		preprocessedLabel.push(caseExprPreprocessor && label.labelName == 'case' ?
			caseExprPreprocessor.preprocessCaseExpr(label.tokenCaseExpr) : preprocessExpression(label.tokenCaseExpr, true));
		if (label.labelName == 'default' && caseExprPreprocessor) caseExprPreprocessor.defaultFound();
		preprocessedLabel.push(label.tokenColon);
		labels.push(castToNoiseToken(preprocessedLabel));
	}

	var statement = statementToken.statement;
	if (statement.isBracedNoise) {
		statement = preprocessBlockStatement(statement, false);
	} else {
		if (NsMatch_Switch_ParenthesizedNoise_BracedNoise_Null(statementToken.statement.noise, 0)) {
			// handle switch specially
			var sourceSwitchNoise = statementToken.statement.noise,
				preprocessedSwitchNoise = new Array();
			preprocessedSwitchNoise.push(sourceSwitchNoise[0]); // 'switch'
			preprocessedSwitchNoise.push(preprocessExpression(sourceSwitchNoise[1])); // switch expression
			preprocessedSwitchNoise.push(preprocessBlockStatement(sourceSwitchNoise[2], true)); // switch body
			statement = castToNoiseToken(preprocessedSwitchNoise);
		} else {
			statement = preprocessExpression(statement, true);
		}
	}

	var result = castToNoiseToken([...labels, statement]);
	result.isStatement = true;
	return result;
}

// insideSwitch == false or true
// the block here must be unwrapped from labels!
function preprocessBlockStatement(blockStatementToken, insideSwitch, caseExprPreprocessor = null) {
	var openingBrace = blockStatementToken.noise[0],
		statements = blockStatementToken.statements,
		closingBrace = blockStatementToken.noise[2],
		currentScopeBlock = pushScopeBlock(newScopeBlock(), blockStatementToken.isFunctionBoundary, blockStatementToken.isClassBoundary),
		currentFunctionBlock = getCurrentFunctionBlock(),
		preprocessedStatements = new Array(),
		isComplexBlock = false; // assume this, until we find any catch/finally label

	// scan out the declarations and add to the scope, also validate label consistency for switch, catch, finally, and scope
	for (var statement of statements) {
		if (insideSwitch) {
			if (statement.hasFinally || statement.hasCatch || statement.hasScope) {
				throwSyntaxError(`${ID_SCOPE}, ${ID_CATCH}, ${ID_FINALLY} meta-labels can not be used directly in switch body`,
					statement.hasFinally || statement.hasCatch || statement.hasScope);
			}
		}

		if (statement.hasFinally && statement.hasCatch) {
			throwSyntaxError(`${ID_CATCH} and ${ID_FINALLY} meta-labels can not apply to the same statement`,
				statement.hasFinally || statement.hasCatch);
		}

		if (statement.hasScope && (statement.hasFinally && statement.hasCatch)) {
			throwSyntaxError(`${ID_SCOPE} meta-label can not apply to the same statement as ${ID_CATCH} or ${ID_FINALLY} meta-labels`,
				statement.hasScope);
		}

		isComplexBlock = isComplexBlock || !!(statement.hasFinally || statement.hasCatch); // hasFinally/hasCatch are not bools, so coerce to bool
	}
	currentScopeBlock.isComplexBlock = isComplexBlock;

	// slices of statements grouped as: pre-catch1 / catch1 / pre-catch2 / ... / post-catch
	var catchGroupedStatements = new Array(), curCatchGroup = new Array();
	for (var statement of statements) {
		if (statement.hasCatch) {
			curCatchGroup.groupType = "precatch";
			catchGroupedStatements.push(curCatchGroup);
			curCatchGroup = [statement];
			curCatchGroup.groupType = "catch";
			catchGroupedStatements.push(curCatchGroup);
			curCatchGroup = new Array();
		} else {
			curCatchGroup.push(statement);
		}
	}
	if (curCatchGroup.length > 0) {
		curCatchGroup.groupType = "postcatch";
		catchGroupedStatements.push(curCatchGroup);
	}

	var introducedConsts = new Map(), // name => internal ID
		hoistedLets = newBlankNoiseToken(), // the noise holder for hoisted lets
		hoistedLetsSet = currentScopeBlock.hoistedLetsSet = new Set(), // the list of hoisted let IDs
		constBackers = newBlankNoiseToken(), // the noise holder for const backing lets
		catchOpeners = newBlankNoiseToken(), // the holder for "try {"... opening the try-catchs
		finallyOpeners = newBlankNoiseToken(), // the holder for "try {"... opening the finallys
		finallyStatements = new Array(); // will form stack

	// generate statement to restore the constants introduced in this block so far from their const backers
	function makeRestoreConstStatement() {
		var theStatement = newBlankNoiseToken(),
			theStatementNoise = theStatement.noise;
		if (introducedConsts.size > 0) {
			theStatementNoise.push({ type: "id", value: "const" });
			for (var [icName, icIID] of introducedConsts) {
				theStatementNoise.push({ type: "id", value: icName },
					{ type: "symbol", value: "=" },
					{ type: "id", value: icIID },
					{ type: "symbol", value: "," });
			}
			// replace trailing ',' with ';'
			theStatementNoise[theStatementNoise.length - 1].value = ";";
			theStatement.isStatement = true;
		}
		return theStatement;
	}

	preprocessedStatements.push(hoistedLets);
	preprocessedStatements.push(constBackers);
	preprocessedStatements.push(finallyOpeners);
	preprocessedStatements.push(catchOpeners);

	// process each group
	for (var group of catchGroupedStatements) {
		var catchVarname;
		if (group.groupType == "catch") {
			for (var scopeMarkId in currentScopeBlock.scopeMarks) {
				// mark the existing scopes of the current block as catch-fenced
				var mark = currentScopeBlock.scopeMarks[scopeMarkId];
				if (mark[0] == currentScopeBlock) {
					mark[2] = true;
				}
			}
			catchOpeners.noise.push({ type: "symbol", value: "try {" });
			preprocessedStatements.push({ type: "symbol", value: "} catch (" },
				catchVarname = newBlankNoiseToken(),
				{ type: "symbol", value: ") {" });
		}

		preprocessedStatements.push(makeRestoreConstStatement());
		for (var statement of group) {
			if (statement.statement.declarationType == "let" && isComplexBlock) {
				// hoist the lets and convert the statement to assignment
				setAddAll(hoistedLetsSet, statement.statement.declaredIds);
				statement.statement.noise = statement.statement.noise.slice(1);
				preprocessedStatements.push(preprocessSingleStatement(statement));
			} else if (statement.statement.declarationType == "const" && isComplexBlock) {
				// const is provided as is, but adds const backers and is appended with setting their values
				for (var constId of statement.statement.declaredIds) {
					var intId = newInternalId();
					introducedConsts.set(constId, intId);
				}
				preprocessedStatements.push(preprocessSingleStatement(statement));
				var backerSetter = newBlankNoiseToken(),
					backerSetterNoise = backerSetter.noise;
				for (var constId of statement.statement.declaredIds) {
					backerSetterNoise.push(
						{ type: "id", value: introducedConsts.get(constId) },
						{ type: "symbol", value: "=" },
						{ type: "id", value: constId },
						{ type: "symbol", value: ";" });
				}
				preprocessedStatements.push(backerSetter);
			} else if (statement.statement.functionNameToken && isComplexBlock) {
				// hoist the class/function name as let and convert class statement to assignment
				var functionId = statement.statement.functionNameToken.value;
				hoistedLetsSet.add(functionId);
				preprocessedStatements.push(
					statement.statement.functionNameToken,
					{ type: "symbol", value: "=" },
					preprocessSingleStatement(statement),
					{ type: "symbol", value: ";" });
			} else if (statement.hasFinally) {
				// add finally statement to stack and reserve the opener and finally-reached flag
				finallyOpeners.noise.push({ type: "other", value: "try {" });
				var finallyStatement = newBlankNoiseToken(),
					finallyStatementNoise = finallyStatement.noise,
					finallyReachedId = newInternalId();
				finallyStatementNoise.push({ type: "other", value: "} finally {" });
				finallyStatementNoise.push({ type: "symbol", value: "if (" });
				finallyStatementNoise.push({ type: "id", value: finallyReachedId });
				finallyStatementNoise.push({ type: "symbol", value: ") {" });
				finallyStatementNoise.push(makeRestoreConstStatement()); // restore the consts
				finallyStatementNoise.push(preprocessSingleStatement(statement));
				finallyStatementNoise.push({ type: "symbol", value: "} }" });
				finallyStatement.isStatement = true;
				finallyStatements.push(finallyStatement);

				// also we have to add the finally-reached marker to list of hoisted lets (will go fine with them)
				hoistedLetsSet.add(finallyReachedId);

				// and also, in the main statements stream we need to set the finally-reached marker
				var finallyReachedSetter = newBlankNoiseToken(),
					finallyReachedSetterNoise = finallyReachedSetter.noise;
				finallyReachedSetterNoise.push(
					{ type: "id", value: finallyReachedId },
					{ type: "symbol", value: "= true" },
					{ type: "symbol", value: ";" });
				preprocessedStatements.push(finallyReachedSetter);
			} else if (group.groupType == "catch") {
				if (!NsMatch_Switch_ParenthesizedNoise_BracedNoise_Null(statement.statement.noise, 0)
					|| !NsMatch_OpenPar_NoiseID_ClosePar_Null(statement.statement.noise[1].noise, 0)) {
					throwSyntaxError(`Statement with ${ID_CATCH} meta-label must be 'switch (varname)'`, statement.statement);
				}
				var catchVarnameIdToken = statement.statement.noise[1].noise[1].noise[0];
				catchVarname.noise.push(catchVarnameIdToken); // the varname
				var catchVarnameId = catchVarnameIdToken.value,
					catchSwitch = newBlankNoiseToken(),
					catchSwitchNoise = catchSwitch.noise,
					switchExpr = newBlankNoiseToken(),
					switchExprNoise = switchExpr.noise;
				catchSwitchNoise.push(...statement.labels);
				catchSwitchNoise.push(statement.statement.noise[0]); // switch
				catchSwitchNoise.push(statement.statement.noise[1].noise[0]); // (
				catchSwitchNoise.push(switchExpr); // the expression, to be filled
				catchSwitchNoise.push(statement.statement.noise[1].noise[2]); // )
				var defaultFound = false, nextCaseLabel = 1, preprocessedBlock;
				catchSwitchNoise.push(preprocessedBlock = preprocessBlockStatement(statement.statement.noise[2], true, {
					// preprocess the block with application of special preprocess to case expressions:
					preprocessCaseExpr(expr) {
						expr = preprocessExpression(expr, true);
						var caseLabel = nextCaseLabel++;
						switchExprNoise.push({ type: "symbol", value: "((" },
							expr,
							{ type: "symbol", value: ") && " + caseLabel + ") ||" });
						var labelExpr = newBlankNoiseToken();
						labelExpr.noise.push({ type: "literal", value: caseLabel.toString() });
						labelExpr.isExpression = true;
						return labelExpr;
					},
					defaultFound() {
						defaultFound = true;
					}
				}));
				if (!defaultFound) {
					preprocessedBlock.noise.splice(1, 0,
						{ type: "other", value: "default: throw (" }, // for some reasons throw disallows newline after it
						catchVarnameIdToken,
						{ type: "symbol", value: ");" });
				}
				switchExprNoise.push({ type: "literal", value: "0" });
				catchSwitch.isStatement = true;
				preprocessedStatements.push(catchSwitch);
			} else if (statement.hasScope) {
				// `SCOPE: x;` - validate and add the scope mark (placeholder for scope specific declarations)
				if (!NsMatch_ID_Semicolon_Null(statement.statement.noise, 0)) {
					throwSyntaxError(`Statement with ${ID_SCOPE} meta-label must only contain the scope identifier`, statement.statement);
				}

				var scopeIdToken = statement.statement.noise[0],
					scopeId = scopeIdToken.value;
				if (getScopeMark(scopeId, false)) {
					throwSyntaxError(`Scope mark '${scopeValue}' has already been set or used in this block`, scopeIdToken);
				}
				var scopeMark = newBlankNoiseToken();
				scopeMark.noise.push(...commentTokens("SCOPE: " + scopeId));
				currentScopeBlock.scopeMarks[scopeId] = [currentScopeBlock, scopeMark, false];
				preprocessedStatements.push(scopeMark);
			} else {
				// just a generic statement (maybe with case labels that need special preprocessing)
				preprocessedStatements.push(preprocessSingleStatement(statement, caseExprPreprocessor));
			}
		}

		if (group.groupType == "catch") {
			preprocessedStatements.push({ type: "symbol", value: "}" });
		}
	}

	// fill in lets and const-backers statements if needed (remember they are at the beginning, we are inserting to them in place,
	// despite we are doing this before the last turn)
	setAddAll(hoistedLetsSet, currentScopeBlock.extraLets);
	if (hoistedLetsSet.size > 0) {
		hoistedLets.noise.push({ type: "id", value: "let" },
			{ type: "symbol", value: [...hoistedLetsSet].join(", ") },
			{ type: "symbol", value: ";" });
	}
	if (introducedConsts.size > 0) {
		constBackers.noise.push({ type: "id", value: "let" },
			{ type: "symbol", value: [...introducedConsts.values()].join(", ") },
			{ type: "symbol", value: ";" });
	}

	// append finallys, stackwise
	var finallyStatement;
	while (finallyStatement = finallyStatements.pop()) {
		preprocessedStatements.push(finallyStatement);
	}

	popScopeBlock(); // currentScopeBlock
	return castToNoiseToken([openingBrace, preprocessedStatements, closingBrace]);
}

function preprocessExpression(exprToken, enableQSExpr) {
	var result = new Array(),
		exprNoise = exprToken.noise,
		currentScopeBlock = exprToken.needsClosureTrap || exprToken.isFunctionBoundary ?
			pushScopeBlock(newScopeBlock(), exprToken.needsClosureTrap, false) : getCurrentScopeBlock(),
		usesYield = exprToken.usesYield, // can be undefined atm
		usesAwait = exprToken.usesAwait; // can be undefined atm
	if (exprToken.isFunctionBoundary) currentScopeBlock.addedDeclsTarget = getCurrentScopeBlock(-1);
		
	for (var i = 0; i < exprNoise.length; i++) {
		var prevToken = exprNoise[i - 1], nextToken = exprNoise[i];
		if (nextToken.isStatement && nextToken.isBracedNoise) {
			result.push(preprocessBlockStatement(nextToken, false));
		} else if (nextToken.isExpression) {
			var preprocessedNext = preprocessExpression(nextToken, true);
			usesYield = usesYield || preprocessedNext.usesYield;
			usesAwait = usesAwait || preprocessedNext.usesAwait;
			result.push(preprocessedNext);
		} else if (nextToken.type == "noise") {
			var preprocessedNext = preprocessExpression(nextToken, false);
			usesYield = usesYield || preprocessedNext.usesYield;
			usesAwait = usesAwait || preprocessedNext.usesAwait;
			result.push(preprocessedNext);
		} else {
			if (enableQSExpr && (!prevToken || prevToken.value != ".")) {
				var preprocessedOperator =
					exprNoise[i] && (
						tryPreprocessStatic(exprNoise, i) ||
						tryPreprocessPrecalc(exprNoise, i) ||
						tryPreprocessDefined(exprNoise, i) ||
						tryPreprocessTry(exprNoise, i) ||
						tryPreprocessThrow(exprNoise, i) ||
						tryPreprocessRef(exprNoise, i) ||
						tryPreprocessStaticTag(exprNoise, i));
				if (preprocessedOperator) {
					result.push(preprocessedOperator[0]);
					i += preprocessedOperator[1] - 1;
					usesYield = usesYield || preprocessedOperator[0].usesYield;
					usesAwait = usesAwait || preprocessedOperator[0].usesAwait;
					continue;
				}
			}

			result.push(nextToken);
		}
	}

	// possibly trap context in expression lambda
	if (exprToken.needsClosureTrap && currentScopeBlock.extraLets.size > 0) {
		result = [
			{ type: "other", value: "{ let" },
			{ type: "other", value: [...currentScopeBlock.extraLets].join(", ") },
			{ type: "other", value: "; return (" },
			result,
			{ type: "other", value: ");}" }
		];
	}

	if (exprToken.isFunctionBoundary || exprToken.needsClosureTrap) popScopeBlock();

	result = castToNoiseToken(result);
	result.isExpression = true;
	result.usesYield = usesYield;
	result.usesAwait = usesAwait;
	return result;
}

function tryPreprocessStatic(exprNoise, idx) {
	if (exprNoise[idx++].value != ID_STATIC) return null;
	var opLen = 1,
		scopeMark = initialDeclarations, // assuming this location by default
		scopeBlock;

	if (TkMatchTokenBracketedNoise(exprNoise[idx])) {
		// scope is specified
		var scopeSpec = exprNoise[idx++], scopeIdToken = scopeSpec.noise[1];
		opLen++;
		if (!NsMatch_ID_Null(scopeIdToken, 0)) {
			throwSyntaxError(`Scope identifier for ${ID_STATIC} expected`, scopeIdToken, exprNoise[idx]);
		}
		var scopeId = scopeIdToken.noise[0].value;
		scopeMark = getScopeMark(scopeId);
		if (!scopeMark) {
			throwSyntaxError(`Scope id '${scopeId}' referenced before declaration`, scopeIdToken);
		}
		// catch-fencing is not checked here, as it is superfluous for statics
		[scopeBlock, scopeMark] = scopeMark;
	}
	var staticFlagVar = newInternalId(), staticValueVar = newInternalId();
	if (scopeBlock && scopeBlock.isComplexBlock) {
		// in complex block, we need our vars in the hoisted lets set to make them visible across the whole block
		setAddAll(scopeBlock.hoistedLetsSet, [staticFlagVar, staticValueVar]);
	} else {
		scopeMark.noise.push(castToNoiseToken([
			{ type: "id", value: "let" },
			{ type: "id", value: staticFlagVar },
			{ type: "symbol", value: "," },
			{ type: "id", value: staticValueVar },
			{ type: "symbol", value: ";" }
		]));
	}

	// get the main expression
	if (!TkMatchTokenParenthesizedNoise(exprNoise[idx]) || exprNoise[idx].noise[1].noise.length < 1) {
		throwSyntaxError(`Parenthesized expression for ${ID_STATIC} expected`, exprNoise[idx], exprNoise[idx - 1]);
	}

	var staticExpr = exprNoise[idx++],
		openParToken = staticExpr.noise[0],
		actualExpr = preprocessExpression(staticExpr.noise[1], true),
		closeParToken = staticExpr.noise[2];
	opLen++;

	// (<flagvar> || (<valuevar> = (expr), <flagvar> = true), <valuevar>)
	var result = castToNoiseToken([
		{ type: "symbol", value: "(" },
		{ type: "id", value: staticFlagVar },
		{ type: "symbol", value: "||" },
		{ type: "symbol", value: "(" },
		{ type: "id", value: staticValueVar },
		{ type: "symbol", value: "=" },
		openParToken,
		actualExpr,
		closeParToken,
		{ type: "symbol", value: "," },
		{ type: "id", value: staticFlagVar },
		{ type: "symbol", value: "= true" },
		{ type: "symbol", value: ")," },
		{ type: "id", value: staticValueVar },
		{ type: "symbol", value: ")" }
	]);

	result.isExpression = true;
	result.usesYield = actualExpr.usesYield;
	result.usesAwait = actualExpr.usesAwait;
	return [result, opLen];
}

function tryPreprocessPrecalc(exprNoise, idx) {
	if (exprNoise[idx++].value != ID_PRECALC) return null;
	var opLen = 1;

	var scopeSpec = exprNoise[idx++];
	if (!TkMatchTokenBracketedNoise(scopeSpec) ||
		!NsMatch_ID_Null(scopeSpec.noise[1], 0)) {
		throwSyntaxError(`Scope identifier for ${ID_PRECALC} expected`, exprNoise[idx]);
	}

	var scopeIdToken = scopeSpec.noise[1];
	opLen++;
	var scopeId = scopeIdToken.noise[0].value;
	scopeMark = getScopeMark(scopeId);
	if (!scopeMark) {
		throwSyntaxError(`Scope id '${scopeId}' referenced before declaration`, scopeIdToken);
	}
	if (scopeMark[2]) {
		throwSyntaxError(`Precalculation site at scope '${scopeId}' is ${ID_CATCH}-fenced from its ${ID_PRECALC}-reference site`, scopeIdToken);
	}
	var [scopeBlock, scopeMark] = scopeMark;

	// get the main expression
	if (!TkMatchTokenParenthesizedNoise(exprNoise[idx]) || exprNoise[idx].noise[1].noise.length < 1) {
		throwSyntaxError(`Parenthesized expression for ${ID_PRECALC} expected`, exprNoise[idx], exprNoise[idx - 1]);
	}

	var precalcExpr = exprNoise[idx++],
		openParToken = precalcExpr.noise[0],
		actualExpr = preprocessExpression(precalcExpr.noise[1], true),
		closeParToken = precalcExpr.noise[2];
	opLen++;

	// const <precalcvar> = (expr); (or if we are in complex block then) <precalcvar> = (expr); + <precalcvar> as hoisted let
	var precalcVar = newInternalId();
	if (scopeBlock.isComplexBlock) {
		scopeBlock.hoistedLetsSet.add(precalcVar);
	}
	scopeMark.noise.push(castToNoiseToken([
		scopeBlock.isComplexBlock ? { type: "other", value: "" } : { type: "id", value: "const" },
		{ type: "id", value: precalcVar },
		{ type: "symbol", value: "=" },
		openParToken,
		actualExpr,
		closeParToken,
		{ type: "symbol", value: ";" }
	]));

	// <precalcvar>
	var result = castToNoiseToken([
		{ type: "id", value: precalcVar }
	]);

	result.isExpression = true;
	result.usesYield = actualExpr.usesYield;
	result.usesAwait = actualExpr.usesAwait;
	return [result, opLen];
}

function tryPreprocessDefined(exprNoise, idx) {
	if (exprNoise[idx++].value != ID_DEFINED) return null;
	var opLen = 1;

	// get the expression
	if (!TkMatchTokenParenthesizedNoise(exprNoise[idx]) || exprNoise[idx].noise[1].noise.length < 1) {
		throwSyntaxError(`Parenthesized expression for ${ID_DEFINED} expected`, exprNoise[idx], exprNoise[idx - 1]);
	}

	var definedExpr = exprNoise[idx++],
		openParToken = definedExpr.noise[0],
		actualExpr = preprocessExpression(definedExpr.noise[1], true),
		closeParToken = definedExpr.noise[2];
	opLen++;

	// (typeof (expr) !== 'undefined')
	var result = castToNoiseToken([
		{ type: "symbol", value: "(" },
		{ type: "id", value: "typeof" },
		openParToken,
		actualExpr,
		closeParToken,
		{ type: "symbol", value: "!==" },
		{ type: "literal", value: "'undefined'" },
		{ type: "symbol", value: ")" }
	]);

	result.isExpression = true;
	result.usesYield = actualExpr.usesYield;
	result.usesAwait = actualExpr.usesAwait;
	return [result, opLen];
}

// reserve (on demand) functions for "or" method of object returned by TRY's
var tryHappyOrId, tryUnhappyOrId;
function ensureTryOrs() {
	if (!tryHappyOrId) {
		tryHappyOrId = newInternalId();
		tryUnhappyOrId = newInternalId();
		initialDeclarations.noise.push(
			{ type: "id", value: "const" },
			{ type: "id", value: tryHappyOrId },
			{ type: "other", value: "= function or(){return this.result;};" });
		initialDeclarations.noise.push(
			{ type: "id", value: "const" },
			{ type: "id", value: tryUnhappyOrId },
			{ type: "other", value: "= function or(el){return el(this.error);};" });
	}
}

function tryPreprocessTry(exprNoise, idx) {
	if (exprNoise[idx++].value != ID_TRY) return null;
	var tryToken = exprNoise[idx - 1], opLen = 1;

	// get the expression
	if (!TkMatchTokenParenthesizedNoise(exprNoise[idx]) || exprNoise[idx].noise[1].noise.length < 1) {
		throwSyntaxError(`Parenthesized expression for ${ID_TRY} expected`, exprNoise[idx], exprNoise[idx - 1]);
	}

	var tryExpr = exprNoise[idx++],
		openParToken = tryExpr.noise[0],
		actualExpr = preprocessExpression(tryExpr.noise[1], true),
		closeParToken = tryExpr.noise[2];
	opLen++;

	var result = new Array();
	
	if (actualExpr.usesYield) {
		result.push({ type: "symbol", value: "(" });
		result.push({ type: "symbol", value: "yield *",
			line: actualExpr.usesYield.line,
			column: actualExpr.usesYield.column });
	}

	result.push({ type: "symbol", value: "(" });
	if (actualExpr.usesAwait && !actualExpr.usesYield) {
		result.push(actualExpr.usesAwait);
	}
	result.push({ type: "symbol", value: "(" });
	if (actualExpr.usesAwait) {
		result.push({ type: "id", value: "async" });
	}
	result.push({ type: "id", value: "function" });
	if (actualExpr.usesYield) {
		result.push({ type: "symbol", value: "*" });
	}

	ensureTryOrs();

	result.push(
		tryToken, // reuse to retain source code location
		{ type: "symbol", value: "()" },
		{ type: "symbol", value: "{" },
		{ type: "other", value: "try {" },
		{ type: "other", value: "return ({" },
		{ type: "other", value: "result:" },
		openParToken,
		actualExpr,
		closeParToken,
		{ type: "symbol", value: "," },
		{ type: "other", value: "or:" },
		{ type: "id", value: tryHappyOrId },
		{ type: "other", value: "});" },
		{ type: "other", value: "} catch (e) {" },
		{ type: "other", value: "return ({" },
		{ type: "other", value: "error: e," },
		{ type: "other", value: "or:" },
		{ type: "id", value: tryUnhappyOrId },
		{ type: "other", value: "});" },
		{ type: "symbol", value: "}}" });
	result.push({ type: "symbol", value: ").call(this))" });

	if (actualExpr.usesYield) {
		result.push({ type: "symbol", value: ")" });
	}

	result = castToNoiseToken(result);
	result.isExpression = true;
	result.usesYield = actualExpr.usesYield;
	result.usesAwait = actualExpr.usesAwait;
	return [result, opLen];
}

function tryPreprocessThrow(exprNoise, idx) {
	if (exprNoise[idx++].value != ID_THROW) return null;
	var opLen = 1;

	// get the expression
	if (!TkMatchTokenParenthesizedNoise(exprNoise[idx]) || exprNoise[idx].noise[1].noise.length < 1) {
		throwSyntaxError(`Parenthesized expression for ${ID_THROW} expected`, exprNoise[idx], exprNoise[idx - 1]);
	}

	var throwExpr = exprNoise[idx++],
		actualExpr = preprocessExpression(throwExpr, true);
	opLen++;

	var result = castToNoiseToken([
		{ type: "symbol", value: "((e => {throw e;})" },
		actualExpr,
		{ type: "symbol", value: ")" }
	]);
	result.isExpression = true;
	result.usesYield = actualExpr.usesYield;
	result.usesAwait = actualExpr.usesAwait;
	return [result, opLen];
}

// get (on demand) name for reference setter argument
var refSetterArgId;
function getRefSetterArgId() {
	if (!refSetterArgId) {
		refSetterArgId = newInternalId();
	}
	return refSetterArgId;
}

// get (on demand) name for reference object argument
var refObjectArgId;
function getRefObjectArgId() {
	if (!refObjectArgId) {
		refObjectArgId = newInternalId();
	}
	return refObjectArgId;
}

// get (on demand) name for reference property argument
var refPropArgId;
function getRefPropArgId() {
	if (!refPropArgId) {
		refPropArgId = newInternalId();
	}
	return refPropArgId;
}

// return code for single var reference
// requires that exprNoise is an unwrapped, single ID (var name) expression
function createVarReference(exprNoiseToken) {
	var varId = exprNoiseToken.noise[0], refSetterArgId = getRefSetterArgId();
	// ({ get value() { return <var>; }, set value(<setterArg>) { <var> = <setterArg> }})
	var result = castToNoiseToken([
		{ type: "symbol", value: "({" },
		{ type: "other", value: "get value() {" },
		{ type: "id", value: "return" }, // detach it for later 'return' keyword detection
		varId,
		{ type: "other", value: ";}, set value(" },
		{ type: "id", value: refSetterArgId },
		{ type: "symbol", value: ") {" },
		varId,
		{ type: "symbol", value: "=" },
		{ type: "id", value: refSetterArgId },
		{ type: "symbol", value: ";}})" }
	]);
	result.isExpression = true;
	return result;
}

// split lvalue expression into object and property part, also validate it
// apply BEFORE preprocessing!
function extractRefExprComponents(exprNoiseToken, fallbackToken) {
	var exprNoise = exprNoiseToken.noise, n = exprNoise.length, isDotId = false;
	for (var i = 0; i < n; i++) {
		var nextToken = exprNoise[i],
			isBracketed = nextToken.isBracketedNoise,
			isBraced = nextToken.isBracedNoise,
			isParenthesized = nextToken.isParenthesizedNoise;
		if (i == 0 && (
			nextToken.type == "id" || nextToken.type == "literal" || isBracketed || isBraced || isParenthesized)) {
			// expression starts with a bracketed item, or a var/literal - it is ok
			continue;
		}
		if (NsMatch_Dot_ID_Null(exprNoise, i)) {
			// expression ends with '.id'
			isDotId = true;
			break;
		}
		if (NsMatch_BracketedNoise_Null(exprNoise, i)) {
			// expression ends with '[expr]'
			isDotId = false;
			break;
		}
		if (NsMatch_Dot_ID(exprNoise, i)) {
			// a '.id' component
			i++; // skip dot
			continue;
		}
		if (isBracketed || isParenthesized) {
			// a [...] or (...) component
			continue;
		}
		// any other items are invalid in lvalue expression
		throwSyntaxError(`Can only make a reference from a valid lvalue expression`, nextToken, fallbackToken);
	}
	if (i >= n) {
		// it didn't end the one of intended ways, hence invalid
		throwSyntaxError(`Can only make a reference from a valid lvalue expression`, exprNoiseToken, fallbackToken);
	}

	var objectExpr, propFragment;
	if (isDotId) {
		objectExpr = exprNoise.slice(0, -2);
		propFragment = castToNoiseToken(exprNoise.slice(-2));
	} else {
		objectExpr = exprNoise.slice(0, -1);
		propFragment = exprNoise[exprNoise.length - 1]; // will be a bracketed noise
	}

	objectExpr = castToNoiseToken(objectExpr);
	objectExpr.isExpression = true;
	// propagate yield and await status from the whole source expression
	objectExpr.usesYield = exprNoiseToken.usesYield;
	objectExpr.usesAwait = exprNoiseToken.usesAwait;

	return [objectExpr, propFragment];
}

// refType = ID_BIND/ID_PIN
function createExprReference(exprNoiseToken, fallbackToken, refType) {
	exprNoiseToken = unwrapParenthesizedNoiseToken(exprNoiseToken);
	if (exprNoiseToken.type == "id") {
		// a degenerate case
		exprNoiseToken = castToNoiseToken([exprNoiseToken]);
		return createVarReference(exprNoiseToken);
	}

	if (NsMatch_ID_Null(exprNoiseToken.noise, 0)) {
		// single-id expression - it is always a simple var reference
		return createVarReference(exprNoiseToken);
	}

	var [objectExprToken, propFragmentToken] = extractRefExprComponents(exprNoiseToken, fallbackToken),
		result = new Array();
		refSetterArgId = getRefSetterArgId(),
		refObjectArgId = getRefObjectArgId(),
		refPropArgId = getRefPropArgId(),
		usesYield = false,
		usesAwait = false;
	if (refType == ID_BIND) {
		// ((g, s) => ({ get value() { return g(); }, set value(x) { s(x); }}))(() => (<expr>), <setterArg> => (<expr> = <setterArg>))
		// ({ get value() { return (<expr>); }, set value(<setterArg>) { <expr> = <setterArg> }})
		objectExprToken = preprocessExpression(exprNoiseToken, true); // using the whole source expression (exprNoiseToken)
		if (objectExprToken.usesYield) throwSyntaxError(`No yield is allowed in ${ID_BIND}-type reference expression`, objectExprToken.usesYield);
		if (objectExprToken.usesAwait) throwSyntaxError(`No await is allowed in ${ID_BIND}-type reference expression`, objectExprToken.usesAwait);
		result.push(
			{ type: "symbol", value: "((g,s) => ({" },
			{ type: "other", value: "get value() {return g();}, set value(x) {return s(x);}" },
			{ type: "symbol", value: "}))(() => (" },
			objectExprToken,
			{ type: "symbol", value: ")," },
			{ type: "id", value: refSetterArgId },
			{ type: "symbol", value: "=> (" },
			objectExprToken,
			{ type: "symbol", value: "=" },
			{ type: "id", value: refSetterArgId },
			{ type: "symbol", value: "))" }
		);
	} else if (refType == ID_PIN) {
		objectExprToken = preprocessExpression(objectExprToken, true);
		usesYield = usesYield || objectExprToken.usesYield;
		usesAwait = usesAwait || objectExprToken.usesAwait;
		if (propFragmentToken.noise[0].value == ".") {
			// .id case
			// ((<obj>) => ({ get value() { return <obj>.<propId>; }, set value(<setterArg>) { <obj>.<propId> = <setterArg> }}))(<objectExpr>)
			result.push(
				{ type: "symbol", value: "((" },
				{ type: "id", value: refObjectArgId },
				{ type: "symbol", value: ") => ({" },
				{ type: "other", value: "get value() {" },
				{ type: "id", value: "return" },
				{ type: "id", value: refObjectArgId },
				propFragmentToken, // it already contains the dot
				{ type: "symbol", value: ";}," },
				{ type: "other", value: "set value(" },
				{ type: "id", value: refSetterArgId },
				{ type: "symbol", value: ") {" },
				{ type: "id", value: refObjectArgId },
				propFragmentToken,
				{ type: "symbol", value: "=" },
				{ type: "id", value: refSetterArgId },
				{ type: "symbol", value: ";}}))(" },
				objectExprToken,
				{ type: "symbol", value: ")" }
			);
		} else {
			// [expr] case
			propFragmentToken = preprocessExpression(propFragmentToken.noise[1], true);
			usesYield = usesYield || propFragmentToken.usesYield;
			usesAwait = usesAwait || propFragmentToken.usesAwait;
			// ((<obj>,<prop>) => ({ get value() { return <obj>[<prop>]; }, set value(<setterArg>) { <obj>[<prop>] = <setterArg> }}))(<objectExpr>,<propExpr>)
			result.push(
				{ type: "symbol", value: "((" },
				{ type: "id", value: refObjectArgId },
				{ type: "symbol", value: "," },
				{ type: "id", value: refPropArgId },
				{ type: "symbol", value: ") => ({" },
				{ type: "other", value: "get value() {" },
				{ type: "id", value: "return" },
				{ type: "id", value: refObjectArgId },
				{ type: "symbol", value: "[" },
				{ type: "id", value: refPropArgId },
				{ type: "symbol", value: "]" },
				{ type: "symbol", value: ";}," },
				{ type: "other", value: "set value(" },
				{ type: "id", value: refSetterArgId },
				{ type: "symbol", value: ") {" },
				{ type: "id", value: refObjectArgId },
				{ type: "symbol", value: "[" },
				{ type: "id", value: refPropArgId },
				{ type: "symbol", value: "]" },
				{ type: "symbol", value: "=" },
				{ type: "id", value: refSetterArgId },
				{ type: "symbol", value: ";}}))(" },
				objectExprToken,
				{ type: "symbol", value: "," },
				propFragmentToken,
				{ type: "symbol", value: ")" }
			);
		}
	} else throwSyntaxError(`Invalid reference type '${refType}'`, exprNoiseToken, fallbackToken);

	result = castToNoiseToken(result);
	result.isExpression = true;
	result.usesYield = usesYield;
	result.usesAwait = usesAwait;
	// reference expression is never using 

	return result;
}

function tryPreprocessRef(exprNoise, idx) {
	if (exprNoise[idx++].value != ID_REF) return null;
	var opLen = 1, refToken = exprNoise[idx - 1];

	// get the expression
	if (!TkMatchTokenParenthesizedNoise(exprNoise[idx]) || exprNoise[idx].noise[1].noise.length < 1) {
		throwSyntaxError(`Parenthesized expression/refspec for ${ID_REF} expected`, exprNoise[idx], refToken);
	}

	var refExpr = exprNoise[idx++];
	opLen++;

	//var refExprComponents = explodeNoise(refExpr.noise[1], ","),
	var refExprComponents = explodeNoise(refExpr.noise[1], TkMatchComma),
		firstPart = unwrapParenthesizedNoiseToken(castToNoiseToken(refExprComponents[0]));
	if (NsMatch_ID_Null(firstPart.noise, 0)) {
		// a pure var ref
		if (refExprComponents.length > 1) {
			throwSyntaxError(`${ID_REF} to a single variable must not contain reference type spec`, castToNoiseToken(refExprComponents[1]), refToken);
		}
		return [createVarReference(firstPart), opLen];
	}

	// an expression ref
	if (refExprComponents.length != 2) {
		// validate the ref expression in overall
		throwSyntaxError(`${ID_REF} to an expression must only contain the expression and reference type spec (${ID_BIND}, ${ID_PIN})`, firstPart, refToken);
	}
	var refType = refExprComponents[1][0];
	refType = refType.value || "unspecified"; // it should be a single ID

	return [createExprReference(firstPart, refToken, refType), opLen];
}

function tryPreprocessStaticTag(exprNoise, idx) {
	var tagToken = exprNoise[idx++];
	if (tagToken.type !== "id" && tagToken.type !== "literal") return null;
	var opLen = 1, tagId = tagToken.value;

	// check if it is followed by a valid template expression
	var templateNoise = exprNoise[idx++];
	if (!templateNoise || !(templateNoise.isParenthesizedNoise || templateNoise.isStringTemplate))
		return null;

	// literal must be evaluated
	if (tagToken.type === "literal") tagId = eval(tagId);

	// check if the tag processor exists
	var tagProcessor = qsConfig.staticTagProcessors[tagId];
	if (!tagProcessor) return null;

	// it exists! try to decode args
	opLen++;
	var evaluatorArgsExpr;
	if (templateNoise.isParenthesizedNoise) {
		evaluatorArgsExpr = castToNoiseToken(
			preprocessExpression(templateNoise.noise[1], true)
		);
		evaluatorArgsExpr.usesYield = evaluatorArgsExpr.usesYield;
		evaluatorArgsExpr.usesAwait = evaluatorArgsExpr.usesAwait;
		templateNoise = exprNoise[idx++];
		opLen++;
	} else {
		evaluatorArgsExpr = newBlankNoiseToken();
	}
	if (!templateNoise || !templateNoise.isStringTemplate) {
		// when enabled, the static tag ID (unless it is a member access) can only be used as string template prefix
		throwSyntaxError(`Template string expected after static tag '${tagId}'`, exprNoise[idx - 2]);
	}

	var stringTokens = new Array(), placeholderExprs = new Array();
	var n = templateNoise.noise.length;
	for (var i = 0; i < n; i += 2) {
		var theString, theItem = templateNoise.noise[i];
		if (i == n - 1) {
			theString = {
				type: "tfrag",
				value: theItem.value.slice(1, -1), // strip leading }/` and trailing `
				line: theItem.line,
				column: theItem.column + 1,
			};
		}
		else {
			theString = {
				type: "tfrag",
				value: theItem.value.slice(1, -2), // strip leading `/} and trailing ${
				line: theItem.line,
				column: theItem.column + 1,
			};
		}
		stringTokens.push(theString);
		if (i < n - 1) {
			placeholderExprs.push(templateNoise.noise[i + 1]);
		}
	}

	switch (tagProcessor.method) {
	case 'simple':
		return [processStaticTagSimple(tagId, tagProcessor, stringTokens, placeholderExprs, evaluatorArgsExpr, tagToken), opLen];
	case 'algebra':
		return [processStaticTagAlgebra(tagId, tagProcessor, stringTokens, placeholderExprs, evaluatorArgsExpr, tagToken), opLen];
	default:
		// this actually can not happen, but reserve as a placeholder
		return [castToNoiseToken([{ type: "literal", value: "\"[STUB]\"" }]), opLen];
	}
}

//
// simple static tag processing
//

function lineColumnFromRefToken(refToken) {
	return { line: refToken.line, column: refToken.column };
}

var simpleTagPreparedDeclarations = {
	__proto__: null
};
var simpleTagEvalFactories = {
	__proto__: null
};
var dummySimpleCTId;
function processStaticTagSimple(tagId, tagProcessor, stringTokens, placeholderExprs, evaluatorArgsExpr, refToken) {
	var {evaluatorFactory} = tagProcessor,
		evaluationMode = 'NORMAL',
		placeholderArgModes = new Array(),
		strings = new Array();

	for (var st of stringTokens) {
		strings.push(st.value);
	}

	for (var x of placeholderExprs) {
		placeholderArgModes.push({ mode: 'VALUE', lazy: false });
	}

	var constructionToolkit = {
		setEvaluationMode(evalMode) {
			switch (evalMode) {
			case 'NORMAL':
			case 'AWAIT':
			case 'YIELD':
			case 'YIELD*':
			case 'ERROR':
			case 'NONE':
				evaluationMode = evalMode; break;
			default:
				throwSyntaxError(`Invalid evaluation mode '${evalMode}'`, refToken);
			}
		},

		setPlaceholderArgMode(argIdx, argMode) {
			if (argIdx < 0 || argIdx >= placeholderArgModes.length)
				throwSyntaxError(`Invalid placeholder argument index ${argIdx}`, refToken);
			var argModes = argMode.split(/,|\s+/);
			var actualArgMode = { mode: null, lazy: false };
			for (var argMode1 of argModes) {
				switch (argMode1) {
				case 'VALUE':
				case 'REF_BIND':
				case 'REF_PIN':
					if (actualArgMode.mode == null) actualArgMode.mode = argMode1;
					else throwSyntaxError(`Contradictory placeholder argument mode spec '${argMode}'`, refToken);
					break;
				case 'LAZY':
					actualArgMode.lazy = true;
					break;
				default:
					throwSyntaxError(`Invalid placeholder argument mode flag '${argMode1}'`, refToken);
				}
			}

			if (!actualArgMode.mode) actualArgMode.mode = 'VALUE'; // by default
			if (actualArgMode.mode == 'REF_BIND' && actualArgMode.lazy) {
				throwSyntaxError(`REF_BIND and LAZY placeholder argument modes are not compatible`, refToken);
			}

			placeholderArgModes[argIdx] = actualArgMode;
		}
	};

	var tagData = runtimeConfig.staticTagData[tagId];

	// prepare dummy simple tag construction toolkit (once per all simple tags) - it will be used if running a precompiled code
	// via QUADSUGAR.(...).runPrecompiledCode(...) or in cache mode
	if (!dummySimpleCTId) {
		dummySimpleCTId = newInternalId();
		initialDeclarations.noise.push(
			{ type: "id", value: "const" },
			{ type: "id", value: dummySimpleCTId },
			{ type: "other", value: "= { setEvaluationMode(){}, setPlaceholderArgMode(){} };" },
		);
	}

	// create the evaluator and determine arg modes
	var preparedIndex = tagData.prepared.length;
	tagData.prepared[preparedIndex] = evaluatorFactory(constructionToolkit, strings);

	// at initialDeclarations: const <evalTagPreparedId> = <masterArgId>.staticTagData.<tagId>.prepared; (once per <tagId>)
	var evalTagPreparedId = simpleTagPreparedDeclarations[tagId];
	if (!evalTagPreparedId) {
		evalTagPreparedId = simpleTagPreparedDeclarations[tagId] = newInternalId();
		initialDeclarations.noise.push(
			{ type: "id", value: "const" },
			{ type: "id", value: evalTagPreparedId },
			{ type: "symbol", value: "=" },
			{ type: "id", value: masterArgId },
			{ type: "symbol", value: ".staticTagData" },
			{ type: "symbol", value: "[" + JSON.stringify(tagId) + "]" },
			{ type: "symbol", value: ".prepared;" }
		);
	}

	// and: const <evalTagFactoryId> = <masterArgId>.staticTagProcessors.<tagId>.evaluatorFactory; (once per <tagId>)
	var evalTagFactoryId = simpleTagEvalFactories[tagId];
	if (!evalTagFactoryId) {
		evalTagFactoryId = simpleTagEvalFactories[tagId] = newInternalId();
		initialDeclarations.noise.push(
			{ type: "id", value: "const" },
			{ type: "id", value: evalTagFactoryId },
			{ type: "symbol", value: "=" },
			{ type: "id", value: masterArgId },
			{ type: "symbol", value: ".staticTagProcessors" },
			{ type: "symbol", value: "[" + JSON.stringify(tagId) + "]" },
			{ type: "symbol", value: ".evaluatorFactory;" }
		);
	}

	// at initialDeclarations: const <evaluateMarkerVar> = <evalTagPreparedId>[<preparedIndex>] || <evalFactoryId>(<dummySimpleCTId>, <strings>);
	var evaluateMarkerVar = newInternalId();
	initialDeclarations.noise.push(
		{ type: "id", value: "const" },
		{ type: "id", value: evaluateMarkerVar },
		{ type: "symbol", value: "=" },
		{ type: "id", value: evalTagPreparedId },
		{ type: "symbol", value: "[" },
		{ type: "literal", value: String(preparedIndex) },
		{ type: "symbol", value: "] ||" },
		{ type: "id", value: evalTagFactoryId },
		{ type: "symbol", value: "(" },
		{ type: "id", value: dummySimpleCTId },
		{ type: "symbol", value: "," },
		{ type: "other", value: JSON.stringify(strings) },
		{ type: "symbol", value: ");" },
	);

	// final result: (<evaluateMarkerVar>([<preprocessedEvaluatorArgsExprs>], [<postprocessedPlaceholderExprs>]))
	// or: (yield * / await (<evaluateMarkerVar>([<preprocessedEvaluatorArgsExprs>], [<postprocessedPlaceholderExprs>])))
	var result = new Array(),
		usesYield = false,
		usesAwait = false;
	result.push(...commentTokens(`${tagId} ${refToken.line + 1}:${refToken.column + 1}`));
	switch (evaluationMode) {
	case 'YIELD':
	case 'YIELD*':
		result.push(
			{ type: "symbol", value: "(" },
			ourUsesYield = { type: "other", value: evaluationMode === 'YIELD' ? "yield" : "yield *", ...lineColumnFromRefToken(refToken) },
			{ type: "symbol", value: "(" });
		break;
	case 'AWAIT':
		result.push(
			{ type: "symbol", value: "(" },
			ourUsesAwait = { type: "id", value: "await", ...lineColumnFromRefToken(refToken) },
			{ type: "symbol", value: "(" });
		break;
	case 'ERROR':
		throwSyntaxError(`${tagId} expression: custom preprocessor indicated a compile-time error`, refToken);
		break;
	// 'NORMAL' or 'NONE' is the default
	}
	result.push({ type: "symbol", value: "(" });
	result.push({ type: "id", value: evaluateMarkerVar });
	result.push({ type: "symbol", value: "([" });
	result.push(evaluatorArgsExpr);
	result.push({ type: "symbol", value: "]," });
	var placeholderExprsProcessed = newBlankNoiseToken();
	result.push(placeholderExprsProcessed); // fill it later
	result.push({ type: "symbol", value: "))" });
	if (evaluationMode !== 'NORMAL' && evaluationMode !== 'NONE') {
		result.push({ type: "symbol", value: "))" });
	}

	usesYield = usesYield || evaluatorArgsExpr.usesYield;
	usesAwait = usesAwait || evaluatorArgsExpr.usesAwait;

	// prepare and fill the placeholder exprs according to their assigned arg modes
	var placeholderExprsNoise = placeholderExprsProcessed.noise;
	placeholderExprsNoise.push({ type: "symbol", value: "[" });
	for (var i = 0; i < placeholderExprs.length; i++) {
		var placeholderArgMode = placeholderArgModes[i], placeholderExpr = placeholderExprs[i];

		// prechecks
		if ((placeholderExpr.usesYield || placeholderExpr.usesAwait) && placeholderArgMode) {
			throwSyntaxError(`No await or yield allowed in placeholder argument with LAZY flag`, placeholderExpr, refToken);
		}

		// add a comma
		if (i > 0) {
			placeholderExprsNoise.push({ type: "symbol", value: "," });
		}

		// lazy placeholders emitted as lambdas, otherwise as a parenthesized expression
		if (placeholderArgMode.lazy) {
			placeholderExprsNoise.push({ type: "symbol", value: "() => (" });
		} else {
			placeholderExprsNoise.push({ type: "symbol", value: "(" });
		}

		// prepare the preprocessed/converted placeholder expr
		switch (placeholderArgMode.mode) {
		case 'VALUE': placeholderExpr = preprocessExpression(placeholderExpr, true); break;
		case 'REF_BIND': placeholderExpr = createExprReference(placeholderExpr, refToken, 'BIND'); break;
		case 'REF_PIN': placeholderExpr = createExprReference(placeholderExpr, refToken, 'PIN'); break;
		}

		// emit it
		usesYield = usesYield || placeholderExpr.usesYield;
		usesAwait = usesAwait || placeholderExpr.usesAwait;
		placeholderExprsNoise.push(placeholderExpr);

		// close the placeholder expression
		placeholderExprsNoise.push({ type: "symbol", value: ")" });
	}
	// end of placeholders array
	placeholderExprsNoise.push({ type: "symbol", value: "]" });

	// 'NONE' mode overrides the whole expression with "(void null)"
	if (evaluationMode === 'NONE') {
		result = [{ type: "symbol", value: "(void null)" }];
	}

	// done
	result = castToNoiseToken(result);
	result.isExpression = true;
	result.usesYield = usesYield;
	result.usesAwait = usesAwait;
	return result;
}

//
// algebra static tag processing
//

// a stack of names reserved for context objects (we will try to re-use these variables as much as possible)
var algebraCtxNamesStack = new Array(), algebraCtxStackIndex = 0;
function getAlgebraCtxName() {
	if (!algebraCtxNamesStack[algebraCtxStackIndex]) {
		algebraCtxNamesStack[algebraCtxStackIndex] = newInternalId();
	}
	return algebraCtxNamesStack[algebraCtxStackIndex++];
}

function releaseAlgebraCtxName() {
	algebraCtxStackIndex--;
}

var algebraFunctionNames = { __proto__: null },
	algebraTagProcessorsDeclarations = { __proto__: null };
function getAlgebraFunctionName(tagId, index) {
	var namesCache = algebraFunctionNames[tagId];
	if (!namesCache) { namesCache = algebraFunctionNames[tagId] = new Array(); }
	var result = namesCache[index];
	if (!result) {
		// at initialDeclarations: const <evalTagPreparedId> = <masterArgId>.staticTagProcessors.<tagId>.functionShortcuts; (once per <tagId>)
		var evalTagPreparedId = algebraTagProcessorsDeclarations[tagId];
		if (!evalTagPreparedId) {
			evalTagPreparedId = algebraTagProcessorsDeclarations[tagId] = newInternalId();
			initialDeclarations.noise.push(castToNoiseToken([
				{ type: "id", value: "const" },
				{ type: "id", value: evalTagPreparedId },
				{ type: "symbol", value: "=" },
				{ type: "id", value: masterArgId },
				{ type: "symbol", value: ".staticTagProcessors" },
				{ type: "symbol", value: "[" + JSON.stringify(tagId) + "]" },
				{ type: "symbol", value: ".functionShortcuts;" }
			]));
		}

		// at initialDeclarations: const <functionId> = <evalTagPreparedId>[<index>]; (once per <index>)
		result = namesCache[index] = newInternalId();
		if (typeof (index) === 'number') {
			initialDeclarations.noise.push(
				{ type: "id", value: "const" },
				{ type: "id", value: result },
				{ type: "symbol", value: "=" },
				{ type: "id", value: evalTagPreparedId },
				{ type: "symbol", value: "[" },
				{ type: "literal", value: String(index) },
				{ type: "symbol", value: "];" },
				...commentTokens(tagId + ": " + qsConfig.staticTagProcessors[tagId].functionShortcutComments[index]),
			);
		} else if (index === 'contextCtor') {
			initialDeclarations.noise.push(castToNoiseToken([
				{ type: "id", value: "const" },
				{ type: "id", value: result },
				{ type: "symbol", value: "=" },
				{ type: "id", value: masterArgId },
				{ type: "symbol", value: ".staticTagProcessors" },
				{ type: "symbol", value: "[" + JSON.stringify(tagId) + "]" },
				{ type: "symbol", value: ".contextConstructorFunc;" }
			]));
		} else if (index === 'postEval') {
			initialDeclarations.noise.push(castToNoiseToken([
				{ type: "id", value: "const" },
				{ type: "id", value: result },
				{ type: "symbol", value: "=" },
				{ type: "id", value: masterArgId },
				{ type: "symbol", value: ".staticTagProcessors" },
				{ type: "symbol", value: "[" + JSON.stringify(tagId) + "]" },
				{ type: "symbol", value: ".postEvaluationFunc;" }
			]));
		}
	}

	return result;
}

var algebraTagProcessorsIdempotentInits = { __proto__: null };
function getAlgebraIdempotentLiteralInitializerId(tagId, index, litValueToken) {
	var tagProcessorsIdempotentInits = algebraTagProcessorsIdempotentInits[tagId];
	if (!tagProcessorsIdempotentInits) tagProcessorsIdempotentInits = algebraTagProcessorsIdempotentInits[tagId] = new Map();
	var initPerIndex = tagProcessorsIdempotentInits.get(index);
	if (!initPerIndex) {
		initPerIndex = new Map();
		tagProcessorsIdempotentInits.set(index, initPerIndex);
	}
	var initPerValue = initPerIndex.get(litValueToken.value);
	if (!initPerValue) {
		initPerValue = newInternalId();
		initPerIndex.set(litValueToken.value, initPerValue);
		initialDeclarations.noise.push(
			{ type: "id", value: "const" },
			{ type: "id", value: initPerValue },
			{ type: "symbol", value: "=" },
			{ type: "id", value: getAlgebraFunctionName(tagId, index) },
			{ type: "symbol", value: "(" },
			litValueToken,
			{ type: "symbol", value: ");" },
			...commentTokens(tagId + ": idempotent lit val")
		);
	}
	return initPerValue;
}

function processStaticTagAlgebra(tagId, tagProcessor, stringTokens, placeholderExprs, evaluatorArgsExpr, refToken) {
	var parsedTokens = new Array();

	for (var i = 0; i < stringTokens.length; i++) {
		var stringToken = stringTokens[i];
		var interimTokens = jsTokens(stringToken.value, { startLine: stringToken.line, startColumn: stringToken.column });
		for (var interimToken of interimTokens) {
			// skip whitespaces and comments as non-significant
			if (interimToken.type == "WhiteSpace" ||
				interimToken.type == "MultiLineComment" ||
				interimToken.type == "SingleLineComment" ||
				interimToken.type == "HashbangComment" ||
				interimToken.type == "LineTerminatorSequence") continue;

				parsedTokens.push({
				type: "token",
				value: interimToken.value,
				line: interimToken.line,
				column: interimToken.column,
				position: parsedTokens.length
			});
		}

		if (i < stringTokens.length - 1) {
			var exprAtomicToken = getAtomicToken(placeholderExprs[i], refToken);
			parsedTokens.push({
				type: "placeholder",
				value: i,
				line: exprAtomicToken.line,
				column: exprAtomicToken.column,
				position: parsedTokens.length
			});
		}
	}

	var {operatorLevels, typeCasts, placeholderCasts, parseLiterals} = tagProcessor;

	var aggLevelSpecs = new Array();

	for (var operatorLevel of operatorLevels) {
		var aggLevelSpec = {
			__proto__: null
			// opSymbol => { opType, operator, closeOperator, operatorSpecs:[...] }
		};
		for (var operatorLevelItem of operatorLevel) {
			if (!aggLevelSpec[operatorLevelItem.operator]) {
				aggLevelSpec[operatorLevelItem.operator] = {
					opType: operatorLevelItem.opType,
					operator: operatorLevelItem.operator,
					openOperator: operatorLevelItem.openOperator,
					closeOperator: operatorLevelItem.closeOperator,
					operatorSpecs: new Array()
				};
				// even if there are same operator symbols on this level, they are of the same opType,
				// so we just add operatorSpecs into list
			}
			aggLevelSpec[operatorLevelItem.operator].operatorSpecs.push(operatorLevelItem);
		}
		aggLevelSpecs.push(aggLevelSpec);
	}

	function parseOperator(level, aggOperatorSpec, cursorPos, parsedHead = null) {
		switch (aggOperatorSpec.opType) {
		case 'PREFIX':
			var opToken = parsedTokens[cursorPos];
			if (opToken && opToken.type === 'token' && opToken.value === aggOperatorSpec.operator) {
				var operand = parseOperatorLevel(level, cursorPos + 1);
				if (!operand) throwSyntaxError(`${tagId} expression: value expected after '${opToken.value}'`, opToken);
				return [{
					type: 'operator1',
					operand,
					aggOperatorSpec,
					refToken: opToken,
					nextCursor: operand.nextCursor,
					operator: aggOperatorSpec.operator // mostly for debug
				}, 'done'];
			} else {
				// it may be a case if value of next level is immediately following, but as well may be a case
				// that a later operator on the list of the same level is following - we'll pass this possibility
				// to parseOperatorLevel to let it try all the level's operators first, and only then to pass to next level
				return [null, 'maybeNext']; 
			}

		case 'POSTFIX':
			if (!parsedHead) parsedHead = parseOperatorLevel(level + 1, cursorPos);
			if (!parsedHead) return null;
			var nextCursorPos = parsedHead.nextCursor;
			var opToken = parsedTokens[nextCursorPos];
			if (opToken && opToken.type === 'token' && opToken.value === aggOperatorSpec.operator) {
				var newParsedHead = {
					type: 'operator1',
					operand: parsedHead,
					aggOperatorSpec,
					refToken: opToken,
					nextCursor: nextCursorPos + 1,
					operator: aggOperatorSpec.operator // mostly for debug
				};
				return [parseOperatorLevel(level, cursorPos, newParsedHead), 'done'];
			} else {
				return [parsedHead, 'maybeNext'];
			}

		case 'LEFT_BIN':
			if (!parsedHead) parsedHead = parseOperatorLevel(level + 1, cursorPos);
			if (!parsedHead) return null;
			var nextCursorPos = parsedHead.nextCursor;
			var opToken = parsedTokens[nextCursorPos];
			if (opToken && opToken.type === 'token' && opToken.value === (aggOperatorSpec.openOperator || aggOperatorSpec.operator)) {
				var rhsOperand = parseOperatorLevel(aggOperatorSpec.closeOperator ? 0 : level + 1, nextCursorPos + 1);
				if (!rhsOperand) {
					// if no expression at RHS, then, if it is an operator with closing part (i. e. brackets),
					// RHS is void, otherwise a syntax error
					if (aggOperatorSpec.closeOperator) {
						// note: if we want to add support for empty RHS, this will apply to no-close operators as well
						rhsOperand = {
							type: 'void',
							refToken: opToken,
							nextCursor: nextCursorPos + 1
						};
					} else {
						throwSyntaxError(`${tagId} expression: value expected after '${opToken.value}'`, opToken);
					}
				}
				var newParsedHead = {
					type: 'operator2',
					lhsOperand: parsedHead,
					rhsOperand: rhsOperand,
					aggOperatorSpec,
					refToken: opToken,
					nextCursor: rhsOperand.nextCursor,
					operator: aggOperatorSpec.operator // mostly for debug
				};
				var result = parseOperatorLevel(level, cursorPos, newParsedHead);
				if (aggOperatorSpec.closeOperator) {
					var opCloseToken = parsedTokens[result.nextCursor++];
					if (!opCloseToken || opCloseToken.type !== 'token' || opCloseToken.value !== aggOperatorSpec.closeOperator)
						throwSyntaxError(`${tagId} expression: expected closing '${aggOperatorSpec.closeOperator}'`, opCloseToken, opToken)
					// right after bin operator with closing part it is possible to have a postfix operator of higher priority
					// before next bin operator of same priority - consider this possibility
					for (var preLevel = level + 1; preLevel < aggLevelSpecs.length; preLevel++) {
						var levelOps = Object.keys(aggLevelSpecs[preLevel]);
						if (levelOps.length > 0 && aggLevelSpecs[preLevel][levelOps[0]].opType === 'POSTFIX') {
							var maybePostfix = parseOperatorLevel(preLevel, result.nextCursor, result);
							if (maybePostfix) result = maybePostfix;
						}
					}
				}
				return [result, 'done'];
			} else {
				return [parsedHead, 'maybeNext'];
			}

		case 'RIGHT_BIN':
			var lhsOperand = parseOperatorLevel(level + 1, cursorPos);
			if (!lhsOperand) return null;
			var nextCursorPos = lhsOperand.nextCursor;
			var opToken = parsedTokens[nextCursorPos];
			if (opToken && opToken.type === 'token' && opToken.value === aggOperatorSpec.operator) {
				var rhsOperand = parseOperatorLevel(level, nextCursorPos + 1);
				if (!rhsOperand) throwSyntaxError(`${tagId} expression: value expected after '${opToken.value}'`, opToken);
				/* // keep this commented unless we want to support expression with empty RHS
				if (!rhsOperand) {
					rhsOperand = {
						type: 'void',
						refToken: opToken,
						nextCursor: nextCursorPos + 1
					};
				}
				*/
				return [{
					type: 'operator2',
					lhsOperand,
					rhsOperand,
					aggOperatorSpec,
					refToken: opToken,
					nextCursor: rhsOperand.nextCursor,
					operator: aggOperatorSpec.operator // mostly for debug
				}, 'done'];
			} else {
				return [lhsOperand, 'maybeNext'];
			}
		}
	}

	var placeholderCastsFlat = new Array();
	for (var placeholderType in placeholderCasts) {
		placeholderCastsFlat.push(placeholderCasts[placeholderType]);
	}

	function parseOperatorLevel(level, cursorPos, parsedHead = null) {
		if (cursorPos >= parsedTokens.length) return null; // end of stream
		// closing bracket is local end-of-stream
		if (parsedTokens[cursorPos].value === ")" || parsedTokens[cursorPos].value === "]" || parsedTokens[cursorPos].value === "}") return null;

		if (level >= aggLevelSpecs.length) {
			// we exhausted the operator precedence levels, only subexpression or atom can follow
			if (parsedTokens[cursorPos].value === "(") {
				// subexpression
				var result = parseOperatorLevel(0, cursorPos + 1);
				if (!result) {
					result = {
						type: 'void',
						refToken: parsedTokens[cursorPos],
						nextCursor: cursorPos + 1
					};
				}
				if (result.nextCursor >= parsedTokens.length || parsedTokens[result.nextCursor].value !== ")")
					throwSyntaxError(`${tagId} expression: subexpression closing ')' missing or misplaced`, parsedTokens[result.nextCursor], parsedTokens[cursorPos]);
				result.nextCursor++; // skip over ')'
				return result;
			} else if (parsedTokens[cursorPos].type === 'token') {
				var theToken = parsedTokens[cursorPos];
				var applicableParseLiterals = new Array(), strValue = theToken.value;
				for (var literalType in parseLiterals) {
					var parseLiteral = parseLiterals[literalType];
					if (parseLiteral.isApplicable(strValue)) {
						applicableParseLiterals.push(parseLiteral);
					}
				}
				if (applicableParseLiterals.length < 1) {
					throwSyntaxError(`${tagId} expression: token identifies as literal in this position and no applicable literal parser is found for it`, theToken);
				}

				return {
					type: 'literal',
					parseLiterals: applicableParseLiterals,
					refToken: theToken,
					nextCursor: cursorPos + 1
				};
			} else {
				// parsedTokens[cursorPos].type === 'placeholder'
				var theToken = parsedTokens[cursorPos];

				return {
					type: 'placeholder',
					placeholderIndex: theToken.value,
					placeholderCasts: placeholderCastsFlat,
					refToken: theToken,
					nextCursor: cursorPos + 1
				};
			}
		} else {
			// otherwise, parse the operator level
			var result = null, suggestion = null;
			for (var aggLevelSpecOperator in aggLevelSpecs[level]) {
				var aggOperatorSpec = aggLevelSpecs[level][aggLevelSpecOperator];
				var maybeResult = parseOperator(level, aggOperatorSpec, cursorPos, parsedHead);
				var [maybeResult, suggestion] = maybeResult || [null, 'done'];
				if (maybeResult && suggestion == 'done') return maybeResult;
				result = result || maybeResult; // otherwise store a best-guess
			}
			if (!result && suggestion === 'maybeNext') {
				// no operator of this level matched (possibly a prefix operators level with no operator symbol of this level) -
				// try next level instead
				result = parseOperatorLevel(level + 1, cursorPos);
			}
			return result;
		}
	}

	var rootNode = parseOperatorLevel(0, 0);
	if (!rootNode) throwSyntaxError(`${tagId} expression: empty expression`, refToken);
	if (rootNode.nextCursor < parsedTokens.length) {
		throwSyntaxError(`${tagId} expression: off-grammar token '${parsedTokens[rootNode.nextCursor].value}'`, parsedTokens[rootNode.nextCursor]);
	}

	function getOutTypes(node) {
		var result = new Set();
		switch (node.type) {
		case "operator1":
		case "operator2":
			for (var opSpec of node.aggOperatorSpec.operatorSpecs) {
				result.add(opSpec.outType);
			}
			break;
		case "placeholder":
			for (var placeholderCast of node.placeholderCasts) {
				result.add(placeholderCast.outType);
			}
			break;
		case "literal":
			for (var parseLiteral of node.parseLiterals) {
				result.add(parseLiteral.outType);
			}
			break;
		case "void":
			result.add(TYPENAME_VOID);
			break;
		}

		return result;
	}

	function getTypeCast(fromType, toType) {
		var castFromType = typeCasts[fromType];
		if (castFromType) return castFromType[toType];
		return null;
	}

	// in the given list of nodes, leave those that have minimum number of casts on their inputs
	var defaultPriorityForFilter = { priority: 1 };
	function filterLeastInputCasts(reifiedNodes) {
		var result = new Array(), minCasts = 2;
		for (var rNode of reifiedNodes) {
			var castsHere = 0;
			if (rNode.lhsOperand && rNode.lhsOperand.type === "cast") castsHere++;
			if (rNode.rhsOperand && rNode.rhsOperand.type === "cast") castsHere++;
			if (rNode.operand && rNode.operand.type === "cast") castsHere++;
			if (castsHere > minCasts) continue;
			if (castsHere < minCasts) {
				minCasts = castsHere;
				result.length = 0;
			}
			result.push(rNode);
		}

		// if there are multiple results, and additional filter is allowed, filter by:
		// - terminality (no non-IDENTITY operators in chain until a placeholder or literal),
		// - most (i. e. least numeric) priority
		if (result.length > 1) {
			var result2 = new Array(), bestPriority = 3;
			for (var rNode of result) {
				var btmstNode;
				for (btmstNode = rNode; btmstNode.operand && btmstNode.operatorSpec && btmstNode.operatorSpec.func === 'IDENTITY';
					btmstNode = btmstNode.operand) {}
				var priority = (btmstNode.operatorSpec || btmstNode.placeholderCast || btmstNode.parseLiteral || defaultPriorityForFilter).priority;
				// nodes with terminality get priority bonus over ones without one
				if (btmstNode.placeholderCast || btmstNode.parseLiteral) priority -= 3;
				rNode.priority = priority;
				if (priority < bestPriority) {
					bestPriority = priority;
					result2.length = 0;
					result2.push(rNode);
				} else if (priority == bestPriority) {
					result2.push(rNode);
				}
			}
			result = result2;
		}

		return result;
	}

	var farthestNode = null, farthestTypeName;
	function updateFarthestNode(node, typeName) {
		if (!farthestNode || farthestNode.nextCursor < node.nextCursor) {
			farthestNode = node;
			farthestTypeName = typeName;
		}
	}

	var reifyNodeCache = new Map();
	function reifyNodeForType(node, typeName) {
		var cacheForNode = reifyNodeCache.get(node);
		if (!cacheForNode) reifyNodeCache.set(node, cacheForNode = { __proto__: null });
		if (typeName in cacheForNode) return cacheForNode[typeName];
		var results = new Array(), resultTypes = new Array(), typeCaster;
		// first pass is attempt to reify node as directly the type,
		// if no candidates are found this way then 2nd pass is to reify it via type cast
		for (var castPass = 0; castPass < 2; castPass++) {
			switch (node.type) {
			case "operator1":
			case "operator2":
				NEXT_SPEC: for (var opSpec of node.aggOperatorSpec.operatorSpecs) {
					if (castPass > 0) {
						typeCaster = getTypeCast(opSpec.outType, typeName);
					} else typeCaster = null;
					if (opSpec.outType === typeName || typeCaster) {
						// try reify the node's operands with its required types - if we fail then this operator is not applicable,
						// even though it has the appropriate outType
						var lhsOperand = node.lhsOperand && reifyNodeForType(node.lhsOperand, opSpec.lhsArgType),
							rhsOperand = node.rhsOperand && reifyNodeForType(node.rhsOperand, opSpec.rhsArgType),
							operand = node.operand && reifyNodeForType(node.operand, opSpec.argType);
						if (node.lhsOperand && !lhsOperand) continue NEXT_SPEC;
						if (node.rhsOperand && !rhsOperand) continue NEXT_SPEC;
						if (node.operand && !operand) continue NEXT_SPEC;

						resultTypes.push("'" + opSpec.outType + "' (" + (node.type == "operator1" ? "unary '" + node.operator + "' [" + opSpec.argType + "]"
							: "binary '" + node.operator + "' [" + opSpec.lhsArgType + ", " + opSpec.rhsArgType + "]") + ")");
						var resultNode = {
							type: node.type,
							operatorSpec: opSpec,
							lhsOperand: node.lhsOperand && reifyNodeForType(node.lhsOperand, opSpec.lhsArgType),
							rhsOperand: node.rhsOperand && reifyNodeForType(node.rhsOperand, opSpec.rhsArgType),
							operand: node.operand && reifyNodeForType(node.operand, opSpec.argType),
							refToken: node.refToken
						};
						if (typeCaster) {
							resultNode = {
								type: "cast",
								operatorSpec: typeCaster,
								operand: resultNode,
								refToken: node.refToken
							};
						}
						results.push(resultNode);
					}
				}
				break;

			case "placeholder":
				for (var placeholderCast of node.placeholderCasts) {
					if (castPass > 0) {
						typeCaster = getTypeCast(placeholderCast.outType, typeName);
					} else typeCaster = null;
					if (placeholderCast.outType === typeName || typeCaster) {
						resultTypes.push("'" + placeholderCast.outType + "' (placeholder)");
						var resultNode = {
							type: node.type,
							placeholderCast,
							placeholderIndex: node.placeholderIndex,
							refToken: node.refToken
						};
						if (typeCaster) {
							resultNode = {
								type: "cast",
								operatorSpec: typeCaster,
								operand: resultNode,
								refToken: node.refToken
							};
						}
						results.push(resultNode);
					}
				}
				break;

			case "literal":
				for (var parseLiteral of node.parseLiterals) {
					if (castPass > 0) {
						typeCaster = getTypeCast(parseLiteral.outType, typeName);
					} else typeCaster = null;
					if (parseLiteral.outType === typeName || typeCaster) {
						resultTypes.push("'" + parseLiteral.outType + "' (literal)");
						var resultNode = {
							type: node.type,
							parseLiteral,
							value: node.refToken.value,
							refToken: node.refToken
						};
						if (typeCaster) {
							resultNode = {
								type: "cast",
								operatorSpec: typeCaster,
								operand: resultNode,
								refToken: node.refToken
							};
						}
						results.push(resultNode);
					}
				}
				break;

			case "void":
				if (typeName === TYPENAME_VOID) {
					results.push({
						type: "void"
					});
					// it is the only option when void node can proceed into result,
					// since no casts from void to any other type are allowed
				}
				break;
			}

			if (results.length > 0) break;
		}

		results = filterLeastInputCasts(results);

		if (results.length == 0) {
			return cacheForNode[typeName] = null;
		}
		if (results.length > 1) throwSyntaxError(`${tagId} expression: operand ambiguity with the following possible types: ${resultTypes.join(", ")}`, node.refToken);
		// only one result, it is the only valid non-null outcome
		updateFarthestNode(node, typeName);
		cacheForNode[typeName] = results[0];
		return results[0];
	}

	var outTypes = getOutTypes(rootNode), results = new Array(), resultTypes = new Array(),
		actualOutType;
	for (var outType of outTypes) {
		var result = reifyNodeForType(rootNode, outType);
		if (result) {
			results.push(result);
			resultTypes.push(outType);
			actualOutType = outType; // if all ok, it will be set exactly once
		}
	}
	results = filterLeastInputCasts(results);
	if (results.length == 0) {
		var failures = new Array();
		for (var [errNode, cacheForNode] of reifyNodeCache) {
			for (var typeName in cacheForNode) {
				if (cacheForNode[typeName] === null) {
					failures.push(`${errNode.refToken.line + 1}:${errNode.refToken.column + 1} ${errNode.refToken.type === 'token' ? `lit/opr '${errNode.refToken.value}'` : `placeholder #${errNode.refToken.value}`} -> '${typeName}'`);
				}
			}
		}
		throwSyntaxError(`${tagId} expression: failed to match expression to any valid type, interim cast failures: ${failures.reverse().join(', ')}; farthest successfully matched fragment was at: ${
		(farthestNode && `${farthestNode.refToken.line + 1}:${farthestNode.refToken.column + 1} ${farthestNode.refToken.type === 'token' ? `lit/opr '${farthestNode.refToken.value}'` : `placeholder #${farthestNode.refToken.value}`} -> '${farthestTypeName}'`) || "<no data>"}`,
		farthestNode && farthestNode.refToken, refToken);
	}
	if (results.length > 1) throwSyntaxError(`${tagId} expression: expression ambiguity with the following possible types: ${"'" + resultTypes.join("', '") + "'"}`, refToken);
	var compiledAstRoot = results[0];

	// do the following if trace-algebra option is enabled
	if (qsConfig.traceAlgebraTags.has(tagId)) {
		var components = new Array();
		function dumpNode(node, indent) {
			const indentStr = ' '.repeat(indent);
			switch (node.type) {
			case "literal":
				components.push(indentStr, `${node.parseLiteral.outType} <- LIT('${node.value}'))`);
				break;
			case "placeholder":
				components.push(indentStr, `${node.placeholderCast.outType} <- PLACEHOLDER #${node.placeholderIndex + 1}`);
				break;
			case "cast":
				//components.push(`${node.operatorSpec.outType} <- CAST[${node.operatorSpec.argType}](`);
				components.push(indentStr, `${node.operatorSpec.outType} <- CAST(`, "\n"); // node.operatorSpec.argType always matches the argument's out type
				dumpNode(node.operand, indent + 1);
				components.push("\n", indentStr, ")");
				break;
			case "operator1":
				//components.push(`${node.operatorSpec.outType} <- ${node.operatorSpec.opType}['${node.operatorSpec.operator}'](${node.operatorSpec.argType} <- (`);
				components.push(indentStr, `${node.operatorSpec.outType} <- ${node.operatorSpec.opType}['${node.operatorSpec.operator}'](`, "\n");
				// node.operatorSpec.argType always matches the argument's out type
				dumpNode(node.operand, indent + 1);
				components.push("\n", indentStr, ")");
				break;
			case "operator2":
				//components.push(`${node.operatorSpec.outType} <- ${node.operatorSpec.opType}['${node.operatorSpec.operator}'](${node.operatorSpec.lhsArgType} <- (`);
				components.push(indentStr, `${node.operatorSpec.outType} <- ${node.operatorSpec.opType}['${node.operatorSpec.operator}'](`, "\n");
				dumpNode(node.lhsOperand, indent + 1);
				//components.push(`), ${node.operatorSpec.rhsArgType} <- (`);
				components.push(",\n");
				// node.operatorSpec.lhsArgType, node.operatorSpec.rhsArgType always match the arguments' out types
				dumpNode(node.rhsOperand, indent + 1);
				components.push("\n", indentStr, ")");
				break;
			case "void":
				components.push(indentStr, "VOID");
				break;
			}
		}
		dumpNode(compiledAstRoot, 0);
		console.log(`Algebra trace[${tagId}]: ${srcFile}:${refToken.line + 1}:${refToken.column}, compiles to AST:${"\n"}${components.join('')}`);
	}

	// factor out operators/casts that are implemented as "IDENTITY" (i. e. no-ops)
	function stripIdentityOps(node) {
		if ((node.type === "cast" || node.type === "operator1") && node.operatorSpec.func === "IDENTITY")
			return stripIdentityOps(node.operand);
		if (node.lhsOperand) node.lhsOperand = stripIdentityOps(node.lhsOperand);
		if (node.rhsOperand) node.rhsOperand = stripIdentityOps(node.rhsOperand);
		if (node.operand) node.operand = stripIdentityOps(node.operand);
		return node;
	}

	compiledAstRoot = stripIdentityOps(compiledAstRoot);
	//console.log("RESULT", JSON.stringify(compiledAstRoot, null, " "));
	
	// prepare occurrence tag (on demand)
	var occurrenceTagName = null;
	function getOccurrenceTagName() {
		if (!occurrenceTagName) {
			occurrenceTagName = newInternalId();
			var location = lineColumnFromRefToken(refToken);
			initialDeclarations.noise.push(castToNoiseToken([
				{ type: "id", value: "const" },
				{ type: "id", value: occurrenceTagName },
				{ type: "other", value: "= new Object();" },
				...commentTokens(`${tagId}: occurrence tag for ${location.line + 1}:${location.column + 1}`)
			]));
		}
		return occurrenceTagName;
	}

	var contextVarName = getAlgebraCtxName(); // reserve name for context var, in case we need one
	var usesYield = false, usesAwait = false, contextUsed = false;

	// compile an argument name (CONTEXT, OCCURRENCE_TAG, etc.) to the corresponding evaluation expression,
	// extraArgs can be filled to add contextually dependent arguments
	function compileEvalFuncArgument(argName, extraArgs) {
		if (argName in extraArgs) return extraArgs[argName];
		switch (argName) {
		case 'CONTEXT':
			contextUsed = true;
			return castToNoiseToken([
				{ type: "id", value: contextVarName }
			]);
		case 'OCCURRENCE_TAG':
			return castToNoiseToken([
				{ type: "id", value: getOccurrenceTagName() }
			]);
		}
	}

	function compileEvalFuncArgsArray(args, extraArgs = {}) {
		var n = args.length, result = new Array();
		for (var i = 0; i < n; i++) {
			if (i > 0) result.push({ type: "symbol", value: "," });
			result.push(compileEvalFuncArgument(args[i], extraArgs));
		}
		return result;
	}

	function compileLiteral(node) {
		var literalParserId = getAlgebraFunctionName(tagId, node.parseLiteral.index),
			literalSrcToken = { type: "literal", value: JSON.stringify(node.value), ...lineColumnFromRefToken(node.refToken) };

		if (node.parseLiteral.idempotent) {
			var itempotentInitId = getAlgebraIdempotentLiteralInitializerId(tagId, node.parseLiteral.index, literalSrcToken);
			return castToNoiseToken([
				{ type: "id", value: itempotentInitId, ...lineColumnFromRefToken(node.refToken) }
			]);
		} else {
			var parserArgs = compileEvalFuncArgsArray(node.parseLiteral.args, {
				VALUE: literalSrcToken
			});
			return castToNoiseToken([
				{ type: "id", value: getAlgebraFunctionName(tagId, node.parseLiteral.index), ...lineColumnFromRefToken(node.refToken) },
				{ type: "symbol", value: "(" },
				...parserArgs,
				{ type: "symbol", value: ")" }
			]);
		}
	}

	function compilePlaceholder(node, inLazy) {
		var placeholderExpr;
		switch (node.placeholderCast.placeholderMode) {
		case 'VALUE': placeholderExpr = preprocessExpression(placeholderExprs[node.placeholderIndex], true); break;
		case 'REF_BIND': placeholderExpr = createExprReference(placeholderExprs[node.placeholderIndex], refToken, 'BIND'); break;
		case 'REF_PIN': placeholderExpr = createExprReference(placeholderExprs[node.placeholderIndex], refToken, 'PIN'); break;
		}
		if (inLazy && (placeholderExpr.usesYield || placeholderExpr.usesAwait)) {
			throwSyntaxError(`${tagId} expression: yield and await are not allowed within a lazy AST branch`,
				placeholderExpr.usesYield || placeholderExpr.usesAwait, refToken);
		}

		// case of a no-op placeholder extraction
		if (node.placeholderCast.func === 'IDENTITY') {
			// insert the placehlder expression #node.placeholderIndex, converted according to placeholderCast.placeholderMode
			return castToNoiseToken([
				{ type: "symbol", value: "(" },
				placeholderExpr,
				{ type: "symbol", value: ")" }
			]);			
		}

		// case placeholder extraction via placeholder caster
		var args = compileEvalFuncArgsArray(node.placeholderCast.args, {
			VALUE: placeholderExpr
		});

		return castToNoiseToken([
			{ type: "id", value: getAlgebraFunctionName(tagId, node.placeholderCast.index) },
			{ type: "symbol", value: "(" },
			...args,
			{ type: "symbol", value: ")" }
		]);
	}

	function compileOperator1OrCast(node, inLazy) {
		var operand = compileNode(node.operand, inLazy),
			args = compileEvalFuncArgsArray(node.operatorSpec.args, {
				OPERATOR: { type: "literal", value: node.operatorSpec.operatorStringified, ...lineColumnFromRefToken(node.refToken) },
				ARG: operand, // for op1
				VALUE: operand // for cast
			});
		return castToNoiseToken([
			{ type: "id", value: getAlgebraFunctionName(tagId, node.operatorSpec.index), ...lineColumnFromRefToken(node.refToken) },
			{ type: "symbol", value: "(" },
			...args,
			{ type: "symbol", value: ")" }
		]);
	}

	function compileOperator2(node, inLazy) {
		var lhsOperand = compileNode(node.lhsOperand, inLazy && node.operatorSpec.lhsArgLazy),
			rhsOperand = compileNode(node.rhsOperand, inLazy && node.operatorSpec.rhsArgLazy);
		if (node.operatorSpec.lhsArgLazy) lhsOperand = castToNoiseToken([
			{ type: "symbol", value: "() => (" },
			lhsOperand,
			{ type: "symbol", value: ")" }
		]);
		if (node.operatorSpec.rhsArgLazy) rhsOperand = castToNoiseToken([
			{ type: "symbol", value: "() => (" },
			rhsOperand,
			{ type: "symbol", value: ")" }
		]);
		var args = compileEvalFuncArgsArray(node.operatorSpec.args, {
			OPERATOR: { type: "literal", value: node.operatorSpec.operatorStringified, ...lineColumnFromRefToken(node.refToken) },
			LHS_ARG: lhsOperand,
			LHS_ARG_LAZY: lhsOperand,
			RHS_ARG: rhsOperand,
			RHS_ARG_LAZY: rhsOperand
		});
		return castToNoiseToken([
			{ type: "id", value: getAlgebraFunctionName(tagId, node.operatorSpec.index), ...lineColumnFromRefToken(node.refToken) },
			{ type: "symbol", value: "(" },
			...args,
			{ type: "symbol", value: ")" }
		]);
	}

	function compileVoid(node) {
		return castToNoiseToken([ { type: "other", value: "(void 0)" } ]);
	}

	function compileNode(node, inLazy) {
		switch (node.type) {
		case "literal": return compileLiteral(node);
		case "placeholder": return compilePlaceholder(node, inLazy);
		case "cast":
		case "operator1":
			return compileOperator1OrCast(node, inLazy);
		case "operator2":
			return compileOperator2(node, inLazy);
		case "void":
			return compileVoid(node);
		}
	}

	var preEvalResult = compileNode(compiledAstRoot, false),
		postEvalWrapper,
		preModeWrapper,
		postModeWrapper;

	var contextCreationNoise = new Array();
	if (tagProcessor.contextConstructorFunc) {
		// prepare a context variable
		var currentFunctionBlock = getCurrentFunctionBlock();
		if (currentFunctionBlock.isClassBoundary)
			throwSyntaxError(`${tagId} expression: this algebra uses context object and can not be used directly in class body`, refToken);

		var contextCtorFuncName = getAlgebraFunctionName(tagId, 'contextCtor'),
			contextBuiltinArgs = compileEvalFuncArgsArray(tagProcessor.contextConstructorFuncArgs, {
				VALUE_TYPE: { type: "id", value: JSON.stringify(actualOutType), ...lineColumnFromRefToken(refToken) }
			});
		if (contextBuiltinArgs.length > 0 && evaluatorArgsExpr.noise.length > 0) {
			contextBuiltinArgs.push({ type: "symbol", value: "," });
		}
		contextCreationNoise.push(
			{ type: "id", value: contextVarName },
			{ type: "symbol", value: "=" },
			{ type: "id", value: contextCtorFuncName, ...lineColumnFromRefToken(refToken) },
			{ type: "symbol", value: "(" },
			[...contextBuiltinArgs],
			evaluatorArgsExpr,
			{ type: "symbol", value: ")," }
		);
		usesYield = usesYield || evaluatorArgsExpr.usesYield;
		usesAwait = usesAwait || evaluatorArgsExpr.usesAwait;
		contextUsed = contextUsed || evaluatorArgsExpr.noise.length > 0; // using context ctor with args is an explicit ctx creation
	} else {
		if (evaluatorArgsExpr.noise.length > 0)
			throwSyntaxError(`${tagId} expression: this algebra does not define context constructor, no context arguments can be passed to its tag`, refToken);
	}

	var postEval = tagProcessor.postEvaluations[outType];
	if (!postEval) postEval = tagProcessor.postEvaluations[TYPENAME_DYNAMIC];

	var evalMode = postEval.mode;

	switch (evalMode) {
	case 'AWAIT':
		preModeWrapper = [
			{ type: "id", value: "await", ...lineColumnFromRefToken(refToken) },
			{ type: "symbol", value: "(" }
		];
		postModeWrapper = [
			{ type: "symbol", value: ")" }
		];
		result.usesAwait = result.usesAwait || preModeWrapper[0];
		break;

	case 'YIELD':
	case 'YIELD*':
		preModeWrapper = [
			{ type: "other", value: evalMode === 'YIELD' ? "yield" : "yield *", ...lineColumnFromRefToken(refToken) },
			{ type: "symbol", value: "(" }
		];
		postModeWrapper = [
			{ type: "symbol", value: ")" }
		];
		result.usesYield = result.usesYield || preModeWrapper[0];
		break;

	case 'NORMAL':
	case 'NONE':
		preModeWrapper = postModeWrapper = [];
		break;

	case 'ERROR':
		throwSyntaxError(`${tagId} expression: output type '${outType}' is not allowed for a whole expression in this alebra`, refToken);
		break;

	default:
		throwSyntaxError(`Invalid calculated evaluation mode '${evalMode}'`, refToken);
	}

	// wrap into post-evaluator (if available)
	if (postEval.func) {
		postEvalWrapper = new Array();
		var args = compileEvalFuncArgsArray(postEval.args, {
			VALUE: preEvalResult,
			VALUE_TYPE: { type: "id", value: JSON.stringify(actualOutType), ...lineColumnFromRefToken(refToken) }
		});
		postEvalWrapper.push(
			{ type: "symbol", value: getAlgebraFunctionName(tagId, postEval.index), ...lineColumnFromRefToken(refToken) },
			{ type: "symbol", value: "(" },
			...args,
			{ type: "symbol", value: ")" }
		);
	} else postEvalWrapper = [preEvalResult];

	// generate the context var if context was used
	if (contextUsed) currentFunctionBlock.extraLets.add(contextVarName);

	releaseAlgebraCtxName();

	// construct the result
	var result = castToNoiseToken(evalMode === 'NONE' ?
		// 'NONE' mode overrides the whole expression with "(void null)"
		[{ type: "symbol", value: "(void null)" }]
	: [
		...commentTokens(`${tagId} ${refToken.line + 1}:${refToken.column + 1}`),
		{ type: "symbol", value: "(" },
		...preModeWrapper,
		...(contextUsed ? contextCreationNoise : []),
		...postEvalWrapper,
		...postModeWrapper,
		{ type: "symbol", value: ")" }
	]);
	result.usesYield = usesYield;
	result.usesAwait = usesAwait;
	return result;
}

//
// main preprocessor
//

function preprocessProgram(programSrcNoise, forInlineScript) {
	var rawProgramBlock, isAsync = false;
	if (NsMatch_Function_ID_ParenthesizedNoise_BracedNoise(programSrcNoise, 0)) {
		// named function
		rawProgramBlock = programSrcNoise[3];
	} else if (NsMatch_Function_ParenthesizedNoise_BracedNoise(programSrcNoise, 0)) {
		// unnamed function
		rawProgramBlock = programSrcNoise[2];
	} else if (NsMatch_ParenthesizedNoise_RightArrow_BracedNoise(programSrcNoise, 0)) {
		// lambda function
		rawProgramBlock = programSrcNoise[2];
	} else if (NsMatch_Async_Function_ID_ParenthesizedNoise_BracedNoise(programSrcNoise, 0)) {
		// named async function
		rawProgramBlock = programSrcNoise[4];
		isAsync = true;
	} else if (NsMatch_Async_Function_ParenthesizedNoise_BracedNoise(programSrcNoise, 0)) {
		// unnamed async function
		rawProgramBlock = programSrcNoise[3];
		isAsync = true;
	} else if (NsMatch_Async_ParenthesizedNoise_RightArrow_BracedNoise(programSrcNoise, 0)) {
		// async lambda function
		rawProgramBlock = programSrcNoise[3];
		isAsync = true;
	} else {
		throwSyntaxError("QUADSUGAR-wrapped code must be a function or a lambda function with statement block, optionally async", programSrcNoise[0]);
	}

	var mainBlock = parseBlockStatement(rawProgramBlock);
	mainBlock.isFunctionBoundary = true; // tread it as such, for purposes of symbol hoisting

	//var preprocessedSrc = preprocessBlockStatement(mainBlock);
	var rootScope = newScopeBlock;
	pushScopeBlock(rootScope, true, false);

	var preprocessedSrc = preprocessBlockStatement(mainBlock);
	//console.log(JSON.stringify(preprocessedSrc, null, '\t'));
	return [{ value: forInlineScript ? "globalThis." + masterArgId + " = " : ""},
		{ value: "(" + (isAsync ? "async " : "") + "(" + masterArgId + ") => {" }, initialDeclarations, preprocessedSrc, { value: "})" },
		{ value: forInlineScript ? "(globalThis." + masterArgId + ")" : ""}];
}

return {
	preprocessProgram
};

}

//
// static tag specifiers
//

// helper for a deterministic hash on object
function toHashableString(obj) {
	const seen = new WeakSet();
    
	function stringify(value) {
		// circular references
		if (typeof value === 'object' && value !== null) {
			if (seen.has(value)) {
				return '[Circular]';
			}
			seen.add(value);
		}
        
		// functions
		if (typeof value === 'function') {
			return value.toString()
				.replace(/\s+/g, ' ') // Заменяем все пробельные символы на одиночные пробелы
				.trim();
		}
        
		// objects
		if (typeof value === 'object' && value !== null) {
			// object with already calculated id hash
			if (value.identityHash) return value.identityHash;

			// arrays
			if (Array.isArray(value)) {
				const items = value.map(item => stringify(item));
				return `[${items.join(',')}]`;
			}
            
			// general objects - sort keys
			const keys = Object.keys(value).sort();
			const keyValuePairs = keys.map(key => {
				return `${key}:${stringify(value[key])}`;
			});
			return `{${keyValuePairs.join(',')}}`;
		}
        
		// primitives
		return String(value);
    }
    
    return stringify(obj);
}

function quadsugarStaticSimpleTag(evaluatorFactory) {
	if (this !== quadsugarProto && this !== globalThis) throw new Error("staticSimpleTag can only be used as direct call from QS namespace or standalone");

	return {
		method: 'simple',
		evaluatorFactory,
		identityHash: ultraFastHash16(toHashableString(evaluatorFactory))
	};
}

function quadsugarStaticAlgebraTag(algebraCreator) {
	if (this !== quadsugarProto && this !== globalThis) throw new Error("staticAlgebraTag can only be used as direct call from QS namespace or standalone");

	function assertIsFunction(f, tagText) {
		if (typeof (f) != 'function') {
			throw new Error(tagText + " - expected a function");
		}
	}

	function assertIsString(s, tagText) {
		if (typeof (s) != 'string') {
			throw new Error(tagText + " - expected a string");
		}
	}

	function assertIsCorrectOperator(s, tagText, opSetterName) {
		assertIsString(s, tagText);
		if (s == '(' || s == ')') {
			throw new Error(tagText + " - parenthesis operator must be specified as '()'");
		}
		if (s == '[' || s == ']') {
			throw new Error(tagText + " - brackets operator must be specified as '[]'");
		}
		if (s == '{' || s == '}') {
			throw new Error(tagText + " - braces operator must be specified as '{}'");
		}

		if (opSetterName != "leftBinOperator") {
			if (s == '()') throw new Error(opSetterName + ": '()' operator can only be left-bin");
			if (s == '[]') throw new Error(opSetterName + ": '[]' operator can only be left-bin");
			if (s == '{}') throw new Error(opSetterName + ": '{}' operator can only be left-bin");
		}
	}

	function assertIsOneOf(s, tagText, ...options) {
		if (options.indexOf(s) == -1) {
			throw new Error(tagText + " - expected one of: " + options.join(', '));
		}
	}

	function assertValidValueProcArgs(specName, args) {
		for (var arg of args) {
			assertIsOneOf(arg, specName + ".evaluation args",
			"CONTEXT", "VALUE", "OCCURRENCE_TAG");
		}
		var hasValue = args.indexOf("VALUE") != -1;
		if (!hasValue) throw new Error(specName + ".evaluation args: at least VALUE must be present for value parsing or cast evaluation");
		args.usesContext = args.indexOf("CONTEXT") != -1;
	}

	function assertValidUnaryOpSpecArgs(specName, args) {
		for (var arg of args) {
			assertIsOneOf(arg, specName + ".evaluation args",
			"CONTEXT", "OPERATOR", "ARG", "ARG_LAZY", "OCCURRENCE_TAG");
		}
		var hasArg = args.indexOf("ARG") != -1,
			hasArgLazy = args.indexOf("ARG_LAZY") != -1;
		if (!hasArg && !hasArgLazy) throw new Error(specName + ".evaluation args: at least ARG/ARG_LAZY must be present for unary operator evaluation");
		if (hasArg && hasArgLazy) throw new Error(specName + ".evaluation args: ARG and ARG_LAZY can not be present together");
		args.usesContext = args.indexOf("CONTEXT") != -1;
		args.argLazy = hasArgLazy;
	}

	function assertValidBinaryOpSpecArgs(specName, args) {
		for (var arg of args) {
			assertIsOneOf(arg, specName + ".evaluation args",
			"CONTEXT", "OPERATOR", "LHS_ARG", "LHS_ARG_LAZY", "RHS_ARG", "RHS_ARG_LAZY", "OCCURRENCE_TAG");
		}
		var hasLhsArg = args.indexOf("LHS_ARG") != -1,
			hasLhsArgLazy = args.indexOf("LHS_ARG_LAZY") != -1,
			hasRhsArg = args.indexOf("RHS_ARG") != -1,
			hasRhsArgLazy = args.indexOf("RHS_ARG_LAZY") != -1;
		if ((!hasLhsArg && !hasLhsArgLazy) || (!hasRhsArg && !hasRhsArgLazy))
			throw new Error(specName + ".evaluation args: at least LHS_ARG/LHS_ARG_LAZY and RHS_ARG/RHS_ARG_LAZY must be present for binary operator evaluation");
		if (hasLhsArg && hasLhsArgLazy) throw new Error(specName + ".evaluation args: LHS_ARG and LHS_ARG_LAZY can not be present together");
		if (hasRhsArg && hasRhsArgLazy) throw new Error(specName + ".evaluation args: RHS_ARG and RHS_ARG_LAZY can not be present together");
		args.usesContext = args.indexOf("CONTEXT") != -1;
		args.lhsArgLazy = hasLhsArgLazy;
		args.rhsArgLazy = hasRhsArgLazy;
	}

	var creatorToolkit = {
		parseLiteral(typeName = TYPENAME_DYNAMIC) {
			assertIsString(typeName, "parseLiteral arg");

			return {
				specErrorStub: new Error("stub"),
				parseLiteral: {
					typeName,
					isApplicable: (strVal => true),
					evaluationFunc: null,
					evaluationFuncArgs: new Array(),
					idempotent: true,
					priority: 0
				},

				isApplicable(testFunc) {
					assertIsFunction(testFunc, "parseLiteral.testFunc arg");
					this.parseLiteral.isApplicable = testFunc;
					return this;
				},

				nonIdempotent() {
					this.parseLiteral.idempotent = false;
					return this;
				},

				evaluation(...args) {
					var evalFunc = args.pop();
					assertIsFunction(evalFunc, "parseLiteral.evaluation last arg");
					assertValidValueProcArgs("parseLiteral", args);
					var hasValue = args.indexOf("VALUE") != -1;
					if (!hasValue)
						throw new Error("parseLiteral.evaluation args: parseLiteral.evaluation function must have at least VALUE argument");

					this.parseLiteral.evaluationFunc = evalFunc;
					this.parseLiteral.evaluationFuncArgs = args;
					return this;
				},

				secondary() {
					this.parseLiteral.priority = 1;
					return this;
				}
			};
		},

		placeholderCast(typeName = TYPENAME_DYNAMIC) {
			assertIsString(typeName, "placeholderCast arg");

			return {
				specErrorStub: new Error("stub"),
				placeholderCast: {
					typeName,
					placeholderMode: 'VALUE',
					evaluationFunc: null,
					evaluationFuncArgs: new Array(),
					priority: 0
				},

				placeholderMode(mode) {
					assertIsOneOf(mode, "placeholderCast.placeholderMode arg", 'VALUE', 'REF_BIND', 'REF_PIN');
					this.placeholderCast.placeholderMode = mode;
					return this;
				},

				evaluation(...args) {
					var evalFunc = args.pop();
					assertIsFunction(evalFunc, "placeholderCast.evaluation last arg");
					this.placeholderCast.evaluationFunc = evalFunc;
					assertValidValueProcArgs("placeholderCast", args);
					this.placeholderCast.evaluationFuncArgs = args;
					return this;
				},

				secondary() {
					this.placeholderCast.priority = 1;
					return this;
				}
			};
		},

		typeCast(typeName) {
			assertIsString(typeName, "typeCast arg");
			if (typeName == TYPENAME_VOID) {
				throw new Error(`Casts from '${TYPENAME_VOID}' are not allowed`);
			}

			return {
				specErrorStub: new Error("stub"),
				typeCast: {
					typeName,
					toType: null,
					evaluationFunc: null,
					evaluationFuncArgs: new Array(),
					priority: 0
				},

				to(typeName) {
					assertIsString(typeName, "typeCast.to arg");
					this.typeCast.toType = typeName;
					return this;
				},

				evaluation(...args) {
					var evalFunc = args.pop();
					assertIsFunction(evalFunc, "typeCast.evaluation last arg");
					this.typeCast.evaluationFunc = evalFunc;
					assertValidValueProcArgs("typeCast", args);
					this.typeCast.evaluationFuncArgs = args;
					return this;
				},

				secondary() {
					this.typeCast.priority = 1;
					return this;
				}
			};
		},

		prefixOperator(...operators) {
			if (operators.length < 1) throw new Error("prefixOperator args: expected at least one operator");
			for (var op of operators) {
				assertIsCorrectOperator(op, "prefixOperator arg", "prefixOperator");
			}

			return {
				specErrorStub: new Error("stub"),
				prefixOperator: {
					operators,
					argTypeName: TYPENAME_DYNAMIC,
					resultTypeName: TYPENAME_DYNAMIC,
					evaluationFuncArgc: new Array(),
					evaluationFunc: null,
					priority: 0
				},

				argType(typeName) {
					assertIsString(typeName, "prefixOperator.argType arg");
					this.prefixOperator.argTypeName = typeName;
					return this;
				},

				resultType(typeName) {
					assertIsString(typeName, "prefixOperator.resultType arg");
					this.prefixOperator.resultTypeName = typeName;
					return this;
				},

				evaluation(...args) {
					var evalFunc = args.pop();
					assertIsFunction(evalFunc, "prefixOperator.evaluation last arg");
					this.prefixOperator.evaluationFunc = evalFunc;
					assertValidUnaryOpSpecArgs("prefixOperator", args);
					this.prefixOperator.evaluationFuncArgs = args;
					return this;
				},

				secondary() {
					this.prefixOperator.priority = 1;
					return this;
				}
			};
		},

		postfixOperator(...operators) {
			if (operators.length < 1) throw new Error("postfixOperator args: expected at least one operator");
			for (var op of operators) {
				assertIsCorrectOperator(op, "postfixOperator arg", "postfixOperator");
			}

			return {
				specErrorStub: new Error("stub"),
				postfixOperator: {
					specErrorStub: new Error("stub"),
					operators,
					argTypeName: TYPENAME_DYNAMIC,
					resultTypeName: TYPENAME_DYNAMIC,
					evaluationFuncArgs: new Array(),
					evaluationFunc: null,
					priority: 0
				},

				argType(typeName) {
					assertIsString(typeName, "postfixOperator.argType arg");
					this.postfixOperator.argTypeName = typeName;
					return this;
				},

				resultType(typeName) {
					assertIsString(typeName, "postfixOperator.resultType arg");
					this.postfixOperator.resultTypeName = typeName;
					return this;
				},

				evaluation(...args) {
					var evalFunc = args.pop();
					assertIsFunction(evalFunc, "postfixOperator.evaluation last arg");
					this.postfixOperator.evaluationFunc = evalFunc;
					assertValidUnaryOpSpecArgs("postfixOperator", args);
					this.postfixOperator.evaluationFuncArgs = args;
					return this;
				},

				secondary() {
					this.postfixOperator.priority = 1;
					return this;
				}
			};
		},

		leftBinOperator(...operators) {
			if (operators.length < 1) throw new Error("leftBinOperator args: expected at least one operator");
			for (var op of operators) {
				assertIsCorrectOperator(op, "leftBinOperator arg", "leftBinOperator");
			}

			return {
				specErrorStub: new Error("stub"),
				leftBinOperator: {
					operators,
					lhsArgTypeName: TYPENAME_DYNAMIC,
					rhsArgTypeName: TYPENAME_DYNAMIC,
					resultTypeName: TYPENAME_DYNAMIC,
					evaluationFuncArgs: new Array(),
					evaluationFunc: null,
					priority: 0
				},

				argTypes(lhsTypeName, rhsTypeName) {
					assertIsString(lhsTypeName, "leftBinOperator.argTypes left arg");
					assertIsString(rhsTypeName, "leftBinOperator.argTypes right arg");
					this.leftBinOperator.lhsArgTypeName = lhsTypeName;
					this.leftBinOperator.rhsArgTypeName = rhsTypeName;
					return this;
				},

				lhsArgType(lhsTypeName) {
					assertIsString(lhsTypeName, "leftBinOperator.lhsArgType arg");
					this.leftBinOperator.lhsArgTypeName = lhsTypeName;
					return this;
				},

				rhsArgType(rhsTypeName) {
					assertIsString(rhsTypeName, "leftBinOperator.rhsArgType arg");
					this.leftBinOperator.rhsArgTypeName = rhsTypeName;
					return this;
				},

				resultType(typeName) {
					assertIsString(typeName, "leftBinOperator.resultType arg");
					this.leftBinOperator.resultTypeName = typeName;
					return this;
				},

				evaluation(...args) {
					var evalFunc = args.pop();
					assertIsFunction(evalFunc, "leftBinOperator.evaluation last arg");
					this.leftBinOperator.evaluationFunc = evalFunc;
					assertValidBinaryOpSpecArgs("leftBinOperator", args);
					this.leftBinOperator.evaluationFuncArgs = args;
					return this;
				},

				secondary() {
					this.leftBinOperator.priority = 1;
					return this;
				}
			};
		},

		rightBinOperator(...operators) {
			if (operators.length < 1) throw new Error("rightBinOperator args: expected at least one operator");
			for (var op of operators) {
				assertIsCorrectOperator(op, "rightBinOperator arg", "rightBinOperator");
			}

			return {
				specErrorStub: new Error("stub"),
				rightBinOperator: {
					operators,
					lhsArgTypeName: TYPENAME_DYNAMIC,
					rhsArgTypeName: TYPENAME_DYNAMIC,
					resultTypeName: TYPENAME_DYNAMIC,
					evaluationFuncArgs: new Array(),
					evaluationFunc: null,
					priority: 0
				},

				argTypes(lhsTypeName, rhsTypeName) {
					assertIsString(lhsTypeName, "rightBinOperator.argTypes left arg");
					assertIsString(rhsTypeName, "rightBinOperator.argTypes right arg");
					this.rightBinOperator.lhsArgTypeName = lhsTypeName;
					this.rightBinOperator.rhsArgTypeName = rhsTypeName;
					return this;
				},

				lhsArgType(lhsTypeName) {
					assertIsString(lhsTypeName, "rightBinOperator.lhsArgType arg");
					this.rightBinOperator.lhsArgTypeName = lhsTypeName;
					return this;
				},

				rhsArgType(rhsTypeName) {
					assertIsString(rhsTypeName, "rightBinOperator.rhsArgType arg");
					this.rightBinOperator.rhsArgTypeName = rhsTypeName;
					return this;
				},

				resultType(typeName) {
					assertIsString(typeName, "rightBinOperator.resultType arg");
					this.rightBinOperator.resultTypeName = typeName;
					return this;
				},

				evaluation(...args) {
					var evalFunc = args.pop();
					assertIsFunction(evalFunc, "rightBinOperator.evaluation last arg");
					this.rightBinOperator.evaluationFunc = evalFunc;
					assertValidBinaryOpSpecArgs("rightBinOperator", args);
					this.rightBinOperator.evaluationFuncArgs = args;
					return this;
				},

				secondary() {
					this.rightBinOperator.priority = 1;
					return this;
				}
			};
		},

		contextConstructor(...args) {
			var ctorFunc = args.pop();
			assertIsFunction(ctorFunc, "contextConstructor arg");
			for (var arg of args) {
				assertIsOneOf(arg, "contextConstructor args", "OCCURRENCE_TAG", "VALUE_TYPE");
			}

			return {
				contextConstructor: {
					ctorFunc,
					ctorFuncArgs: args
				}
			};
		},

		postEvaluation(...typeNames) {
			if (typeNames.length < 1) typeNames = [TYPENAME_DYNAMIC];
			for (var typeName of typeNames)
				if (typeof (typeName) !== 'string') throw new Error(`postEvaluation arg: type must be a string (default is '${TYPENAME_DYNAMIC}')`);

			return {
				specErrorStub: new Error("stub"),
				postEvaluation: {
					mode: 'NORMAL',
					typeNames,
					evaluationFuncArgs: new Array(),
					evaluationFunc: null
				},

				mode(evalMode) {
					assertIsOneOf(evalMode, "postEvaluation.mode arg", "NORMAL", "AWAIT", "YIELD", "YIELD*", "ERROR", "NONE");
					this.postEvaluation.mode = evalMode;
					return this;
				},

				evaluation(...args) {
					var evalFunc = args.pop();
					assertIsFunction(evalFunc, "postEvaluation.evaluation last arg");
					for (var arg of args) {
						assertIsOneOf(arg, "postEvaluation.evaluation args", "CONTEXT", "VALUE", "VALUE_TYPE", "OCCURRENCE_TAG");
					}
					this.postEvaluation.evaluationFunc = evalFunc;
					this.postEvaluation.evaluationFuncArgs = args;
					return this;
				},
			};
		}
	};

	var srcSpecs = algebraCreator(creatorToolkit);
	if (!Array.isArray(srcSpecs)) {
		throw new Error("Algebra specification creator function must return an array of items created via the supplied toolkit");
	}

	var algebraSpec = {
		method: 'algebra',
		contextConstructorFunc: null,
		contextConstructorFuncArgs: null,
		postEvaluations: {
			__proto__: null,
			// typename => { func, args, index }
		},
		//postEvaluationFunc: null,
		//postEvaluationFuncArgs: null,
		evalMode: 'NORMAL',
		typeCasts: {
			__proto__: null,
			// typename => { toTypename => { func: evaluationFunc or 'IDENTITY', args, index, comment }}
		},
		placeholderCasts: {
			__proto__: null
			// typename => { func: placeholderCastFunc or 'IDENTITY', args, index, comment }
		},
		parseLiterals: {
			__proto__: null
			// typename => { func: parseFunc or 'IDENTITY', args, index, comment }
		},
		// [ { opType: 'PREFIX'|'POSTFIX'|'LEFT_BIN'|'RIGHT_BIN', operator: '<symbol>', argType (or lhsArgType, rhsArgType), outType, func: evalFunc, args, index, comment } ]
		operatorLevels: new Array(),
		functionShortcuts: new Array(),
		functionShortcutComments: new Array()
	};
	var usesContext = false, // then we'll changed it based on the specs encountered
		typesFromUsed = new Set(),
		typesToUsed = new Set(),
		operatorIndex = 0;

	function compileOperatorSpecs(opSpecArray, specIdx) {
		if (opSpecArray.length < 1) {
			throw new Error("Specification for an operator level must be not empty");
		}
		var targetSpecs = new Array(), specTypes = new Set(), subIdx = 0;
		NEXT_SPEC: for (var opSpec of opSpecArray) {
			var srcSpec, targetSpec = new Object();
			switch (true) {
			case !!opSpec.leftBinOperator:
				targetSpec.opType = 'LEFT_BIN';
				srcSpec = opSpec.leftBinOperator;
				break;

			case !!opSpec.rightBinOperator:
				targetSpec.opType = 'RIGHT_BIN';
				srcSpec = opSpec.rightBinOperator;
				break;

			case !!opSpec.prefixOperator:
				targetSpec.opType = 'PREFIX';
				srcSpec = opSpec.prefixOperator;
				break;

			case !!opSpec.postfixOperator:
				targetSpec.opType = 'POSTFIX';
				srcSpec = opSpec.postfixOperator;
				break;

			default:
				var error = (opSpec && (opSpec.specErrorStub.message = "Not an operator spec", opSpec.specErrorStub)) ||
					(new Error(`Not a valid algebra operator spec element at index ${specIdx}, sub-index ${subIdx}`));
				throw error;
			}

			specTypes.add(targetSpec.opType);
			if (specTypes.size > 1) {
				var error = opSpec.specErrorStub;
				error.message = "Only one type of operators (prefix, postfix, left-bin or right-bin) is allowed at same precedence level";
				throw error;
			}

			for (var operator of srcSpec.operators) {
				var targetSpec2 = new Object();
				Object.assign(targetSpec2, targetSpec);
				Object.assign(targetSpec2, {
					operator,
					operatorStringified: JSON.stringify(operator),
					index: operatorIndex++, // will be used for building compiler cache
					argType: srcSpec.argTypeName, // only defined for prefix and postfix
					argLazy: srcSpec.evaluationFuncArgs && srcSpec.evaluationFuncArgs.argLazy,
					lhsArgType: srcSpec.lhsArgTypeName, // only defined for left-bin and right-bin
					rhsArgType: srcSpec.rhsArgTypeName, // similarly
					lhsArgLazy: srcSpec.evaluationFuncArgs && srcSpec.evaluationFuncArgs.lhsArgLazy,
					rhsArgLazy: srcSpec.evaluationFuncArgs && srcSpec.evaluationFuncArgs.rhsArgLazy,
					outType: srcSpec.resultTypeName,
					func: srcSpec.evaluationFunc || (srcSpec.argTypeName && 'IDENTITY'),
					args: srcSpec.evaluationFuncArgs,
					priority: srcSpec.priority
				});
				if ((targetSpec.argType === 'LEFT_BIN' || targetSpec.argType === 'RIGHT_BIN') && !srcSpec.evaluationFunc) {
					var error = opSpec.specErrorStub;
					error.message = "Binary operator can not have unspecified evaluation";
					throw error;
				}
				targetSpec2.comment = `${targetSpec2.opType} '${targetSpec2.operator}' (${
					targetSpec2.argType ? targetSpec2.argType : `${targetSpec2.lhsArgType}, ${targetSpec2.rhsArgType}`
				}) -> ${targetSpec2.outType}`,
				algebraSpec.functionShortcuts[targetSpec2.index] = targetSpec2.func;
				algebraSpec.functionShortcutComments[targetSpec2.index] = targetSpec2.comment;
				if (targetSpec2.operator == "()") { targetSpec2.openOperator = "("; targetSpec2.closeOperator = ")"; }
				if (targetSpec2.operator == "[]") { targetSpec2.openOperator = "["; targetSpec2.closeOperator = "]"; }
				if (targetSpec2.operator == "{}") { targetSpec2.openOperator = "{"; targetSpec2.closeOperator = "}"; }
				targetSpecs.push(targetSpec2);

				typesFromUsed.add(targetSpec2.argType);
				typesFromUsed.add(targetSpec2.lhsArgType);
				typesFromUsed.add(targetSpec2.rhsArgType);
				typesFromUsed.add(targetSpec2.outType);
				typesToUsed.add(targetSpec2.outType);
			}
			usesContext = usesContext || (targetSpec.evaluationFuncArgs && targetSpec.evaluationFuncArgs.usesContext);
		}

		algebraSpec.operatorLevels.push(targetSpecs);
	}

	var specIdx = 0;
	for (var srcSpec of srcSpecs) {
		if (!srcSpec || typeof (srcSpec) !== 'object') {
			throw new Error("Invalid specification item");
		}

		if (srcSpec.prefixOperator || srcSpec.postfixOperator || srcSpec.leftBinOperator || srcSpec.rightBinOperator) {
			// single operator spec is a shortcut for multi-spec with one entry
			srcSpec = [srcSpec];
		}
		if (Array.isArray(srcSpec)) {
			compileOperatorSpecs(srcSpec, specIdx++);
			continue;
		}

		// non-operator spec
		if (srcSpec.parseLiteral) {
			var {typeName, isApplicable, evaluationFunc, evaluationFuncArgs, idempotent} = srcSpec.parseLiteral;
			if (algebraSpec.parseLiterals[typeName]) {
				srcSpec.specErrorStub.message = `Literal parser for type '${typeName}' is already specified`;
				throw srcSpec.specErrorStub;
			}

			if (idempotent && evaluationFunc && (evaluationFuncArgs.length != 1 || evaluationFuncArgs[0] != 'VALUE')) {
				srcSpec.specErrorStub.message = `Evaluator for idempotent literal parser for type '${typeName}' must have exactly one 'VALUE' argument`;
				throw srcSpec.specErrorStub;
			}

			algebraSpec.parseLiterals[typeName] = {
				isApplicable,
				outType: typeName,
				func: evaluationFunc || 'IDENTITY',
				args: evaluationFuncArgs,
				index: operatorIndex++,
				idempotent
			};
			algebraSpec.functionShortcuts[operatorIndex - 1] = evaluationFunc;
			algebraSpec.functionShortcutComments[operatorIndex - 1] = `literal -> ${typeName}`;
			usesContext = usesContext || (evaluationFuncArgs && evaluationFuncArgs.usesContext);
			typesFromUsed.add(typeName);
			typesToUsed.add(typeName);
		}

		// evaluation mode
		if (srcSpec.setEvaluationMode) {
			algebraSpec.evalMode = srcSpec.setEvaluationMode.mode;
		}

		// type cast
		if (srcSpec.typeCast) {
			var {typeName, toType, evaluationFunc, evaluationFuncArgs, priority} = srcSpec.typeCast;
			if (!toType) {
				srcSpec.specErrorStub.message = `Typecast specification must include .to(typename)`;
				throw srcSpec.specErrorStub;
			}

			if (!toType == TYPENAME_DYNAMIC) {
				srcSpec.specErrorStub.message = `Typecasts to '${TYPENAME_DYNAMIC}' are inherently implicit`;
				throw srcSpec.specErrorStub;
			}

			if (algebraSpec.typeCasts[typeName] && algebraSpec.typeCasts[typeName][toType]) {
				srcSpec.specErrorStub.message = `Typecast from '${typeName}' to '${toType}' is already specified`;
				throw srcSpec.specErrorStub;
			}

			if (!algebraSpec.typeCasts[typeName]) algebraSpec.typeCasts[typeName] = { __proto__: null };
			algebraSpec.typeCasts[typeName][toType] = {
				argType: typeName,
				outType: toType,
				func: evaluationFunc || 'IDENTITY',
				args: evaluationFuncArgs,
				index: operatorIndex++,
				priority
			};
			algebraSpec.functionShortcuts[operatorIndex - 1] = evaluationFunc;
			algebraSpec.functionShortcutComments[operatorIndex - 1] = `cast (${typeName}) -> ${toType}`;
			usesContext = usesContext || (evaluationFuncArgs && evaluationFuncArgs.usesContext);
			typesFromUsed.add(typeName);
			typesToUsed.add(toType);
		}

		// placeholder cast
		if (srcSpec.placeholderCast) {
			var {typeName, placeholderMode, evaluationFunc, evaluationFuncArgs, priority} = srcSpec.placeholderCast;
			if (algebraSpec.placeholderCasts[typeName]) {
				srcSpec.specErrorStub.message = `Placeholder cast to '${typeName}' is already specified`;
				throw srcSpec.specErrorStub;
			}

			algebraSpec.placeholderCasts[typeName] = {
				outType: typeName,
				func: evaluationFunc || 'IDENTITY',
				args: evaluationFuncArgs,
				placeholderMode,
				index: operatorIndex++,
				priority
			};
			algebraSpec.functionShortcuts[operatorIndex - 1] = evaluationFunc;
			algebraSpec.functionShortcutComments[operatorIndex - 1] = `placeholder -> ${typeName}`;
			typesFromUsed.add(typeName);
			typesToUsed.add(typeName);
		}

		// context ctor
		if (srcSpec.contextConstructor) {
			if (algebraSpec.contextConstructorFunc) {
				srcSpec.specErrorStub.message = `Context constructor is already specified`;
				throw srcSpec.specErrorStub;
			}

			algebraSpec.contextConstructorFunc = srcSpec.contextConstructor.ctorFunc;
			algebraSpec.contextConstructorFuncArgs = srcSpec.contextConstructor.ctorFuncArgs;
		}

		// post-evaluation
		if (srcSpec.postEvaluation) {
			var {typeNames, mode, evaluationFunc, evaluationFuncArgs} = srcSpec.postEvaluation;
			var index = operatorIndex++;
			algebraSpec.functionShortcuts[operatorIndex - 1] = evaluationFunc;
			algebraSpec.functionShortcutComments[operatorIndex - 1] = `post-evaluator on ${typeNames}`;
			for (var typeName of typeNames) {
				if (algebraSpec.postEvaluations[typeName]) {
					srcSpec.specErrorStub.message = `Post-evaluator on '${typeName}' is already specified`;
					throw srcSpec.specErrorStub;
				}
				algebraSpec.postEvaluations[typeName] = {
					mode,
					func: evaluationFunc,
					args: evaluationFuncArgs,
					index
				};
				
			}
		}

		specIdx++;
	}

	// validate that if at least one ...FuncArgs.usesContext then we must have non-null contextConstructorFunc
	if (usesContext && !algebraSpec.contextConstructorFunc) {
		throw new Error("Some parts of the algebra use 'CONTEXT' argument, but no context constructor is specified");
	}

	algebraSpec.operatorLevels.reverse(); // better order for parsing them top-down

	// add implicit casts to TYPENAME_DYNAMIC (except for from TYPENAME_VOID)
	typesToUsed.add(TYPENAME_DYNAMIC);
	for (var typeName of typesFromUsed) {
		if (typeName && typeName != TYPENAME_VOID) {
			if (!algebraSpec.typeCasts[typeName]) algebraSpec.typeCasts[typeName] = { __proto__: null };
			if (!algebraSpec.typeCasts[typeName][TYPENAME_DYNAMIC] && typeName !== TYPENAME_DYNAMIC) {
				algebraSpec.typeCasts[typeName][TYPENAME_DYNAMIC] = {
					argType: typeName,
					outType: TYPENAME_DYNAMIC,
					func: 'IDENTITY',
					priority: 2
				};
			}
		}
	}

	// placeholder cast to dynamic is at least built-in
	if (!algebraSpec.placeholderCasts[TYPENAME_DYNAMIC]) {
		algebraSpec.placeholderCasts[TYPENAME_DYNAMIC] = {
			outType: TYPENAME_DYNAMIC,
			placeholderMode: 'VALUE',
			func: 'IDENTITY',
			priority: 2
		};
	}

	if (!algebraSpec.postEvaluations[TYPENAME_DYNAMIC]) {
		algebraSpec.postEvaluations[TYPENAME_DYNAMIC] = {
			mode: 'NORMAL',
			func: null,
			args: null
		};
	}

	// validate that input types are covered by output types
	for (var typeName of typesFromUsed) {
		if (typeName && !typesToUsed.has(typeName) && typeName !== TYPENAME_VOID && TYPENAME_DYNAMIC) {
			throw new Error(`Type '${typeName}' used for input, but no casts or operators specified with it as output`);
		}
	}

	algebraSpec.identityHash = ultraFastHash16(toHashableString(algebraSpec));
	return algebraSpec;
}

//
// the main wrappers
//

function prepareRuntimeConfig(qsConfig) {
	var runtimeConfig = {
		staticTagProcessors: { ...qsConfig.staticTagProcessors },
		staticTagData: {
			__proto__: null
			// tag => { prepared: [...] }, will be prepared below
		}
	};

	for (var tagId in qsConfig.staticTagProcessors) {
		var tagProcessor = qsConfig.staticTagProcessors[tagId];
		runtimeConfig.staticTagData[tagId] = {
			prepared: new Array(),
			evaluatorFactory: tagProcessor.evaluatorFactory
		};
	}

	return runtimeConfig;
}

function wrap(funcObj, evalFunc) {
	if (!evalFunc && typeof(document) === 'undefined') {
		throw new Error("QS wrap with no evaluation function is only applicable in browser environment");
	}

	this[SYM_FROZEN] = true; // no more modifcations to the config instance after wrap on its base

	var qsConfig = this[SYM_CONFIG], cacheConfig = this[SYM_CACHE], runtimeConfig = prepareRuntimeConfig(qsConfig);
	// get the subject function source code coordinates (method compatible with V8 & firefox)
	var srcFile = "", srcLine = 0, srcColumn = 0;
	var stack = new Error().stack;
	//var locationMatch = stack.match(/quadsugarWrap(?:\s*\[as.*?\]\s*)?(?:\s*\(|@)(.*?):(\d+):(\d+)[\S\s]*?(?:\s*\(|@|at\s+)(.*?):(\d+):(\d+)[\S\s]*?/);
	var locationMatch = stack.match(/wrap(?:\s*\[as.*?\]\s*)?(?:\s*\(|@)(.*?):(\d+):(\d+)[\S\s]*?(?:\s*\(|@|at\s+)(.*?):(\d+):(\d+)[\S\s]*?/);

	if (locationMatch) {
		[srcFile, srcLine, srcColumn] = [locationMatch[4], (+locationMatch[5]) - 1, (+locationMatch[6]) - 1];
	} else {
		console.warn("QS: failed to detect preprocess source origin, defaults will be used");
	}
	srcFile = srcFile.replace(/^.*?\s\(/, ""); // strip unrelated shit from the filename match

	var srcCode = typeof (funcObj) === 'function' ? funcObj.toString() : null;
	
	if (!this[SYM_CONFIG].identityHash) this[SYM_CONFIG].identityHash = ultraFastHash16(toHashableString(this[SYM_CONFIG]));
	var srcHash = srcCode === null ? funcObj : ultraFastHash16(`${this[SYM_CONFIG].identityHash}.${String(locationMatch)}:${srcCode}.${evalFunc ? evalFunc.toString() : ""}`);

	function compileProgram(srcCode, forInlineScript) {
		if (srcCode === null) throw new Error("QS wrap is used in hash-only mode, and no matching item is found in cache");
		srcCode = parseAsL1Noise(srcCode, srcLine, srcColumn);

		// preprocess the src
		var preprocessor = Preprocessor(srcFile, qsConfig, runtimeConfig);
		srcCode = preprocessor.preprocessProgram(srcCode, forInlineScript);

		//var inputCode = require("fs").readFileSync(srcFile, "utf-8"); // attach source code (for source map generation debug)
		var inputCode = null;
		var resultAndSourceMap = emitWithSourceMap(srcCode, srcFile, inputCode, qsConfig);
		console.log(srcFile);
		return resultAndSourceMap[0] + (resultAndSourceMap[1] ? ";\n//# sourceMappingURL=data:application/json;base64," + encodeBase64(resultAndSourceMap[1])
			+ "\n//# sourceURL=" + srcFile : ";"); // need this in addition to "sources" entry in the map, otherwise browser is reluctant to do the mapping
	}

	function exec(compiledProgram, evalFunc, runtimeConfig) {
		if (evalFunc) {
			var callable = evalFunc(compiledProgram);
			return callable(runtimeConfig);
		} else {
			// no eval func, assuming browser
			var inOutVar = compiledProgram.match(/^\s*globalThis\.(.*?)\s*=/);
			if (!inOutVar) throw Error("Compiled QS wrapped code is not fit for default browser execution");
			inOutVar = inOutVar[1];
			globalThis[inOutVar] = runtimeConfig;
			var scriptElem = document.createElement("script");
			scriptElem.textContent = compiledProgram;
			document.documentElement.appendChild(scriptElem);
			return globalThis[inOutVar];
		}
	}

	var cache = cacheConfig && cacheConfig.cache;
	if (cache && !cacheConfig.sync) {
		// async cache
		async function commitCache() {
			var items = commitCache.items, itemHashes = new Array(), i = 0, n = items.length;
			commitCache.items = new Array(); // clear queue for possibly next batch
			for (var item of items) itemHashes.push(item.srcHash);
			var cachedItems = await cache.getItems(itemHashes);

			for (var item of items) {
				var compiledProgram;
				if (qsConfig.profLabel) {
					console.info("Profiling QS wrap " + item.srcLocation + " (async cache commit)");
					console.time(qsConfig.profLabel);
				}
				try {
					compiledProgram = cachedItems[item.srcHash];
					if (typeof (compiledProgram) !== 'string' || this[SYM_CONFIG].disableCacheHit) {
						if (qsConfig.profLabel) console.info(`QS wrap ${item.srcLocation}` + ": async cache miss, recompile");
						compiledProgram = compileProgram(item.srcCode, !item.evalFunc);
						await cache.setItem(item.srcHash, compiledProgram);
					} else {
						if (qsConfig.profLabel) console.info(`QS wrap ${item.srcLocation}` + ": async cache hit");
					}
				} finally {
					if (qsConfig.profLabel) console.timeEnd(qsConfig.profLabel);
				}
				try {
					var ir = exec(compiledProgram, item.evalFunc, item.runtimeConfig);
					if (ir instanceof Promise) await ir; // if it is async, await for the result
				} catch (e) {
					console.error(e);
				}

				if (cache.asyncPostScript) await cache.asyncPostScript(i, n, item.srcLocation);
			}
		}

		if (!cache.commit || !Array.isArray(cache.commit.items)) {
			cache.commit = commitCache;
			commitCache.items = new Array();
		}

		cache.commit.items.push({
			srcLocation: `${srcFile}:${srcLine}:${srcColumn}`,
			srcHash,
			srcCode,
			evalFunc,
			runtimeConfig
		});
	} else {
		// sync cache or no cache
		var compiledProgram, srcLocation = `${srcFile}:${srcLine}:${srcColumn}`;
		if (qsConfig.profLabel) {
			console.info("Profiling QS wrap " + srcLocation);
			console.time(qsConfig.profLabel);
		}
		try {
			if (cache) compiledProgram = cache.getItems([srcHash])[srcHash];
			if (compiledProgram instanceof Promise) throw new Error("QS: sync cache mode requires cache object with synchronous methods");
			if (typeof (compiledProgram) !== 'string' || this[SYM_CONFIG].disableCacheHit) {
				if (cache && qsConfig.profLabel) console.info(`QS wrap ${srcLocation}` + ": sync cache miss, recompile");
				compiledProgram = compileProgram(srcCode, !evalFunc);
				if (cache) {
					cache.setItem(srcHash, compiledProgram);
				}
			} else {
				if (qsConfig.profLabel) console.info(`QS wrap ${srcLocation}` + ": sync cache hit");
			}
		} finally {
			if (qsConfig.profLabel) console.timeEnd(qsConfig.profLabel);
		}

		try {
			var ir = exec(compiledProgram, evalFunc, runtimeConfig);
			if (ir instanceof Promise) console.warn("QS wrap " + srcLocation + ": sync wrapping of async function can result in inconsistent side effects");
		} catch (e) {
			console.error(e);
		}
	}
}

function newBlankConfig() {
	return {
		__proto__: null,
		staticTagProcessors: { __proto__: null },
		keywordOverrides: { __proto__: null },
		traceAlgebraTags: new Set(),
		generateComments: false,
		generateSourceMap: true
		// profLabel is not set by default
	};
}

function copyConfig(cfg) {
	return {
		__proto__: null,
		staticTagProcessors: { __proto__: null, ...cfg.staticTagProcessors },
		keywordOverrides: { __proto__: null, ...cfg.keywordOverrides },
		traceAlgebraTags: new Set([...cfg.traceAlgebraTags]),
		generateComments: cfg.generateComments,
		generateSourceMap: cfg.generateSourceMap,
		profLabel: cfg.profLabel
	};
}

function ensureUnusedCopy(qsObj) {
	if (qsObj === quadsugarProto) {
		return {
			__proto__: quadsugarProto,
			[SYM_CONFIG]: newBlankConfig()
		};
	}
	if (qsObj[SYM_FROZEN]) throw new Error("This QS config instance was already used for wrapping and cannot be modified. Create a copy via copyConfig.");
	return qsObj;
}

const quadsugarProto = {
	[SYM_CONFIG]: newBlankConfig(),
	wrap,
	useKeywordOverrides(keywordOverrides) {
		var me = ensureUnusedCopy(this);
		Object.assign(me[SYM_CONFIG].keywordOverrides, keywordOverrides);
		delete me[SYM_CONFIG].identityHash;
		return me;
	},
	useStaticTags(staticTagProcessorsById) {
		var me = ensureUnusedCopy(this);
		Object.assign(me[SYM_CONFIG].staticTagProcessors, staticTagProcessorsById);
		delete me[SYM_CONFIG].identityHash;
		return me;
	},
	useInternalPrefix(internalPrefix) {
		var me = ensureUnusedCopy(this);
		me[SYM_CONFIG].internalPrefix = internalPrefix;
		delete me[SYM_CONFIG].identityHash;
		return me;
	},
	generateSourceMap(genSourceMap) {
		var me = ensureUnusedCopy(this);
		me[SYM_CONFIG].generateSourceMap = genSourceMap;
		delete me[SYM_CONFIG].identityHash;
		return me;
	},

	// the following settings don't invalidate identity hash, since they are not critical for code identity
	traceAlgebraTags(...tagIds) {
		var me = ensureUnusedCopy(this);
		for (var tagId of tagIds) {
			if (typeof (tagId) !== 'string') throw new Error("traceAlgebraTags args can only be strings");
			me[SYM_CONFIG].traceAlgebraTags.add(tagId);
		}
		return me;
	},
	generateComments(genComments) {
		var me = ensureUnusedCopy(this);
		me[SYM_CONFIG].generateComments = genComments;
		return me;
	},
	useSyncCache(cache) {
		var me = ensureUnusedCopy(this);
		me[SYM_CACHE] = { sync: true, cache };
		return me;
	},
	useAsyncCache(cache) {
		var me = ensureUnusedCopy(this);
		me[SYM_CACHE] = { sync: false, cache };
		return me;
	},
	disableCacheHit(yes = true) {
		var me = ensureUnusedCopy(this);
		me[SYM_CONFIG].disableCacheHit = yes;
		return me;
	},
	useProfilingWithLabel(profLabel) {
		var me = ensureUnusedCopy(this);
		me[SYM_CONFIG].profLabel = profLabel;
		return me;
	},

	// the following methods are only for use directly from QS namespace or standalone
	copyConfig(config) {
		if (this !== quadsugarProto && this !== globalThis) throw new Error("copyConfig can only be used as direct call from QS namespace or standalone");
		return {
			__proto__: quadsugarProto,
			[SYM_CONFIG]: copyConfig(config[SYM_CONFIG]),
			[SYM_CACHE]: config[SYM_CACHE]
		};
	},
	staticSimpleTag: quadsugarStaticSimpleTag,
	staticAlgebraTag: quadsugarStaticAlgebraTag
};


//
// caches (browser only, OptionalSyncCache can be partially used with node.js)
//

quadsugarProto.OptionalSyncCache = function OptionalSyncCache(name = "qs-captured-evanescent-cache") {
	if (new.target != null) return OptionalSyncCache(name);

	var me,
		stored = { __proto__: null },
		captureNewItems = false,
		keysReferenced = new Set(),
		storedBlob,
		cacheModified = false;

	return (me = {
		__proto__: OptionalSyncCache.prorotype,

		setItem(hash, item) {
			if (captureNewItems) {
				if (stored[hash] !== item) cacheModified = true;
				stored[hash] = item;
			}
			if (storedBlob) {
				URL.revokeObjectURL(storedBlob.src);
				storedBlob = null;
			}
			keysReferenced.add(hash);
		},

		getItems(hashes) {
			var result = { __proto__: null };
			for (var hash of hashes) {
				keysReferenced.add(hash);
				result[hash] = stored[hash] || null;
			}
			return result;
		},

		setPrecapturedItems(items) {
			Object.assign(stored, typeof (items) === 'string' ? JSON.parse(items) : items);
			return me;
		},

		// this method can only be used with node.js
		nodejsLoadPrecapturedItemsFromFileSync(filePath, suppressWarning = true) {
			try {
				stored = JSON.parse(require('fs').readFileSync(filePath, { encoding: 'utf8' }));
			} catch (e) {
				if (!suppressWarning) console.warn("Failed to load precaptured cache items from " + filePath, e);
			}
			return me;
		},

		// this method can only be used with node.js
		async nodejsLoadPrecapturedItemsFromFileAsync(filePath, suppressWarning = true) {
			try {
				stored = JSON.parse(await require('fs').promises.readFile(filePath, { encoding: 'utf8' }));
			} catch (e) {
				if (!suppressWarning) console.warn("Failed to load precaptured cache items from " + filePath, e);
			}
			return me;
		},

		captureNewItems(yes) { captureNewItems = yes; return me; },

		cacheModified() { return cacheModified; },

		prune() {
			var keysToDelete = new Array();
			for (var key of Object.keys(stored)) {
				if (!keysReferenced.has(key)) keysToDelete.push(key);
			}
			for (var key of keysToDelete) {
				delete stored[key];
				cacheModified = true;
			}
			return me;
		},

		getCapturedJson() {
			if (!captureNewItems) throw new Error("OptionalSyncCache must have captureNewItems enabled in order to use getCapturedJson");
			return JSON.stringify(stored);
		},

		// this method can only be used with browser
		browserDownloadCapturedJson(name) {
			if (!captureNewItems) throw new Error("OptionalSyncCache must have captureNewItems set to true to use browserDownloadCapturedJson");
			if (!storedBlob) {
				storedBlob = new Blob([JSON.stringify(stored)], { type: "application/octet-stream" });
				storedBlob.src = URL.createObjectURL(storedBlob);
			}
			const link = document.createElement('a');
			link.href = storedBlob.src;
			link.download = name + ".json";
			link.click();
			return true;
		},

		// this method can only be used with node.js
		nodejsSaveCapturedItemsToFileSync(filePath) {
			if (!captureNewItems) throw new Error("OptionalSyncCache must have captureNewItems set to true to use nodejsSaveCapturedItemsToFile");
			try {
				require('fs').writeFileSync(filePath, JSON.stringify(stored));
			} catch (e) {
				return false;
			}
			return true;
		},

		// this method can only be used with node.js
		async nodejsSaveCapturedItemsToFileAsync(filePath) {
			if (!captureNewItems) throw new Error("OptionalSyncCache must have captureNewItems set to true to use nodejsSaveCapturedItemsToFileAsync");
			try {
				await require('fs').promises.writeFileSync(filePath, JSON.stringify(stored));
			} catch (e) {
				return false;
			}
			return true;
		},
	});
}

quadsugarProto.LocalStorageSyncCache = function LocalStorageSyncCache(name) {
	if (new.target != null) return LocalStorageSyncCache(name);

	var me,
		storage = window.localStorage,
		prefix = name + ".",
		lengthKey = prefix + "length",
		runtimeId = ultraFastHash16(`${new Date().getTime()}${Math.random()}`),
		prefixByHash;

	function rehash() {
		prefixByHash = { __proto__: null };
		var len = +(storage.getItem(lengthKey) || 0);
		for (var i = 0; i < len; i++) {
			var iPrefix = prefix + i,
				hash = storage.getItem(iPrefix + ".hash");
			if (hash) prefixByHash[hash] = iPrefix;
		}
	}

	rehash();

	function getItem(hash) {
		var iPrefix = prefixByHash[hash];
		if (!iPrefix) return null;

		// found the item - return it and refresh its runtimeId to the current one
		var item = storage.getItem(iPrefix + ".item");
		storage.setItem(iPrefix + ".runtimeId", runtimeId);
		return item;
	}

	return (me = {
		__proto__: LocalStorageSyncCache.prototype,

		clear() {
			// only remove all the keys starting with our prefix
			var myKeys = new Array(), n = storage.length;
			for (var i = 0; i < n; i++) {
				var maybeMyKey = storage.key(i);
				if (maybeMyKey.startsWith(prefix)) myKeys.push(maybeMyKey);
			}
			for (var myKey of myKeys) storage.removeItem(myKey);
			prefixByHash = { __proto__: null };
			return me;
		},

		prune() {
			// move items with the appropriate runtime IDs to form continuous run at the start
			var nBefore = +(storage.getItem(lengthKey) || 0), nAfter = 0;
			for (var i = 0; i < nBefore; i++) {
				var iPrefix = prefix + i,
					keyRuntimeId = iPrefix + ".runtimeId",
					iRuntimeId = storage.getItem(keyRuntimeId);
				if (iRuntimeId === runtimeId) {
					// it is our runtime ID - preserve it
					if (i != nAfter) {
						var keyHash = iPrefix + ".hash",
							hash = storage.getItem(keyHash),
							keyItem = iPrefix + ".item",
							item = storage.getItem(keyItem);

						storage.removeItem(keyRuntimeId);
						storage.removeItem(keyHash);
						storage.removeItem(keyItem);

						var iaPrefix = prefix + nAfter;
						storage.setItem(iaPrefix + ".runtimeId", runtimeId);
						storage.setItem(iaPrefix + ".hash", hash);
						storage.setItem(iaPrefix + ".item", item);
					}
					nAfter++;
				}
			}

			// set new length
			storage.setItem(lengthKey, nAfter);

			// clean up remaining stuff
			for (var i = nAfter; i < nBefore; i++) {
				var iPrefix = prefix + i;
				storage.removeItem(iPrefix + ".runtimeId");
				storage.removeItem(iPrefix + ".hash");
				storage.removeItem(iPrefix + ".item");
			}

			rehash();
			return me;
		},

		getItems(hashes) {
			var result = { __proto__: null };
			for (var i = 0; i < hashes.length; i++) {
				result[hashes[i]] = getItem(hashes[i]);
			}
			return result;
		},

		setItem(hash, item) {
			// we'll make two attempts
			for (var attempt = 0; attempt < 2; attempt++) {
				try {
					var iPrefix = prefixByHash[hash];
					if (iPrefix) {
						// item already exists - replace
						storage.setItem(iPrefix + ".item", item);
						storage.setItem(iPrefix + ".runtimeId", runtimeId);
						return;
					} else {
						// no item yet - append
						var len = +(storage.getItem(lengthKey) || 0);
						iPrefix = prefix + len;
						storage.setItem(iPrefix + ".hash", hash);
						storage.setItem(iPrefix + ".item", item);
						storage.setItem(iPrefix + ".runtimeId", runtimeId);
						storage.setItem(lengthKey, len + 1);

						prefixByHash[hash] = iPrefix;
					}
				} catch (e) {
					// something nasty happened, probably local storage overflow, so attempt to clear the cache and retry
					console.warn("LocalStorageSyncCache.setItem error, cache will be reset", e);
					me.clear();
				}
			}

			// if we got here then, well, no luck, fail silently
		}
	});
};

quadsugarProto.IndexedDbAsyncCache = function IndexedDbAsyncCache(name) {
	if (new.target != null) return LocalStorageSyncCache(name);
	var me,
		db,
		storeName = "qscache",
		runtimeId = ultraFastHash16(`${new Date().getTime()}${Math.random()}`);

	async function ensureDb() {
		if (!db) {
			return new Promise((resolve, reject) => {
				const request = window.indexedDB.open(name, 1);

				request.onerror = () => {
					console.warn("Failed to open cache DB " + name, request.error);
					reject(request.error);
				};

				request.onsuccess = () => {
					db = request.result;
					resolve(db);
				};

				request.onupgradeneeded = (event) => {
					const db = event.target.result;
					const objectStore = db.createObjectStore(storeName, {
						keyPath: 'hash'
					});
				};
			});
		}
	}

	async function clearOrPrune(clearAll) {
		await new Promise((resolve) => {
			const transaction = db.transaction([storeName], 'readwrite');
			const objectStore = transaction.objectStore(storeName);

			const hashesToDelete = new Array();

			// collect all hashes with runtimeId not matching the current one
			new Promise((resolve2) => {
				const request = objectStore.openCursor();
				request.onerror = () => {
					console.warn("Failed to scan QS IDB cache " + name + " for prunable items");
					resolve2();
				};

				request.onsuccess = () => {
					const cursor = request.result;
					if (cursor) {
						if (clearAll || cursor.value.runtimeId !== runtimeId) {
							hashesToDelete.push(cursor.value.hash);
						}
						cursor.continue();
					} else {
						resolve2();
					}
				};
			}).then(() => {
				for (var hash of hashesToDelete) {
					objectStore.delete(hash); // basically we don't care much of the result
				}
				resolve();
			});
		});
	}

	return (me = {
		__proto__: IndexedDbAsyncCache.prototype,

		async setItem(hash, item) {
			await ensureDb();

			await new Promise((resolve) => {
				const transaction = db.transaction([storeName], 'readwrite');
				const objectStore = transaction.objectStore(storeName);
				const request = objectStore.put({
					hash,
					item,
					runtimeId
				});

				request.onerror = () => {
					console.warn("Failed to cache item hash " + hash + " to QS IDB cache " + name);
					resolve();
				};

				request.onsuccess = () => { resolve(); };
			});
		},

		async getItems(hashes) {
			await ensureDb();

			var result = { __proto__: null };
			if (hashes.length <= 0) return result;

			return await new Promise((resolve) => {
				const transaction = db.transaction([storeName], 'readonly');
				const objectStore = transaction.objectStore(storeName);

				var completed = 0;
				for (const hash of hashes) {
					const request = objectStore.get(hash);
					request.onerror = () => {
						result[hash] = null;
						if (++completed >= hashes.length) resolve(result);
					};

					request.onsuccess = () => {
						result[hash] = request.result ? request.result.item : null;
						if (request.result) {
							const updateRuntimeIdTransaction = db.transaction([storeName], 'readwrite');
							const objectStore = updateRuntimeIdTransaction.objectStore(storeName);
							request.result.runtimeId = runtimeId;

							new Promise((resolve2) => {
								const updateRequest = objectStore.put(request.result);
								updateRequest.onerror = () => {
									console.warn("Failed to refresh item hash " + hash + " in QS IDB cache " + name);
									resolve2();
								};

								updateRequest.onsuccess = () => {
									resolve2();
								}
							}).then(() => {
								if (++completed >= hashes.length) resolve(result);
							});
						} else {
							if (++completed >= hashes.length) resolve(result);
						}
					};
				}
			});
		},

		async getItem(hash) {
			return (await me.getItems([hash]))[hash];
		},

		async clear() {
			await ensureDb();
			await clearOrPrune(true);
			return me;
		},

		async prune() {
			await ensureDb();
			await clearOrPrune(false);
			return me;
		},

		async close() {
			if (db) {
				db.close();
				db = null;
			}
		}
		// the DB will auto-reopen on demand though
	});
};

if (typeof (module) !== 'undefined' && typeof (exports) !== 'undefined') {
	module.exports = quadsugarProto;
} else if (typeof (exports) !== 'undefined') {
	exports.QUADSUGAR = quadsugarProto;
} else {
	globalThis.QUADSUGAR = quadsugarProto;
}

})();
