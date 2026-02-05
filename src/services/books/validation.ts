/**
 * ISBN validation utilities
 * Validates ISBN-10 and ISBN-13 formats with checksum verification
 */

import type { ISBNDetectionResult } from './types';

/**
 * Validates ISBN-10 using modulus 11 checksum
 * ISBN-10 format: 9 digits + 1 check digit (0-9 or X)
 */
export function isValidISBN10(isbn: string): boolean {
  const cleaned = isbn.replace(/[-\s]/g, '');
  if (!/^[\dX]{10}$/i.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i], 10) * (10 - i);
  }
  const check = cleaned[9].toUpperCase();
  sum += check === 'X' ? 10 : parseInt(check, 10);

  return sum % 11 === 0;
}

/**
 * Validates ISBN-13 using modulus 10 checksum
 * ISBN-13 format: 13 digits, typically starting with 978 or 979
 */
export function isValidISBN13(isbn: string): boolean {
  const cleaned = isbn.replace(/[-\s]/g, '');
  if (!/^\d{13}$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;

  return parseInt(cleaned[12], 10) === check;
}

/**
 * Detects if a query string looks like a valid ISBN
 * Returns the type (ISBN10 or ISBN13) if valid
 */
export function detectISBN(query: string): ISBNDetectionResult {
  const cleaned = query.replace(/[-\s]/g, '');

  if (cleaned.length === 10 && isValidISBN10(cleaned)) {
    return { isISBN: true, type: 'ISBN10', cleaned };
  }
  if (cleaned.length === 13 && isValidISBN13(cleaned)) {
    return { isISBN: true, type: 'ISBN13', cleaned };
  }

  return { isISBN: false };
}
