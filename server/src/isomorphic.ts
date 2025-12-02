// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Isomoprhic (i.e. identical bewteen the client and the server) definitions.
 *
 * @remark This file contains definitions that are shared between the
 *         language server and the client. It should not contain any
 *         server- or client-specific code. It must be kept isomorphic
 *         manually.
 */

export const LANGUAGE_ID = "datalogpm";

/**
 * Supported Datalog fragments.
 * Note: "Show all violations" must be the first element, as it is detected
 * with this index in the quick pick.
 */
export const FRAGMENTS = ['Show all violations', 'Plain Datalog', 'Linear', 'Afrati Linear', 'Warded', 'Shy', 'Guarded', 'Weakly Guarded', 'Weakly Frontier Guarded', 'Frontier Guarded', 'Datalog ∃'] as const;
export const PRETTY_FRAGMENTS = ['$(activate-breakpoints) Show all violations', '$(ruby) Plain Datalog', '$(ruby) Linear', '$(ruby) Afrati Linear', '$(ruby) Warded', '$(ruby) Shy', '$(ruby) Guarded', '$(ruby) Weakly Guarded', '$(ruby) Weakly Frontier Guarded', '$(ruby) Frontier Guarded', '$(ruby) Datalog ∃'] as const;
export type Fragment = typeof FRAGMENTS[number];

export const DEFAULT_FRAGMENT: Fragment = 'Warded';

export interface CustomDiagnosticData {
  fragmentViolation?: Fragment;
}
