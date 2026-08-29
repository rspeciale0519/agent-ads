export class StrictJsonError extends Error {
  constructor(code) {
    super(code);
    this.name = "StrictJsonError";
    this.code = code;
  }
}

function fail(code) {
  throw new StrictJsonError(code);
}

export function parseStrictJson(raw) {
  let index = 0;

  function skipWhitespace() {
    while (index < raw.length && /[\t\n\r ]/u.test(raw[index])) index += 1;
  }

  function parseString() {
    if (raw[index] !== '"') fail("JSON_INVALID");
    const start = index;
    index += 1;
    while (index < raw.length) {
      const character = raw[index];
      if (character === '"') {
        index += 1;
        try {
          return JSON.parse(raw.slice(start, index));
        } catch {
          fail("JSON_INVALID");
        }
      }
      if (character === "\\") {
        index += 2;
        continue;
      }
      if (character.charCodeAt(0) < 0x20) fail("JSON_INVALID");
      index += 1;
    }
    fail("JSON_INVALID");
  }

  function parsePrimitive() {
    const start = index;
    while (index < raw.length && !/[\t\n\r ,\]}]/u.test(raw[index])) index += 1;
    if (index === start) fail("JSON_INVALID");
  }

  function parseArray(depth) {
    index += 1;
    skipWhitespace();
    if (raw[index] === "]") {
      index += 1;
      return;
    }
    while (index < raw.length) {
      parseValue(depth + 1);
      skipWhitespace();
      if (raw[index] === "]") {
        index += 1;
        return;
      }
      if (raw[index] !== ",") fail("JSON_INVALID");
      index += 1;
      skipWhitespace();
    }
    fail("JSON_INVALID");
  }

  function parseObject(depth) {
    index += 1;
    const keys = new Set();
    skipWhitespace();
    if (raw[index] === "}") {
      index += 1;
      return;
    }
    while (index < raw.length) {
      const key = parseString();
      if (keys.has(key)) fail("JSON_DUPLICATE_OBJECT_KEY");
      keys.add(key);
      skipWhitespace();
      if (raw[index] !== ":") fail("JSON_INVALID");
      index += 1;
      parseValue(depth + 1);
      skipWhitespace();
      if (raw[index] === "}") {
        index += 1;
        return;
      }
      if (raw[index] !== ",") fail("JSON_INVALID");
      index += 1;
      skipWhitespace();
    }
    fail("JSON_INVALID");
  }

  function parseValue(depth) {
    if (depth > 100) fail("JSON_INVALID");
    skipWhitespace();
    if (index >= raw.length) fail("JSON_INVALID");
    if (raw[index] === "{") return parseObject(depth);
    if (raw[index] === "[") return parseArray(depth);
    if (raw[index] === '"') {
      parseString();
      return;
    }
    parsePrimitive();
  }

  parseValue(0);
  skipWhitespace();
  if (index !== raw.length) fail("JSON_INVALID");

  try {
    return JSON.parse(raw);
  } catch {
    fail("JSON_INVALID");
  }
}
