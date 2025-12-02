// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Utility functions for set operations.
 */

/**
 * Compute the union of two sets.
 * @param a The first set.
 * @param b The second set.
 * @returns The union set.
 */
export function union<T>(a: Set<T>, b: Set<T>) {
  return new Set([...a, ...b]);
}

/**
 * Compute the difference between two sets (a - b).
 * @param a The set to subtract from.
 * @param b The set to subtract.
 * @returns The difference set (elements in a but not in b).
 */
export function difference<T>(a: Set<T>, b: Set<T>) {
  return new Set([...a].filter((x) => !b.has(x)));
}

/**
 * Concatenate all arrays in the given object.
 * @param data Object containing arrays to concatenate.
 * @returns Concatenated array.
 */
export function concatenateArrays(data: { [key: string]: any[]; }): any[] {
  let result: any[] = [];
  for (const key in data) {
    if (key in data) {
      result = result.concat(data[key]);
    }
  }
  return result;
}

/**
 * Return true if the two sets differ for at least one element, irrespective of the order.
 * Every value is considered only once.
 */
export function areDifferent<T>(a: Iterable<T>, b: Iterable<T>): boolean {
  // Let's build two sets to check in O(1)
  const setA = new Set(a);
  const setB = new Set(b);

  // If the sizes are different, the sets are different
  if (setA.size !== setB.size) return true;

  // Let's check that any element of A is in B
  // since the sizes are equal
  for (const item of setA) {
    if (!setB.has(item)) return true; // Wefound a "different" element
  }

  // If we reach here, the two sets contain exactly the same values
  return false;
}

/**
 * Check if two sets are equal.
 * @param xs Left set.
 * @param ys Right set.
 * @returns True if the sets are equal, false otherwise.
 */
export function setsAreEqual<T>(xs: Set<T>, ys: Set<T>): boolean {
  return xs.size === ys.size &&
    [...xs].every((x) => ys.has(x));
}

/**
 * Check if a set includes another set.
 * @param xs The set to check within.
 * @param ys The set to check for.
 * @returns True if xs includes ys, false otherwise.
 */
export function setIncludes<T>(xs: Set<T>, ys: Set<T>): boolean {
  // If xs is empty, it does not include anything
  if (xs.size === 0) return false;

  // If ys is empty, it includes everything
  if (ys.size === 0) return true;

  // Check if every element of ys is in xs
  for (const y of ys) {
    if (!xs.has(y)) return false;
  }
  return true;
}

