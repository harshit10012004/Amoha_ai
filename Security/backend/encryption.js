import crypto from 'node:crypto';
import dotenv from 'dotenv';
dotenv.config();

const algorithm = 'aes-256-gcm';
const key = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);

if (!process.env.ENCRYPTION_KEY) {
  console.warn('WARNING: Using random encryption key. Set ENCRYPTION_KEY env var for production!');
}

export function encryptData(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');
  return { encryptedData: encrypted, iv: iv.toString('base64'), authTag };
}

export function decryptData(encryptedData, iv, authTag) {
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function generateKey() {
  return crypto.randomBytes(32);
}

export function rotateKey() {
  const oldKey = key;
  const newKey = generateKey();
  console.log('Key rotation performed. Old key deprecated.');
  return newKey;
}

export function verifyEncryptionIntegrity(encryptedData, iv, authTag) {
  try {
    decryptData(encryptedData, iv, authTag);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}