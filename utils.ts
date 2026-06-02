/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Computes the real SHA-256 cryptographic hash of a File using the Web Crypto API.
 */
export async function computeSHA256(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        resolve(hashHex);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("File reading failed"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generates a SHA-256 hash of a string to simulate minor modification.
 */
export async function computeStringSHA256(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a unique Registration ID (PIMG-XXXXXX)
 */
export function generateRegistrationId(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `PIMG-${digits}`;
}

/**
 * Generates a unique Transaction ID (TX-XXXX)
 */
export function generateTransactionId(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `TX-${digits}`;
}

/**
 * Generates a unique Verification Event ID (VER-XXXX)
 */
export function generateVerificationId(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `VER-${digits}`;
}

/**
 * Formats bytes into a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats ISO strings into clean readable date/time representatons.
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });
}

/**
 * Formats simple currencies.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

/**
 * Calculates a pseudo-similarity score between alternate images or details
 */
export function calculateSimilarity(nameA: string, sizeA: number, nameB: string, sizeB: number): number {
  if (nameA === nameB && sizeA === sizeB) {
    return 100.0;
  }
  // If files differ, generate a realistic score based on string distance/size proportion
  const sizeDiffRatio = Math.min(sizeA, sizeB) / Math.max(sizeA, sizeB);
  const wordOverlap = nameA.split(/[-_\s.]/).filter(w => nameB.includes(w)).length;
  const wordRatio = wordOverlap / Math.max(nameA.split(/[-_\s.]/).length, 1);
  
  const score = (sizeDiffRatio * 60) + (wordRatio * 40);
  // Ensure it operates nicely between 10% and 99% for simulated alters
  return parseFloat(Math.max(15, Math.min(99.6, score * 100)).toFixed(1));
}
