// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file "Writer" prompt builder for Copilot.
 */

import { PromptBuilder, readInstructions } from './prompt-builder';

export class WriterPromptBuilder implements PromptBuilder {
	prompt: string;

	reset() {
		this.prompt = "";
	}

	buildPersona() {
		this.prompt += `You are a skilled developer assistant. Your job is to help the user debug and fix issues in their code efficiently.`;
	}

	buildGoal() {
		this.prompt += `Analyze the user's code, identify errors, and suggest precise fixes with clear explanations.  
Prioritize understanding the root cause of bugs rather than just providing a solution.  
Guide the user with step-by-step debugging strategies when necessary.  
If the issue is complex, break it down into smaller, manageable parts.  
Suggest best practices and optimizations when relevant, but stay focused on solving the bug first.`;
	}

	buildInstructions() {
		this.prompt += readInstructions('vadalog.instructions.md');
	}

	buildDocumentation() {
		// Do nothing
	}

	build() {
		this.buildPersona();
		this.buildGoal();
		this.buildInstructions();
		this.buildDocumentation();
	}

	getPrompt(): string {
		const prompt = this.prompt;
		this.reset();
		return prompt;
	}
	
}
