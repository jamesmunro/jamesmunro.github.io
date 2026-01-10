import assert from "node:assert/strict";
import { test } from "node:test";

const base64UrlEncode = (value) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const buildToken = (header, payload) => {
  const headerSegment = base64UrlEncode(JSON.stringify(header));
  const payloadSegment = base64UrlEncode(JSON.stringify(payload));
  return `${headerSegment}.${payloadSegment}.signature`;
};

test("decodes header and payload JSON", async () => {
  const { decodeSegment, decodeToken } = await import("./jwt-reader.js");
  const header = { alg: "HS256", typ: "JWT" };
  const payload = { sub: "123", admin: true };
  const token = buildToken(header, payload);

  assert.deepEqual(JSON.parse(decodeSegment(token.split(".")[0])), header);
  assert.deepEqual(JSON.parse(decodeSegment(token.split(".")[1])), payload);
  assert.deepEqual(decodeToken(token), { header, payload });
});

test("decodes tokens with whitespace and newlines", async () => {
  const { decodeToken } = await import("./jwt-reader.js");
  const header = { alg: "HS256", typ: "JWT" };
  const payload = { sub: "456", role: "editor" };
  const token = buildToken(header, payload);
  const spacedToken = `\n${token.slice(0, 10)}\n${token.slice(10)}  `;

  assert.deepEqual(decodeToken(spacedToken), { header, payload });
});

test("throws on invalid Base64 segments", async () => {
  const { decodeSegment } = await import("./jwt-reader.js");

  assert.throws(() => decodeSegment("###"), /Invalid Base64/);
});
