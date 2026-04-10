import { describe, it, expect } from 'vitest';
import {
  validateSearchParams,
  TrendsQuerySchema,
  sanitizeUrl,
  sanitizeString,
} from './apiValidation';

describe('API validation', () => {
  describe('validateSearchParams', () => {
    it('should validate valid query parameters', () => {
      const params = new URLSearchParams({ refresh: '1' });
      const result = validateSearchParams(params, TrendsQuerySchema);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.refresh).toBe('1');
      }
    });

    it('should reject invalid refresh parameter', () => {
      const params = new URLSearchParams({ refresh: 'invalid' });
      const result = validateSearchParams(params, TrendsQuerySchema);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('refresh');
      }
    });

    it('should use default value for missing parameter', () => {
      const params = new URLSearchParams({});
      const result = validateSearchParams(params, TrendsQuerySchema);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.refresh).toBe('0');
      }
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow valid HTTPS URLs', () => {
      const url = 'https://example.com/path';
      const result = sanitizeUrl(url);
      
      expect(result).toBe(url);
    });

    it('should allow valid HTTP URLs', () => {
      const url = 'http://example.com/path';
      const result = sanitizeUrl(url);
      
      expect(result).toBe(url);
    });

    it('should block localhost', () => {
      const url = 'http://localhost:3000';
      const result = sanitizeUrl(url);
      
      expect(result).toBeNull();
    });

    it('should block private IP ranges', () => {
      const url = 'http://192.168.1.1';
      const result = sanitizeUrl(url);
      
      expect(result).toBeNull();
    });

    it('should block AWS metadata endpoint', () => {
      const url = 'http://169.254.169.254';
      const result = sanitizeUrl(url);
      
      expect(result).toBeNull();
    });

    it('should block non-HTTP protocols', () => {
      const url = 'file:///etc/passwd';
      const result = sanitizeUrl(url);
      
      expect(result).toBeNull();
    });

    it('should handle malformed URLs', () => {
      const url = 'not-a-url';
      const result = sanitizeUrl(url);
      
      expect(result).toBeNull();
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      const result = sanitizeString('  test  ');
      expect(result).toBe('test');
    });

    it('should remove HTML tags', () => {
      const result = sanitizeString('<script>alert("xss")</script>test');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should truncate to max length', () => {
      const longString = 'a'.repeat(600);
      const result = sanitizeString(longString, 500);
      
      expect(result.length).toBe(500);
    });

    it('should handle empty string', () => {
      const result = sanitizeString('');
      expect(result).toBe('');
    });

    it('should use default max length', () => {
      const longString = 'a'.repeat(600);
      const result = sanitizeString(longString);
      
      expect(result.length).toBe(500);
    });
  });
});
