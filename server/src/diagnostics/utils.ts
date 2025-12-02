// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Utility functions for diagnostics.
 */

import { Diagnostic, DiagnosticRelatedInformation, Location, Range } from 'vscode-languageserver/node';
import { IDatalogpmToken, VADACODE_MANUAL_DIAGNOSTIC_URL } from '../datalogpm/common';
import { DIAGNOSTIC_MESSAGES, ErrorTypes } from '../datalogpm/diagnostic-messages';

/**
 * Replace template strings in the form {key} in message with the corresponding value in parameters.
 * @param message Message string with template keys.
 * @param parameters Object containing values for template keys.
 * @returns The message with template keys replaced by their corresponding values.
 */
function templatedStringReplace(message: string, parameters: any) {
  // For each key in message in the form {key}, replace 
  // its value with the value of parameters[key]
  // e.g. {key} -> parameters[key]

  const keys = Object.keys(parameters);
  for (const key of keys) {
    message = message.replace(`{${key}}`, parameters[key]);
  }
  return message;
}

/**
 * Create a VsCode Diagnostic from a Datalog+/- token or Range.
 * @param tokenOrRange Token or Range to create the diagnostic for.
 * @param errorType Type of error.
 * @param parameters Parameters for the diagnostic message, used for template string replacement.
 * @returns 
 */
export function makeDiagnostic(
	tokenOrRange: IDatalogpmToken | Range,
	errorType: ErrorTypes,
	parameters: any = {}
): Diagnostic {
	const diagnosticMessage = DIAGNOSTIC_MESSAGES[errorType];
	const href = VADACODE_MANUAL_DIAGNOSTIC_URL.replace("{diagnosticCode}", diagnosticMessage.code);

	let range: Range;
	let relatedInformation: DiagnosticRelatedInformation[] = [];
	if ("line" in tokenOrRange) {
		const token = tokenOrRange;
		range = {
			start: { line: token.line, character: token.column },
			end: { line: token.line, character: token.column + token.length },
		};
		relatedInformation = token.uri && diagnosticMessage.description ? [
				DiagnosticRelatedInformation.create(
					Location.create(token.uri, range),
					diagnosticMessage.description
				)
			] : [];

	} else {
		range = tokenOrRange;
	}


	const diagnostic = {
		range,
		severity: diagnosticMessage.severity,
		code: diagnosticMessage.code,
		message: templatedStringReplace(diagnosticMessage.message, parameters),
		tags: [],
		codeDescription: { href },
		relatedInformation,
	} as Diagnostic;

	return diagnostic;
}


