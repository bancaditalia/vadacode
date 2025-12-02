// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Interface for analyzers of the program graph.
 */

import { Diagnostic } from 'vscode-languageserver';
import { ProgramGraph } from '../program-graph';

export interface ProgramGraphAnalyzer {
  analyze(programGraph: ProgramGraph): void;
  getDiagnostics(): Diagnostic[];
}
