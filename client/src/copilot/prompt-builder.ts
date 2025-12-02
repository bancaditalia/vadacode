// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Vadacoder assistant prompt builder interface.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface for prompt builders. Implements the builder pattern.
 * @see https://refactoring.guru/design-patterns/builder
 */
export interface PromptBuilder {
	reset();
}

export function readInstructions(instructionsFile: string): string {
	return fs.readFileSync(path.join(__dirname, '../../copilot/', instructionsFile), 'utf8');
}

