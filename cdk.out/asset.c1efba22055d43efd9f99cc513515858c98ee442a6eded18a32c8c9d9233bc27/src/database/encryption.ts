/**
 * Encryption utilities for sensitive user data storage
 * Uses AES-256-GCM for authenticated encryption
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

// Initialize KMS client
const kmsClient = new KMSClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});

/**
 * Generate encryption key from environment variable or create a new one
 */
function getEncryptionKey(): Buffer {
  const keyString = process.env.ENCRYPTION_KEY;
  
  if (keyString) {
    // Use provided key, hash it to ensure consistent length
    return createHash('sha256').update(keyString).digest();
  }
  
  // For demo/development, use a consistent default key
  const defaultSeed = 'demo-therapeutic-wave-interface-encryption-key';
  return createHash('sha256').update(defaultSeed).digest();
}

/**
 * Encrypt sensitive data using AES-256-GCM
 */
export function encryptSensitiveData(data: string): string {
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    
    const cipher = createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from('therapeutic-wave-interface'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine IV, tag, and encrypted data
    const result = iv.toString('hex') + tag.toString('hex') + encrypted;
    
    return result;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypt sensitive data using AES-256-GCM
 */
export function decryptSensitiveData(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    
    // Extract IV, tag, and encrypted data
    const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
    const tag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), 'hex');
    const encrypted = encryptedData.slice((IV_LENGTH + TAG_LENGTH) * 2);
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from('therapeutic-wave-interface'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
}

/**
 * Encrypt transcript data using AWS KMS
 */
export async function encryptTranscriptWithKMS(transcript: string): Promise<string> {
  try {
    const kmsKeyId = process.env.KMS_KEY_ID;
    
    if (!kmsKeyId) {
      console.warn('KMS_KEY_ID not provided, falling back to local encryption');
      return encryptSensitiveData(transcript);
    }

    const command = new EncryptCommand({
      KeyId: kmsKeyId,
      Plaintext: Buffer.from(transcript, 'utf8'),
      EncryptionContext: {
        purpose: 'therapeutic-transcript',
        application: 'hope-ai-companion'
      }
    });

    const response = await kmsClient.send(command);
    
    if (!response.CiphertextBlob) {
      throw new Error('KMS encryption failed - no ciphertext returned');
    }

    // Convert to base64 for storage
    return Buffer.from(response.CiphertextBlob).toString('base64');
  } catch (error) {
    console.error('KMS encryption error:', error);
    // Fallback to local encryption if KMS fails
    console.warn('Falling back to local encryption due to KMS error');
    return encryptSensitiveData(transcript);
  }
}

/**
 * Decrypt transcript data using AWS KMS
 */
export async function decryptTranscriptWithKMS(encryptedTranscript: string): Promise<string> {
  try {
    const kmsKeyId = process.env.KMS_KEY_ID;
    
    // If no KMS key configured, try local decryption
    if (!kmsKeyId) {
      return decryptSensitiveData(encryptedTranscript);
    }

    // Try KMS decryption first
    try {
      const command = new DecryptCommand({
        CiphertextBlob: Buffer.from(encryptedTranscript, 'base64'),
        EncryptionContext: {
          purpose: 'therapeutic-transcript',
          application: 'hope-ai-companion'
        }
      });

      const response = await kmsClient.send(command);
      
      if (!response.Plaintext) {
        throw new Error('KMS decryption failed - no plaintext returned');
      }

      return Buffer.from(response.Plaintext).toString('utf8');
    } catch (kmsError) {
      console.warn('KMS decryption failed, trying local decryption:', kmsError);
      // Fallback to local decryption (for backwards compatibility)
      return decryptSensitiveData(encryptedTranscript);
    }
  } catch (error) {
    console.error('Transcript decryption error:', error);
    throw new Error('Failed to decrypt transcript data');
  }
}

/**
 * Hash sensitive data for indexing (one-way hash)
 */
export function hashForIndex(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a secure random user ID
 */
export function generateSecureUserId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Generate a secure random session ID
 */
export function generateSecureSessionId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Sanitize data before encryption (remove potential PII patterns)
 */
export function sanitizeBeforeEncryption(data: string): string {
  // Remove common PII patterns while preserving therapeutic content
  let sanitized = data;
  
  // Remove email addresses
  sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
  
  // Remove phone numbers (various formats)
  sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
  sanitized = sanitized.replace(/\b\(\d{3}\)\s?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
  
  // Remove social security numbers
  sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
  
  // Remove credit card numbers (basic pattern)
  sanitized = sanitized.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]');
  
  // Remove addresses (basic pattern - house number + street)
  sanitized = sanitized.replace(/\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/gi, '[ADDRESS]');
  
  return sanitized;
}

/**
 * Validate encryption configuration
 */
export function validateEncryptionConfig(): boolean {
  try {
    const testData = 'test-encryption-validation';
    const encrypted = encryptSensitiveData(testData);
    const decrypted = decryptSensitiveData(encrypted);
    
    return decrypted === testData;
  } catch (error) {
    console.error('Encryption validation failed:', error);
    return false;
  }
}

/**
 * Encryption metadata for audit purposes
 */
export interface EncryptionMetadata {
  algorithm: string;
  keyVersion: string;
  encryptedAt: string;
  dataType: 'conversation' | 'notes' | 'contact' | 'other';
}

/**
 * Create encryption metadata
 */
export function createEncryptionMetadata(dataType: EncryptionMetadata['dataType']): EncryptionMetadata {
  return {
    algorithm: ALGORITHM,
    keyVersion: process.env.ENCRYPTION_KEY_VERSION || '1',
    encryptedAt: new Date().toISOString(),
    dataType
  };
}