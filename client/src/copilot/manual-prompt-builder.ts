// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Manual prompt builder for Copilot.
 */

import { PromptBuilder, readInstructions } from './prompt-builder';


export class ManualPromptBuilder implements PromptBuilder {
	prompt: string;

	reset() {
		this.prompt = "";
	}

	buildPersona() {
		this.prompt += `You are a skilled developer assistant. Your job is to help the user in any question about logic programming and Datalog+/- language.`;
	}

	buildGoal() {
		this.prompt += `You are a helpful tutor. 
Your job is to teach the user how to use Datalog+/- language. 
Start by explaining things clearly and in simple case, then get more complex and mention directly the manual.
If the user asks an unrelated question, politely decline to respond.
`;
	}

	buildInstructions() {
		this.prompt += readInstructions('vadalog.manual.md');
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
