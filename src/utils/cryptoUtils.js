export const bytesToBase64 = (bytes) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};

export const base64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export const hashPin = async (pin, saltB64, PBKDF2_ITERATIONS = 120000) => {
  const subtle = globalThis?.crypto?.subtle;
  if (!subtle) throw new Error('WebCrypto not available');

  const salt = saltB64 ? base64ToBytes(saltB64) : globalThis.crypto.getRandomValues(new Uint8Array(16));
  const pinBytes = new TextEncoder().encode(pin);

  const keyMaterial = await subtle.importKey('raw', pinBytes, 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );

  return { salt: bytesToBase64(salt), hash: bytesToBase64(new Uint8Array(bits)) };
};

export const verifyPin = async (pin, record, PBKDF2_ITERATIONS = 120000) => {
  const { salt, hash } = await hashPin(pin, record.salt, PBKDF2_ITERATIONS);
  return salt === record.salt && hash === record.hash;
};
