// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Tags ground facts in a Datalog+/- program.
 */
import { Attributes } from 'graphology-types';
import { IDatalogpmToken, DatalogpmTokenModifier } from '../common';
import { AtomLocation, ProgramGraph, ProgramGraphNodeType } from '../program-graph';
import { ProgramGraphAnalyzer } from './program-graph-analyzer';
import { Diagnostic } from 'vscode-languageserver';

export class GroundSemanticTagger implements ProgramGraphAnalyzer {

	analyze(programGraph: ProgramGraph): void {
		this._tag(programGraph);
	}
	getDiagnostics(): Diagnostic[] {
		return []; 
	}

	_tag(programGraph: ProgramGraph) {
		// Add semantic modifier for facts
		const factAtoms: { [atomName: string]: {
			tokens: IDatalogpmToken[],
			isEDB: boolean,
			isIDB: boolean
		} } = {};
		programGraph.graph.forEachEdge(
			(
				edge: string,
				attributes: Attributes,
				token: string,
				atom: string,
				tokenAttributes: Attributes,
				atomAttributes: Attributes,
				undirected: boolean
			): void => {
				if (atomAttributes.type === ProgramGraphNodeType.ATOM) {
					if (!factAtoms[atom]) {
						factAtoms[atom] = {
							tokens: [],
							isEDB: false,
							isIDB: false
						};
					}

					if (tokenAttributes.location === AtomLocation.Fact || tokenAttributes.location === AtomLocation.Input) {
						factAtoms[atom].isEDB = true;
					}
					if (tokenAttributes.location === AtomLocation.Head) {
						factAtoms[atom].isIDB = true;
					}
					factAtoms[atom].tokens.push(tokenAttributes.token);
				}
			});

		// Add ground modifier to all tokens of the atom
		for (const atomName in factAtoms) {
			const factAtom = factAtoms[atomName];
			if (factAtom.isEDB) {
				// Add ground modifier to all tokens of the atom
				for (const token of factAtom.tokens) {
					token.modifiers.push(DatalogpmTokenModifier.GROUND);
				}
			}
		}

		// Mark atom nodes with idb/edb modifiers
		for (const atomName in factAtoms) {
			const factAtom = factAtoms[atomName];
			programGraph.graph.updateNode(atomName, (attr: any) => {
				return {
					...attr,
					isEDB: factAtom.isEDB,
					isIDB: factAtom.isIDB
				};
			});
		}
	}
}
