// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Copilot chat participant registration.
 */

import * as vscode from 'vscode';
import { ManualPromptBuilder } from './manual-prompt-builder';
import { WriterPromptBuilder } from './writer-prompt-builder';

/**
 * Registers the Copilot chat participant.
 * @param context The extension context.
 */
export function registerCopilotChatParticipant(context: vscode.ExtensionContext) {
	// Define a chat handler
	const handler: vscode.ChatRequestHandler = async (request: vscode.ChatRequest, context: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken) => {

		// Initialize the prompt
		let prompt: string;
		if (request.command === 'write') {
			const promptBuilder = new WriterPromptBuilder();
			promptBuilder.build();
			prompt = promptBuilder.getPrompt();	
		} else if (request.command === 'manual') {
			const promptBuilder = new ManualPromptBuilder();
			promptBuilder.build();
			prompt = promptBuilder.getPrompt();	
		} else {
			// Fallback to manual prompt builder
			const promptBuilder = new ManualPromptBuilder();
			promptBuilder.build();
			prompt = promptBuilder.getPrompt();	
		}

		// The following code has been derived from
		// https://code.visualstudio.com/api/extension-guides/chat-tutorial

		// Initialize the messages array with the prompt
		const messages = [
			vscode.LanguageModelChatMessage.User(prompt),
		];

		// Get all the previous participant messages
		const previousMessages = context.history.filter(
			(h) => h instanceof vscode.ChatResponseTurn
		);

		// add the previous messages to the messages array
		previousMessages.forEach((m: vscode.ChatResponseTurn) => {
			let fullMessage = '';
			m.response.forEach((r) => {
				const mdPart = r as vscode.ChatResponseMarkdownPart;
				fullMessage += mdPart.value.value;
			});
			messages.push(vscode.LanguageModelChatMessage.Assistant(fullMessage));
		});

		// Add in the user's message
		messages.push(vscode.LanguageModelChatMessage.User(request.prompt));

		// Send the request
		const chatResponse = await request.model.sendRequest(messages, {}, token);

		// stream the response
		for await (const fragment of chatResponse.text) {
			stream.markdown(fragment);
		}

	};

	// Create participant
	const tutor = vscode.chat.createChatParticipant("vadacode.vadacoder", handler);

	// Set participant icon
	tutor.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icons/vadacoder.jpg');
}
