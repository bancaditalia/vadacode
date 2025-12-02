// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Diagnostics for violation of signatures.
 */

import { Diagnostic } from "vscode-languageserver/node";

import { Service } from 'typedi';
import { AtomCall, DatalogpmSignatureHelp } from '../datalogpm/common';
import { ErrorTypes } from '../datalogpm/diagnostic-messages';
import { VadacodeTreeWalker } from '../datalogpm/vadacode-tree-walker';
import { makeDiagnostic } from './utils';

@Service()
export class SignatureDiagnosticProvider {
	provideDiagnostics(
		signatureHelps: DatalogpmSignatureHelp[],
		vadacodeTreeWalker: VadacodeTreeWalker,
	): Diagnostic[] {
		return this.signatureDiagnostics(signatureHelps, vadacodeTreeWalker.atomCalls);
	}

	signatureDiagnostics(signatureHelps: DatalogpmSignatureHelp[], atomCalls: AtomCall[]): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];

		for (const atomCall of atomCalls) {
			if (atomCall.atom) {
				const annotation = atomCall.atom;
				const annotationName = annotation.text;

				// Find the first builtin with mathing name
				const signature = signatureHelps.find((builtin) => builtin.name === annotationName);
				if (!signature) {
					continue;
				}

				if (atomCall.terms.length < signature.terms.length) {
					diagnostics.push(
						makeDiagnostic(
							annotation,
							ErrorTypes.ATOM_SIGNATURE_TERMS,
							{
								expected: signature.terms.length, 
								received: atomCall.terms.length
							}
						)
					);
				} else if (atomCall.terms.length > signature.terms.length) {
					for (const index of atomCall.terms.keys()) {
						if (index >= signature.terms.length) {
							const datalogpmToken = atomCall.terms[index];

							diagnostics.push(
								makeDiagnostic(
									datalogpmToken,
									ErrorTypes.ATOM_SIGNATURE_TERMS,
									{
										expected: signature.terms.length, 
										received: atomCall.terms.length
									}
								)
							);

						}
					}
				}
			}
		}

		return diagnostics;
	}

}
