import { describe, it, expect } from 'vitest';
import { isValidISBN10, isValidISBN13, detectISBN } from './validation';

describe('ISBN Validation', () => {
  describe('isValidISBN10', () => {
    it('validates correct ISBN-10 with numeric check digit', () => {
      // "Feynman Lectures on Physics" ISBN-10
      expect(isValidISBN10('0306406152')).toBe(true);
    });

    it('validates correct ISBN-10 with X check digit', () => {
      // "Introduction to Algorithms" ISBN-10 with X
      expect(isValidISBN10('080442957X')).toBe(true);
    });

    it('validates ISBN-10 with hyphens', () => {
      expect(isValidISBN10('0-306-40615-2')).toBe(true);
    });

    it('validates ISBN-10 with spaces', () => {
      expect(isValidISBN10('0 306 40615 2')).toBe(true);
    });

    it('rejects ISBN-10 with invalid checksum', () => {
      expect(isValidISBN10('0306406153')).toBe(false);
    });

    it('rejects ISBN-10 with wrong length', () => {
      expect(isValidISBN10('030640615')).toBe(false);
      expect(isValidISBN10('03064061521')).toBe(false);
    });

    it('rejects ISBN-10 with invalid characters', () => {
      expect(isValidISBN10('030640615A')).toBe(false);
    });

    it('accepts lowercase x as check digit', () => {
      expect(isValidISBN10('080442957x')).toBe(true);
    });
  });

  describe('isValidISBN13', () => {
    it('validates correct ISBN-13', () => {
      // "The Hobbit" ISBN-13
      expect(isValidISBN13('9780261102217')).toBe(true);
    });

    it('validates ISBN-13 with hyphens', () => {
      expect(isValidISBN13('978-0-261-10221-7')).toBe(true);
    });

    it('validates ISBN-13 with spaces', () => {
      expect(isValidISBN13('978 0 261 10221 7')).toBe(true);
    });

    it('rejects ISBN-13 with invalid checksum', () => {
      expect(isValidISBN13('9780261102218')).toBe(false);
    });

    it('rejects ISBN-13 with wrong length', () => {
      expect(isValidISBN13('978026110221')).toBe(false);
      expect(isValidISBN13('97802611022171')).toBe(false);
    });

    it('rejects ISBN-13 with non-numeric characters', () => {
      expect(isValidISBN13('978026110221X')).toBe(false);
    });
  });

  describe('detectISBN', () => {
    it('detects valid ISBN-10', () => {
      const result = detectISBN('0306406152');
      expect(result.isISBN).toBe(true);
      expect(result.type).toBe('ISBN10');
      expect(result.cleaned).toBe('0306406152');
    });

    it('detects valid ISBN-13', () => {
      const result = detectISBN('9780261102217');
      expect(result.isISBN).toBe(true);
      expect(result.type).toBe('ISBN13');
      expect(result.cleaned).toBe('9780261102217');
    });

    it('detects ISBN with hyphens', () => {
      const result = detectISBN('978-0-261-10221-7');
      expect(result.isISBN).toBe(true);
      expect(result.type).toBe('ISBN13');
    });

    it('returns false for non-ISBN strings', () => {
      expect(detectISBN('the lord of the rings').isISBN).toBe(false);
      expect(detectISBN('tolkien').isISBN).toBe(false);
      expect(detectISBN('12345').isISBN).toBe(false);
    });

    it('returns false for invalid ISBN checksums', () => {
      expect(detectISBN('0306406153').isISBN).toBe(false);
      expect(detectISBN('9780261102218').isISBN).toBe(false);
    });
  });
});
