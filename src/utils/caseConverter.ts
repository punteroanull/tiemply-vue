/**
 * Utility functions to convert between snake_case and camelCase
 * Used to transform API responses from Laravel (snake_case) to TypeScript conventions (camelCase)
 */

/**
 * Converts a snake_case string to camelCase
 * @param str - The snake_case string to convert
 * @returns The camelCase version of the string
 */
export function snakeToCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Converts a camelCase string to snake_case
 * @param str - The camelCase string to convert
 * @returns The snake_case version of the string
 */
export function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Recursively converts all keys in an object from snake_case to camelCase
 * Handles nested objects and arrays
 * @param obj - The object with snake_case keys
 * @returns A new object with camelCase keys
 */
export function convertKeysToCamelCase<T = any>(obj: any, depth = 0): T {
  // Handle null and undefined
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  // Handle arrays - recursively convert each item
  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamelCase(item, depth + 1)) as T;
  }

  // Handle Date objects - return as-is
  if (obj instanceof Date) {
    return obj as T;
  }

  // Handle plain objects - convert keys and recurse on values
  if (typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = snakeToCamelCase(key);
      acc[camelKey] = convertKeysToCamelCase(obj[key], depth + 1);
      return acc;
    }, {} as any) as T;
  }

  // Return primitives as-is
  return obj as T;
}

/**
 * Recursively converts all keys in an object from camelCase to snake_case
 * Useful for sending data to Laravel API
 * @param obj - The object with camelCase keys
 * @returns A new object with snake_case keys
 */
export function convertKeysToSnakeCase<T = any>(obj: any): T {
  // Handle null and undefined
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  // Handle arrays - recursively convert each item
  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToSnakeCase(item)) as T;
  }

  // Handle Date objects - return as-is
  if (obj instanceof Date) {
    return obj as T;
  }

  // Handle plain objects - convert keys and recurse on values
  if (typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = camelToSnakeCase(key);
      acc[snakeKey] = convertKeysToSnakeCase(obj[key]);
      return acc;
    }, {} as any) as T;
  }

  // Return primitives as-is
  return obj as T;
}
