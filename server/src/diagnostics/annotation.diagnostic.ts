// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Diagnostics for violations on annotations.
 */

import { Diagnostic } from "vscode-languageserver/node";

import { Service } from 'typedi';
import { BUILTINS } from '../builtins';
import { AnnotationCall } from '../datalogpm/common';
import { ErrorTypes } from '../datalogpm/diagnostic-messages';
import { VadacodeTreeWalker } from '../datalogpm/vadacode-tree-walker';
import { DiagnosticProvider } from './diagnostic-provider';
import { makeDiagnostic } from './utils';

@Service()
export class AnnotationsDiagnosticProvider implements DiagnosticProvider {
	provideDiagnostics(
		vadacodeTreeWalker: VadacodeTreeWalker,
	): Diagnostic[] {
		return this.annotationDiagnostics(vadacodeTreeWalker.annotationCalls);
	}

	annotationDiagnostics(annotationCalls: AnnotationCall[]): Diagnostic[] {

		const diagnostics: Diagnostic[] = [];

		for (const annotationCall of annotationCalls) {
			if (annotationCall.atom) {
				const annotation = annotationCall.atom;
				const annotationName = `@${annotation.text}`;

				// Find the first builtin with mathing name
				const builtin = BUILTINS.find((builtin) => builtin.name === annotationName);
				if (!builtin) {
					continue;
				}

				const requiredTerms = builtin.terms.filter(term => !term.label.endsWith('?'));
				if (annotationCall.terms.length < requiredTerms.length) {
					diagnostics.push(
						makeDiagnostic(
							annotation,
							ErrorTypes.ANNOTATION_PARAMETERS,
							{
								expected: requiredTerms.length, 
								received: annotationCall.terms.length
							}
						)
					);
				} else if (annotationCall.terms.length > builtin.terms.length) {
					for (const index of annotationCall.terms.keys()) {
						if (index >= builtin.terms.length) {
							const datalogpmToken = annotationCall.terms[index];

							diagnostics.push(
								makeDiagnostic(
									datalogpmToken,
									ErrorTypes.ANNOTATION_PARAMETERS,
									{
										expected: builtin.terms.length, 
										received: annotationCall.terms.length
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
