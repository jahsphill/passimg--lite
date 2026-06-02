/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  email: string;
  bio: string;
  avatar: string;
  isAdmin: boolean;
  joinedAt: string;
  balance: number;
  onboardingRole?: string;
  onboardingCompleted?: boolean;
}

export interface RegisteredImage {
  id: string; // Dynamic code e.g., PIMG-782910
  title: string;
  description: string;
  category: string;
  creatorId: string;
  creatorName: string;
  hash: string; // SHA-256
  imageUrl: string; // Base64 or curated placeholder URL
  registeredAt: string;
  originalSize: number; // in bytes
  dimensions: string;
  tags: string[];
  isForSale: boolean;
  price: number;
  licenseType: 'Commercial' | 'Editorial' | 'Personal' | 'All';
  salesCount: number;
  verificationCount: number;
  popularityScore: number;
}

export interface VerificationEvent {
  id: string;
  imageId: string | null;
  imageTitle: string;
  uploadedFileName: string;
  hashTried: string;
  timestamp: string;
  status: 'verified' | 'failed';
  similarity: number; // 0 to 100
  triggeredBy: string;
}

export interface SaleRecord {
  id: string;
  imageId: string;
  imageTitle: string;
  price: number;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  timestamp: string;
  licenseType: 'Commercial' | 'Editorial' | 'Personal';
}
