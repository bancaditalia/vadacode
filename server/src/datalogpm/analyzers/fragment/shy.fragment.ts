// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Shy fragment analyzer.
 */

import { Attributes } from 'graphology-types';
import { Diagnostic } from 'vscode-languageserver/node';
import { makeDiagnostic } from '../../../diagnostics/utils';
import { CustomDiagnosticData } from '../../../isomorphic';
import { IDatalogpmToken } from '../../common';
import { ErrorTypes } from '../../diagnostic-messages';
import { AtomLocation, getExistentialVariableNodes, ProgramGraph, ProgramGraphEdgeType, ProgramGraphNodeType } from '../../program-graph';
import { areDifferent, concatenateArrays, setsAreEqual } from '../../set-utils';
import { ProgramGraphAnalyzer } from '../program-graph-analyzer';

export class ShyFragmentAnalyzer implements ProgramGraphAnalyzer {

  private _shyS1ViolationVariableTokens: IDatalogpmToken[] = [];
  get shyS1ViolationVariableTokens() {
    if (!this._analyzed) throw new Error("ProgramGraph not analyzed yet");
    return this._shyS1ViolationVariableTokens;
  }

  private _shyS2ViolationVariableTokens: IDatalogpmToken[] = [];
  get shyS2ViolationVariableTokens() {
    if (!this._analyzed) throw new Error("ProgramGraph not analyzed yet");
    return this._shyS2ViolationVariableTokens;
  }

	programGraph!: ProgramGraph;

  protected _analyzed = false;


	analyze(programGraph: ProgramGraph): void {
    this.programGraph = programGraph;

    this._markShyInvaded();
    this._propagateShyInvasion();
    this._markShyAttackedProtected();
    this.markShyViolationVariableTokens();

		this._analyzed = true;
	}

  _markShyInvaded() {
    // Let's find existential variables
    const existentialVariableNodes = getExistentialVariableNodes(this.programGraph.graph);

    const invadedPositions: { [position: string]: Set<string> } = {};

    // Let's find the positions of existential variables
    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        variable: string,
        position: string,
        variableAttributes: Attributes,
        positionAttributes: Attributes,
        undirected: boolean
      ): void => {
        if (
          existentialVariableNodes.has(variable) && 
          attributes.type === ProgramGraphEdgeType.VARIABLE_AT_POSITION &&
          attributes.head
        ) {
          if (!invadedPositions[position]) {
            invadedPositions[position] = new Set<string>();
          }
          invadedPositions[position].add(variable);
        }
      }        
    );

    for (const invadedPosition of Object.keys(invadedPositions)) {      
      this.programGraph.graph.updateNode(invadedPosition, (attr: any) => {
        return {
          ...attr,
          invadedBy: [...invadedPositions[invadedPosition]]
        };
      });
    }

  }

  // Propagate taintedness from body to head and head to body
  private _propagateShyInvasion() {
    const headPositionsInvadedBy: { [position: string]: Set<string> } = {};

    // Seed invasion using existentials
    this.programGraph.graph.forEachNode(
      (position: string, attributes: Attributes) => {
        if (attributes.type === ProgramGraphNodeType.POSITION &&
        attributes.invadedBy &&
        attributes.invadedBy.length > 0) {
          if (!headPositionsInvadedBy[position]) {
            headPositionsInvadedBy[position] = new Set<string>();
          }
          for (const invadedBy of attributes.invadedBy) {
            headPositionsInvadedBy[position].add(invadedBy);
          }
        }
      }
    );

    for (;;)  {
      const newlyInvadedPositions = new Set<string>();

      // For each universally quantified variable in the body,
      // get the invaded and non invaded positions, per each variables.
      const bodyVariables: {
        [variable: string]: {
          invadingVariables: Set<string>,
          nonInvadingPositions: number
        }
      } = {};
      this.programGraph.graph.forEachEdge(
        (
          edge: string,
          attributes: Attributes,
          variable: string,
          position: string,
          variableAttributes: Attributes,
          positionAttributes: Attributes
        ): void => {
          if (
            attributes.type === ProgramGraphEdgeType.VARIABLE_AT_POSITION &&
            !attributes.head
          ) {
            if (!bodyVariables[variable]) {
              bodyVariables[variable] = {
                nonInvadingPositions: 0,
                invadingVariables: new Set<string>()
              };
            }

            // If the position is invaded, then we can propagate the invasion to variables
            // in invaded positions
            if (headPositionsInvadedBy[position] && headPositionsInvadedBy[position].size > 0) {
              const invaders = headPositionsInvadedBy[position];
              if (invaders.size > 0) {
                // Position is invaded, so let's keep track of body variables
                for (const invadingVariable of invaders) {
                  bodyVariables[variable].invadingVariables.add(invadingVariable);
                }
              }
            } else {
              // If the position is not invaded, the variable is not invading
              bodyVariables[variable].nonInvadingPositions++;
            }

          }
      });

      // Body variables now contain the invading variables for this round

      // We can now identify the positions in the head to propagate invasion
      this.programGraph.graph.forEachEdge(
        (
          edge: string,
          attributes: Attributes,
          variable: string,
          position: string,
          variableAttributes: Attributes,
          positionAttributes: Attributes
        ): void => {
          if (
            attributes.type === ProgramGraphEdgeType.VARIABLE_AT_POSITION &&
            attributes.head
          ) {
            // If the variable is in the body variables, then we can propagate the invasion
            if (bodyVariables[variable]) {
              if (bodyVariables[variable].invadingVariables.size > 0 && bodyVariables[variable].nonInvadingPositions === 0) {
                const invadingVariables = bodyVariables[variable].invadingVariables;
                if (!headPositionsInvadedBy[position]) {
                  headPositionsInvadedBy[position] = new Set<string>();
                }
                for (const invadingVariable of invadingVariables) {
                  if (!headPositionsInvadedBy[position].has(invadingVariable)) {
                    headPositionsInvadedBy[position].add(invadingVariable);
                    newlyInvadedPositions.add(position);
                  }
                }
                
              }
            }
          }
        }
      );

      if (newlyInvadedPositions.size === 0) {
        break;
      }
    }

    // We now have a dictionary of positions with propagating labeled nulls,
    // directly from the source (i.e. intermediate variables are not represented).

    // Now we can mark the positions as invaded by variable y
    for (const position of Object.keys(headPositionsInvadedBy)) {
      this.programGraph.graph.updateNode(position, (attr: any) => {
        return {
          ...attr,
          invadedBy: [...headPositionsInvadedBy[position]]
        };
      });
    }
  }

  _markShyAttackedProtected() {
    const variablesInConjunction: { [variable: string]: {
      invadedPositions: { [invadingVariable: string]: number },
      positions: number
    } } = {};

    // Now, for each variable in the body, check if all positions in which it appears
    // are invaded by the same variable
    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        source: string,
        target: string,
        sourceAttributes: Attributes,
        targetAttributes: Attributes,
        undirected: boolean
      ): void => {
        if (
          attributes.type === ProgramGraphEdgeType.VARIABLE_AT_POSITION &&
          !attributes.head
        ) {
          if (!variablesInConjunction[source]) {
            variablesInConjunction[source] = {
              invadedPositions: {},
              positions: 0
            };
          }
          
          if (targetAttributes.invadedBy && targetAttributes.invadedBy.length > 0) {
            // Position is invaded, so let's increment the invaded positions
            for (const invadingVariable of targetAttributes.invadedBy) {
              if (!variablesInConjunction[source].invadedPositions[invadingVariable]) {
                variablesInConjunction[source].invadedPositions[invadingVariable] = 0;
              }
              variablesInConjunction[source].invadedPositions[invadingVariable]++;
            }
          }

          variablesInConjunction[source].positions++;
        }
      }
    );

    // Now we can decide if the variable is attacked or not.
    const invadersOfAttackedVariables: { [variable: string]: Set<string> } = {};
    for (const variable of Object.keys(variablesInConjunction)) {
      const variableAttributes = variablesInConjunction[variable];

      if (!invadersOfAttackedVariables[variable]) {
        invadersOfAttackedVariables[variable] = new Set<string>();
      }

      for (const invadingVariable of Object.keys(variableAttributes.invadedPositions)) {
        const invadedPositions = variableAttributes.invadedPositions[invadingVariable];
        const attacked = invadedPositions === variableAttributes.positions;
        
        if (attacked) {
          invadersOfAttackedVariables[variable].add(invadingVariable);
        }
      }
    }

    // If x is not attacked by any variable, x is protected in the conjunction (rule).
    for (const variable of Object.keys(invadersOfAttackedVariables)) {
      this.programGraph.graph.updateNode(variable, (attr: any) => {
        return {
          ...attr,
          attackedBy: invadersOfAttackedVariables[variable],
          protected_: invadersOfAttackedVariables[variable].size === 0
        };
      });
    }
  }


	markShyViolationVariableTokens() {
    // Shy: for every rule, let's check S1 and S2
    // S1: if a variable x occurs in more than one body atom, then x is protected in body(σ);
    const shyVariableCounts: {
      [variable: string]: {
        attacked: number,
        protected_: number,
        rule: string
      }
    } = {};
    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        variable: string,
        _atomToken: string,
        variableAttributes: Attributes,
        _atomTokenAttributes: Attributes
      ): void => {
        if (
          attributes.type === ProgramGraphEdgeType.VARIABLE_AT_ATOM_TOKEN && 
          !attributes.head
        ) {
          if (!shyVariableCounts[variable]) {
            shyVariableCounts[variable] = {
              attacked: 0,
              protected_: 0,
              rule: variableAttributes.rule
            };
          }
          const invaders = variableAttributes.attackedBy || new Set;
          if (invaders && invaders.size > 0) {
            shyVariableCounts[variable].attacked++;
          } else if (variableAttributes.protected_) {
            shyVariableCounts[variable].protected_++;
          }
        }
      }
    );

    // Condition S1 says that if a variable x occurs in more than one body atom, then x 
    // must be protected in body(σ); 
    // Map the variable counts to s1 boolean condition
    const s1ConditionPerVariable: { [variable: string]: boolean } = {};
    for (const variable of Object.keys(shyVariableCounts)) {
      const v = shyVariableCounts[variable];
      // if a variable x occurs in more than one body atom ...
      if (v.attacked + v.protected_ >= 2) {
        // ... then x must be protected in body(σ);
        s1ConditionPerVariable[variable] = v.attacked === 0;
      }
    }
      
    // Filter s1ConditionPerVariable keys with false values
    const s1ViolationVariableTokens = Object.keys(s1ConditionPerVariable).filter((variable) => !s1ConditionPerVariable[variable]);
    this._shyS1ViolationVariableTokens = concatenateArrays(
      this.programGraph.getTokensOfVariables(s1ViolationVariableTokens)
    );


    // Condition S2: if two distinct ∀-variables are not protected in body(σ) but occur both 
    // in head(σ) and in two different body atoms, then they must not be attacked by the same variable
    
    // Group attacked variables per rule, bringing in the invading variables
    const attackedVariables: { [ruleId: string]: {
      [variable: string]: Set<string>
    } } = {};
    this.programGraph.graph.forEachNode(
      (variable: string, attributes: Attributes) => {
        if (attributes.type === ProgramGraphNodeType.VARIABLE &&
        attributes.attackedBy &&
        attributes.attackedBy.size > 0) {
          if (!attackedVariables[attributes.rule]) {
            attackedVariables[attributes.rule] = {};
          }
          if (!attackedVariables[attributes.rule][variable]) {
            attackedVariables[attributes.rule][variable] = new Set<string>();
          }
          // Add the invading variables to the set of attacked variables
          for (const invadingVariable of attributes.attackedBy) {
            attackedVariables[attributes.rule][variable].add(invadingVariable);
          }          
        }
      }
    );

    // Build an array of sets, with all the possible variable couples in attackedVariables
    // which are attacked by the same variable
    const attackedVariablesCouples: Set<string>[] = [];
    // For each rule...
    for (const ruleId in attackedVariables) {
      const variables = Object.keys(attackedVariables[ruleId]);
      for (let i = 0; i < variables.length; i++) {
        for (let j = i + 1; j < variables.length; j++) {
          const var1 = variables[i];
          const var2 = variables[j];
          const commonAttackers = new Set<string>();
          attackedVariables[ruleId][var1].forEach((attacker) => {
            if (attackedVariables[ruleId][var2].has(attacker)) {
              commonAttackers.add(attacker);
            }
          });
          if (commonAttackers.size > 0) {
            const set = new Set<string>([var1, var2]);
            if (!attackedVariablesCouples.some((couple) => setsAreEqual(couple, set))) {
              attackedVariablesCouples.push(set);
            }
          }
        }
      }
    }
    
    // Then, for each couple, we need to ensure condition S2 is satisfied:
    // the two variables appear n distinct body atoms and in the head of the rule
    type Variable = {
      id: string,
      appearInHead: Set<string>,
      appearInBody: Set<string>,
    }
    type Couple = {
        attackedVariable0: Variable,
        attackedVariable1: Variable,
    };
    const couples: Couple[] = [];
    for (const attackedVariablesCouple of attackedVariablesCouples) {
      const attackedVariablesCoupleArray = Array.from(attackedVariablesCouple);
      const couple: Couple = {
        attackedVariable0: {
          id: attackedVariablesCoupleArray[0],
          appearInHead: new Set<string>(),
          appearInBody: new Set<string>(),
        },
        attackedVariable1: {
          id: attackedVariablesCoupleArray[1],
          appearInHead: new Set<string>(),
          appearInBody: new Set<string>(),
        },
      };
      this.programGraph.graph.forEachEdge(
        (
          edge: string,
          attributes: Attributes,
          variable: string,
          atomToken: string,
          variableAttributes: Attributes,
          atomTokenAttributes: Attributes,
          undirected: boolean
        ): void => {
          if (
            attributes.type === ProgramGraphEdgeType.VARIABLE_AT_ATOM_TOKEN &&
            attackedVariablesCouple.has(variable)
          ) {
            // Check if the variable is in head or body
            if (atomTokenAttributes.location === AtomLocation.Head) {
              // Variable appears in head
              if (variable === couple.attackedVariable0.id) {
                couple.attackedVariable0.appearInHead.add(atomToken);
              } else if (variable === couple.attackedVariable1.id) {
                couple.attackedVariable1.appearInHead.add(atomToken);
              }
            } else if (atomTokenAttributes.location === AtomLocation.Body) {
              // Variable appears in body
              if (variable === couple.attackedVariable0.id) {
                couple.attackedVariable0.appearInBody.add(atomToken);
              } else if (variable === couple.attackedVariable1.id) {
                couple.attackedVariable1.appearInBody.add(atomToken);
              }
            }

          }
        }
      );

      couples.push(couple);
    }

    // Filter couples that have both variables appearing in head and in distinct body atoms
    const validCouples = couples.filter((couple) => {
      // Both variables must appear in head
      const bothInHead = couple.attackedVariable0.appearInHead.size > 0 && couple.attackedVariable1.appearInHead.size > 0;
      // Both variables must appear in body
      const bothInBody = couple.attackedVariable0.appearInBody.size > 0 && couple.attackedVariable1.appearInBody.size > 0;
      // Both variables must appear in distinct body atoms
      const distinctBodyAtoms = areDifferent(
        couple.attackedVariable0.appearInBody,
        couple.attackedVariable1.appearInBody
      );
      return bothInHead && bothInBody && distinctBodyAtoms;
    });

    // Flatten the valid couples to get the variable tokens
    const datalogpmTokens: IDatalogpmToken[] = [];
    for (const validCouple of validCouples) {
      const variables = concatenateArrays(this.programGraph.getTokensOfVariables([validCouple.attackedVariable0.id, validCouple.attackedVariable1.id]));
      datalogpmTokens.push(...variables);
    }
    this._shyS2ViolationVariableTokens = datalogpmTokens;
	}

	getDiagnostics(): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
    diagnostics.push(...this.shyS1ViolationVariableTokensDiagnostic());
    diagnostics.push(...this.shyS2ViolationVariableTokensDiagnostic());
		return diagnostics;
	}


	shyS1ViolationVariableTokensDiagnostic(): Diagnostic[] {
		return this.shyS1ViolationVariableTokens.map(
		(datalogpmToken: IDatalogpmToken) => {
			const d = makeDiagnostic(
				datalogpmToken,
				ErrorTypes.ERR_ATOM_NOT_VIOLATING_SHY_S1_CONDITION,
				{variable: datalogpmToken.text}
			);
			d.data = {
				fragmentViolation: 'Shy'
			} as CustomDiagnosticData;
			return d;
		});
	}

	shyS2ViolationVariableTokensDiagnostic(): Diagnostic[] {
		return this.shyS2ViolationVariableTokens.map(
		(datalogpmToken: IDatalogpmToken) => {
			const d = makeDiagnostic(
				datalogpmToken,
				ErrorTypes.ERR_ATOM_NOT_VIOLATING_SHY_S2_CONDITION,
				{variable: datalogpmToken.text}
			);
			d.data = {
				fragmentViolation: 'Shy'
			} as CustomDiagnosticData;
			return d;
		});
	}

}
