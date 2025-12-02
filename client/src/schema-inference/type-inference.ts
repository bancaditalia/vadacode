// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Type inference utilities.
 */

export type InferredType = "string" | "int" | "double" | "boolean" | "date";

const isBoolean = (s: string): boolean => /^(?:true|false)$/i.test(s.trim());
const isInt     = (s: string): boolean => /^[-+]?\d+$/.test(s.trim());
const isDouble  = (s: string): boolean =>
  /^[-+]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?$/.test(s.trim());
const isDate    = (s: string): boolean => !Number.isNaN(Date.parse(s));

/**
 * Infer the type of an array of strings, using the following precedence:
 * "boolean" → "int" → "double" → "date" → "string"
 * @param values 
 * @returns 
 */
export function inferArrayType(
  values: string[],
  options?: { skipEmpty?: boolean }
): InferredType {
  const skipEmpty = options?.skipEmpty ?? false;
  if (values.length === 0) return "string";

  let maybeBoolean = true;
  let maybeInt     = true;
  let maybeDouble  = true;
  let maybeDate    = true;

  let sawNonEmpty  = false;          // tracks if any value was evaluated

  for (const raw of values) {
    if (skipEmpty && raw.trim() === "") continue; // ignore empties
    sawNonEmpty = true;

    if (maybeBoolean && !isBoolean(raw)) maybeBoolean = false;
    if (maybeInt     && !isInt(raw))     maybeInt     = false;
    if (maybeDouble  && !isDouble(raw))  maybeDouble  = false;
    if (maybeDate    && !isDate(raw))    maybeDate    = false;

    if (!maybeBoolean && !maybeInt && !maybeDouble && !maybeDate) break;
  }

  if (!sawNonEmpty) return "string"; // e.g. ["", "", "  "]

  // Choose the narrowest remaining type
  if (maybeBoolean) return "boolean";
  if (maybeInt)     return "int";
  if (maybeDouble)  return "double";
  if (maybeDate)    return "date";
  return "string";
}
