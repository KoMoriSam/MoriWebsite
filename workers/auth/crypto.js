const encoder = new TextEncoder();
const decoder = new TextDecoder();
const bytes = (value) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
export const base64url = (value) =>
  btoa(String.fromCharCode(...new Uint8Array(value))).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
export const randomToken = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
export const hash = async (value) => base64url(await crypto.subtle.digest("SHA-256", encoder.encode(value)));

async function encryptionKey(secret) {
  const key = bytes(secret);
  if (key.length !== 32) throw new Error("Expected a 256-bit credential encryption key");
  return crypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encrypt(secret, userId, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(`github:${userId}`) },
    await encryptionKey(secret), encoder.encode(JSON.stringify(value)),
  );
  return `${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...new Uint8Array(data)))}`;
}

export async function decrypt(secret, userId, value) {
  const [iv, data] = value.split(".").map(bytes);
  const clear = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(`github:${userId}`) },
    await encryptionKey(secret), data,
  );
  return JSON.parse(decoder.decode(clear));
}
