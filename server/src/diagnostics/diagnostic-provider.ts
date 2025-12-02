// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Diagnostic provider interface.
 */

import { VadacodeTreeWalker } from '../datalogpm/vadacode-tree-walker';
import { Diagnostic } from 'vscode-languageserver/node';

export interface DiagnosticProvider {
	provideDiagnostics(
		vadacodeTreeWalker: VadacodeTreeWalker,
	): Diagnostic[];
} 