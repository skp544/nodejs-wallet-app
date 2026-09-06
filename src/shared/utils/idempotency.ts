import { v4 as uuid } from "uuid";

/**
 *  idempotency utility
 * this file generates and validates idempotency key to ensure operations can be safely retried without side effects
 * Idempotency keys are used to
 * - prevent duplicate operations
 * - enable safe retries in distributed systems
 * - track transactions attemts
 *
 */

export class IdempotencyUtils {
  static generateKey(): string {
    return uuid();
  }

  static isValidKey(key: string): boolean {
    // a regular expression that enforces the exact v4 format
    const uuidRegex =
      /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;

    return uuidRegex.test(key);
  }
}
