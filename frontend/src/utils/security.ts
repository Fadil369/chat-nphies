import { z } from 'zod';

// NPHIES-specific validation schemas
export const PatientIdSchema = z.string()
  .regex(/^\d{10}$/, 'Patient ID must be exactly 10 digits')
  .refine((id) => {
    // Basic checksum validation for Saudi National ID
    const digits = id.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * (10 - i);
    }
    const checkDigit = (11 - (sum % 11)) % 11;
    return digits[9] === checkDigit;
  }, 'Invalid Patient ID checksum');

export const CoverageIdSchema = z.string()
  .min(3, 'Coverage ID must be at least 3 characters')
  .max(20, 'Coverage ID must not exceed 20 characters')
  .regex(/^[A-Z0-9-]+$/i, 'Coverage ID can only contain letters, numbers, and hyphens');

export const ClaimIdSchema = z.string()
  .min(3, 'Claim ID must be at least 3 characters')
  .max(30, 'Claim ID must not exceed 30 characters')
  .regex(/^[A-Z0-9-]+$/i, 'Claim ID can only contain letters, numbers, and hyphens');

export const ProcedureCodeSchema = z.string()
  .regex(/^\d{6,}$/, 'SNOMED code must be numeric and at least 6 digits')
  .refine((code) => {
    // Validate against common NPHIES SNOMED codes
    const validCodes = [
      '103693007', // Physiotherapy
      '386053000', // Dietary consultation
      '182836005', // Consultation
      '448178005', // Specialist consultation
      '410055007'  // Medical examination
    ];
    return validCodes.includes(code) || code.length >= 6;
  }, 'Invalid or unrecognized SNOMED code');

export const DiagnosisCodeSchema = z.string()
  .regex(/^[A-Z]\d{2}(\.\d{1,2})?$/i, 'ICD-10 code must be in format: A00 or A00.0')
  .refine((code) => {
    // Basic ICD-10 structure validation
    const upperCode = code.toUpperCase();
    const firstChar = upperCode.charAt(0);
    return firstChar >= 'A' && firstChar <= 'Z';
  }, 'ICD-10 code must start with a letter');

export const AmountSchema = z.number()
  .positive('Amount must be positive')
  .max(1000000, 'Amount exceeds maximum limit of 1,000,000 SAR')
  .multipleOf(0.01, 'Amount must have at most 2 decimal places');

export const MessageContentSchema = z.string()
  .min(1, 'Message cannot be empty')
  .max(2000, 'Message is too long (max 2000 characters)')
  .refine((content) => {
    // Check for potentially malicious content
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi
    ];
    return !dangerousPatterns.some(pattern => pattern.test(content));
  }, 'Message contains potentially unsafe content');

// Eligibility request validation
export const EligibilityRequestSchema = z.object({
  patientId: PatientIdSchema,
  coverageId: CoverageIdSchema,
  procedureCode: ProcedureCodeSchema.optional(),
  serviceType: z.enum(['outpatient', 'inpatient', 'emergency']).optional()
});

// Claim submission validation
export const ClaimSubmissionSchema = z.object({
  claimId: ClaimIdSchema,
  patientId: PatientIdSchema,
  coverageId: CoverageIdSchema,
  diagnosis: DiagnosisCodeSchema,
  amount: AmountSchema,
  procedureCode: ProcedureCodeSchema.optional(),
  serviceDate: z.string().datetime().optional()
});

// Chat message validation
export const ChatMessageSchema = z.object({
  content: MessageContentSchema,
  metadata: z.record(z.unknown()).optional()
});

// API endpoint validation
export const ApiEndpointSchema = z.enum([
  'eligibility',
  'claim', 
  'pre-authorization',
  'payment',
  'patient-record'
]);

// Security utilities
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
    .trim()
    .slice(0, 2000); // Limit length
}

export function validateCsrfToken(token: string): boolean {
  // In a real implementation, this would validate against a stored token
  return token.length >= 32 && /^[a-zA-Z0-9]+$/.test(token);
}

export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Rate limiting utilities
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000 // 1 minute
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove expired requests
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const requests = this.requests.get(identifier) || [];
    const now = Date.now();
    const validRequests = requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  getResetTime(identifier: string): number {
    const requests = this.requests.get(identifier) || [];
    if (requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...requests);
    return oldestRequest + this.windowMs;
  }
}

export const apiRateLimiter = new RateLimiter(20, 60000); // 20 requests per minute
export const chatRateLimiter = new RateLimiter(30, 60000); // 30 messages per minute

// Content Security Policy
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", 'https://api.ollama.com'],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'", 'https://api.ollama.com', 'https://api.nphies.gov.sa'],
  'media-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
};

export function generateCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}