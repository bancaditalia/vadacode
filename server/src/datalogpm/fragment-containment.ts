// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Fragment containment and classification logic.
 */

import { Diagnostic } from 'vscode-languageserver';
import { CustomDiagnosticData, Fragment } from '../isomorphic';

export const PARENTS: Record<Fragment, Fragment[]> = {
  "Show all violations": ["Linear", "Plain Datalog"],
  Linear: ["Afrati Linear", "Warded", "Shy", "Guarded"],
  'Afrati Linear': ['Warded'],
  'Plain Datalog': ['Warded', 'Shy'],
  Warded: ['Weakly Frontier Guarded'],
  Shy: ['Datalog ∃'],
  Guarded: ['Frontier Guarded', 'Weakly Guarded'],
  'Frontier Guarded': ['Weakly Frontier Guarded'],
  'Weakly Guarded': ['Weakly Frontier Guarded'],
  'Weakly Frontier Guarded': ['Datalog ∃'],
  'Datalog ∃': []
};


// Transitive closure of p -> all parents
function ancestorsOf(f: Fragment): Set<Fragment> {
  const res = new Set<Fragment>();
  const visit = (n: Fragment) => {
    for (const p of PARENTS[n]) {
      if (!res.has(p)) {
        res.add(p);
        visit(p);
      }
    }
  };
  visit(f);
  return res;
}

function childrenOf(f: Fragment): Set<Fragment> {
  let res = new Set<Fragment>();
  for (const [child, parents] of Object.entries(PARENTS)) {
    if (parents.includes(f)) {
      const childFragment = child as Fragment;
      res.add(childFragment);
      res = new Set([...res, ...childrenOf(childFragment)]);
    }
  }
  return res;
}

/**
 * Returns the list of fragments that are still valid after the given diagnostics.
 * @param diagnostics The list of diagnostics to analyze.
 * @returns A dictionary with all valid fragments (`stillValid`) and the most specific one (`mostSpecific`).
 */
export function classify(diagnostics: Diagnostic[]) {
  // Detect fragments that are directly violated by the diagnostics
  const directlyViolated = new Set<Fragment>();
  for (const d of diagnostics) {
    const data = d.data as CustomDiagnosticData;
    if (!data || !data.fragmentViolation) continue;
    if ((Object.keys(PARENTS) as Fragment[]).includes(data.fragmentViolation)) {
      directlyViolated.add(data.fragmentViolation);
    }
  }

  // Recursively find all fragments that are violated
  const allViolated = new Set<Fragment>(directlyViolated);
  for (const v of directlyViolated) {
    // Every violation propagates downwards
    for (const f of Object.keys(PARENTS) as Fragment[]) {
      if (ancestorsOf(f).has(v)) allViolated.add(f);
    }
  }

  // Detect fragments that are still valid
  const stillValid = (Object.keys(PARENTS) as Fragment[])
  .filter(
    (f) => f !== 'Show all violations' // Zero fragment does not exist
  )
  .filter(
    (f) => !allViolated.has(f),
  );

  // Choose the most specific fragments that are still valid
  const mostSpecific = stillValid.filter(
    (cand) => !stillValid.some((other) => ancestorsOf(other).has(cand)),
  );

  return { stillValid, mostSpecific };
}

/**
 * Detects the most specific fragment that is still valid after the given diagnostics.
 * If no specific fragment is found, it defaults to "Datalog ∃".
 * @param diagnostics The list of diagnostics to analyze.
 * @returns The most specific valid fragment or "Datalog ∃".
 */
export function detectFragment(diagnostics: Diagnostic[]) {
  const { stillValid, mostSpecific } = classify(diagnostics);
  return mostSpecific[0] || "Datalog ∃";
}

/**
 * For each fragment, returns the list of contained fragments.
 * The complete list is computed recursively based on the defined hierarchy.
 * @returns A dictionary mapping each fragment to its contained fragments.
 */
export function applicableFragments(includeItself = true): Record<Fragment, Fragment[]> {
  const result: Record<Fragment, Fragment[]> = {
    "Show all violations": [],
    "Plain Datalog": [],
    Linear: [],
    'Afrati Linear': [],
    Warded: [],
    Shy: [],
    Guarded: [],
    // Protected: [],
    'Weakly Guarded': [],
    'Frontier Guarded': [],
    'Weakly Frontier Guarded': [],
    'Datalog ∃': []
  };
  for (const f of Object.keys(PARENTS) as Fragment[]) {
    result[f] = Array.from(ancestorsOf(f));
    if (includeItself) {
      result[f].push(f);
    }
  }
  return result;
}