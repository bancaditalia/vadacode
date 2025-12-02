// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Warded fragment analyzer.
 */

import { Attributes } from 'graphology-types';
import { Diagnostic } from 'vscode-languageserver/node';
import { makeDiagnostic } from '../../../diagnostics/utils';
import { CustomDiagnosticData } from '../../../isomorphic';
import { IDatalogpmToken } from '../../common';
import { ErrorTypes } from '../../diagnostic-messages';
import { getExistentialVariableNodes, ProgramGraph, ProgramGraphEdgeType, ProgramGraphNodeType, RulePart } from '../../program-graph';
import { concatenateArrays } from '../../set-utils';
import { ProgramGraphAnalyzer } from '../program-graph-analyzer';

type HamfulnessOfVariables = {
  [key: string]: { harmful: boolean };
};


export class WardedFragmentAnalyzer implements ProgramGraphAnalyzer {
  
  private _unwardedVariableTokens: IDatalogpmToken[] = [];
  get unwardedVariableTokens() {
    if (!this._analyzed) throw new Error("ProgramGraph not analyzed yet");
    return this._unwardedVariableTokens;
  }


  private _existentialVariableTokens: IDatalogpmToken[] = [];
  get existentialVariableTokens() {
    if (!this._analyzed) throw new Error("ProgramGraph not analyzed yet");
    return this._existentialVariableTokens;
  }

  private _markedNullVariableTokens: IDatalogpmToken[] = [];
  get markedNullVariableTokens() {
    if (!this._analyzed) throw new Error("ProgramGraph not analyzed yet");
    return this._markedNullVariableTokens;
  }

  private _usedInTaintedJoinVariableTokens: IDatalogpmToken[] = [];
  get usedInTaintedJoinVariableTokens() {
    if (!this._analyzed) throw new Error("ProgramGraph not analyzed yet");
    return this._usedInTaintedJoinVariableTokens;
  }
  private _usedInTaintedFilterVariableTokens: IDatalogpmToken[] = [];
  get usedInTaintedFilterVariableTokens() {
    if (!this._analyzed) throw new Error("ProgramGraph not analyzed yet");
    return this._usedInTaintedFilterVariableTokens;
  }
  private _literalTokensUsedInTaintedPositions: IDatalogpmToken[] = [];
  get literalTokensUsedInTaintedPositions() {
    if (!this._analyzed) throw new Error("ProgramGraph not analyzed yet");
    return this._literalTokensUsedInTaintedPositions;
  }

  private _constantsInTaintedPositions: IDatalogpmToken[] = [];
  get constantsInTaintedPositions() {
    if (!this._analyzed) throw new Error("ProgramGraph not analyzed yet");
    return this._constantsInTaintedPositions;
  }


  private _harmfulVariableTokens: IDatalogpmToken[] = [];
  get harmfulVariableTokens() {
    if (!this._analyzed) throw new Error("ProgramGraph not analyzed yet");
    return this._harmfulVariableTokens;
  }
  private _dangerousVariableTokens: IDatalogpmToken[] = [];
  get dangerousVariableTokens() {
    if (!this._analyzed) throw new Error("ProgramGraph not analyzed yet");
    return this._dangerousVariableTokens;
  }

	
  protected _analyzed = false;

  programGraph!: ProgramGraph;

	analyze(programGraph: ProgramGraph): void {
    this.programGraph = programGraph;

		this.markUnwardedVariableTokens();
    
		this._analyzed = true;
	}

  // Update unwarded variable ids
  // "Una regola con una o più variabili dangerous non è un problema
  // se nel corpo tutte queste variabili dangerous siano presenti in
  // un unico atomo, chiamato ward".
  private _getWardBreakingDangerousVariables() {
    // Dictionary with the set of dangerous variable for each atom tokens, for each rule
    const dangerousVariableAtoms: Record<string, Record<string, Set<string>>> = {};

    const unwardedVariableIds = new Set<string>();

    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        dangerousVariableNodeId: string,
        atomToken: string,
        dangerousVariableAttributes: Attributes,
        atomTokenAttributes: Attributes,
        undirected: boolean
      ): void => {
        if (
          attributes.type === ProgramGraphEdgeType.VARIABLE_AT_ATOM_TOKEN && 
          dangerousVariableAttributes.dangerous && 
          !attributes.head
        ) {
          const rule = atomTokenAttributes.rule;

          if (!dangerousVariableAtoms[rule]) {
            dangerousVariableAtoms[rule] = {};
          }

          if (!dangerousVariableAtoms[rule][atomToken]) {
            dangerousVariableAtoms[rule][atomToken] = new Set<string>();
          }

          // Add the atom token to the set of atom tokens for this dangerous variable
          dangerousVariableAtoms[rule][atomToken].add(dangerousVariableNodeId);
        }
      }
    );

    for (const rule of Object.keys(dangerousVariableAtoms)) {
      const atomTokensInRule = dangerousVariableAtoms[rule];
      if (Object.keys(atomTokensInRule).length > 1) {
        // There are multiple atoms with dangerous variables in the rule
        // so each of these variables is unwarded
        for (const atomToken of Object.keys(atomTokensInRule)) {
          const dangerousVariableNodeIds = atomTokensInRule[atomToken];
          for (const dangerousVariableNodeId of dangerousVariableNodeIds) {
            unwardedVariableIds.add(dangerousVariableNodeId);
          }
        }
      }
    }

    return unwardedVariableIds;
  }

  // "(ii) there is a rule in Σ such that a universally quantified variable (∀-variable)
  // is only in affected body positions and in p[i] in the head."
  private _markUniversallyQuantifiedVariablesInAffectedBodyPositions() {
    // Find all non existential variables (we are looking for propagating
    // affected positions from body to head)
    const universallyQuantifiedVariableNodes = this.programGraph.graph.filterNodes(
      (_nodeId: string, attributes: Attributes): boolean =>
        attributes.type === ProgramGraphNodeType.VARIABLE &&
        !attributes.existential
    );

    // For each universally quantified variable that is only in affected body positions,
    // propagate the affected to the position in the head.
    // Loop indefinitely until fixpoint (no new affected
    // positions are found).
    for (;;) {      
      let newlyAffectedHeadPositions = new Set<string>();
      for (const universallyQuantifiedVariableNodeId of universallyQuantifiedVariableNodes) {
        const isOnlyInAffectedBodyPositions = this._isVariableOnlyInAffectedBodyPositions(universallyQuantifiedVariableNodeId);

        if (isOnlyInAffectedBodyPositions) {
          const propagationPositions = this._getNonAffectedPositionsOfVariableInHead(universallyQuantifiedVariableNodeId);
          newlyAffectedHeadPositions = new Set<string>([...newlyAffectedHeadPositions, ...propagationPositions]);
        }
      }

      for (const positionId of newlyAffectedHeadPositions) {
        this.programGraph.setNodeAttributes(positionId, {affected: true});
      }
  
      // On fixpoint, stop propagating.
      if (newlyAffectedHeadPositions.size == 0) {
        break;
      }
    }

  }

  private _getNonAffectedPositionsOfVariableInHead(universallyQuantifiedVariableNodeId: string): Set<string> {
    const positionsInHead = new Set<string>();
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
        if (source == universallyQuantifiedVariableNodeId &&
          attributes.type == ProgramGraphEdgeType.VARIABLE_AT_POSITION &&
          attributes.head &&
          !targetAttributes.affected) {
          positionsInHead.add(target);
        }
      }
    );
    return positionsInHead;
  }

  // 2. prendo le EGDs e upgrade da affected a tainted se la variable usata 
  // nelle EGDs occupava nel corpo una posizione affected
  private _markTaintedPositions() {

    // Now find the EGD variables used in those positions

    // Find all variable nodes
    const egdVariableNodes = this.programGraph.graph.filterNodes(
      (_nodeId: string, attributes: Attributes): boolean => {
        // Let's start from variables
        const isVariable = attributes.type === ProgramGraphNodeType.VARIABLE;

        if (!isVariable) return false;

        // Check edges from variable to an EGD
        const egdEdges = this.programGraph.graph.filterEdges(
          (
            edge: string,
            attributes: Attributes,
            source: string,
            target: string,
            sourceAttributes: Attributes,
            targetAttributes: Attributes,
            undirected: boolean
          ): boolean =>
            source == _nodeId &&
            attributes.type == ProgramGraphEdgeType.VARIABLE_AT_EGD
        );

        return egdEdges.length > 0;
      }
    );

    // Now check if the EGD variables are used in affected positions
    const positionNodes = this.programGraph.graph.filterNodes(
      (_nodeId: string, attributes: Attributes): boolean => {
        // Let's start from positions
        const isPosition = attributes.type === ProgramGraphNodeType.POSITION;

        if (!isPosition) return false;

        // Check edges from variable to position in head
        const edges = this.programGraph.graph.filterEdges(
          (
            edge: string,
            attributes: Attributes,
            variableId: string,
            positionId: string,
            variableAttributes: Attributes,
            positionAttributes: Attributes,
            undirected: boolean
          ): boolean =>
            egdVariableNodes.includes(variableId) &&
            positionId == _nodeId &&
            attributes.type == ProgramGraphEdgeType.VARIABLE_AT_POSITION &&
            // positionAttributes.affected
            variableAttributes.harmful
        );

        return edges.length > 0;
      }
    );    

    for (const positionNode of positionNodes) {
      this.programGraph.graph.updateNode(positionNode, (attr: any) => {
        return {
          ...attr,
          tainted: true,
        };
      });
    }
  }

  _isVariableOnlyInAffectedBodyPositions(universallyQuantifiedVariableNodeId: string) {
    const edgesToPositionsInBody = this.programGraph.graph.filterEdges(
      (
        edge: string,
        attributes: Attributes,
        source: string,
        target: string,
        sourceAttributes: Attributes,
        targetAttributes: Attributes,
        undirected: boolean
      ): boolean => source == universallyQuantifiedVariableNodeId &&
      attributes.type == ProgramGraphEdgeType.VARIABLE_AT_POSITION &&
        !attributes.head
    );
    const edgesToAffectedPositionsInBody = this.programGraph.graph.filterEdges(
      (
        edge: string,
        attributes: Attributes,
        source: string,
        target: string,
        sourceAttributes: Attributes,
        targetAttributes: Attributes,
        undirected: boolean
      ): boolean => source == universallyQuantifiedVariableNodeId &&
      attributes.type == ProgramGraphEdgeType.VARIABLE_AT_POSITION &&
      !attributes.head &&
        targetAttributes.affected
    );

    // a universally quantified variable (∀-variable) is only in affected body positions
    const isOnlyInAffectedBodyPositions = edgesToPositionsInBody.length > 0 &&
      edgesToPositionsInBody.length == edgesToAffectedPositionsInBody.length;
      
    return isOnlyInAffectedBodyPositions;
  }  

  // Propagate taintedness from body to head and head to body
  private _propagateTaintedness() {
    // Loop indefinitely until fixpoint (no new tainted positions are found).
    for (;;) {
      // Get the positions of those variables (and filter non-tainted ones)
      const positionsToTaint = this._getPositionToTaintFromVariables(/*variableNodesToTaintedPositions*/);
      
      // Update variables
      for (const positionToTaint of positionsToTaint) {
        this.programGraph.setNodeAttributes(positionToTaint, {tainted: true});
      }
  
      // On fixpoint, stop propagating.
      if (positionsToTaint.length == 0) {
        break;
      }
    }
  }

  /**
   * Propagate tainted flag using forward and backward propagation.
   * 
   * @param variableNodesToTaintedPositions Variables that are in tainted positions
   * @returns Positions to receive the tainted flag
   * 
   * @see https://www.vadalog.org/vadalog-handbook/latest/expressions-egds.html#_harmless_egds
   */
  _getPositionToTaintFromVariables(/*variableNodesToTaintedPositions: Set<string>*/) {
    // Get variables in tainted positions and where they appear (head/body)
    const variablesInTaintedPositions: { [variableId: string]: {
      headPositionIds: Set<string>;
      bodyPositionIds: Set<string>;
    } } = {};

    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        variableId: string,
        positionId: string,
        variableAttributes: Attributes,
        positionAttributes: Attributes,
        undirected: boolean
      ): void => {
        if (
          // variableNodesToTaintedPositions.has(variableId) &&
          attributes.type === ProgramGraphEdgeType.VARIABLE_AT_POSITION &&
          variableAttributes.type === ProgramGraphNodeType.VARIABLE &&
          positionAttributes.type === ProgramGraphNodeType.POSITION &&
          positionAttributes.tainted
        ) {
          if (!variablesInTaintedPositions[variableId]) {
            variablesInTaintedPositions[variableId] = {
              headPositionIds: new Set<string>(),
              bodyPositionIds: new Set<string>()
            };
          }

          if (attributes.head) {
            variablesInTaintedPositions[variableId].headPositionIds.add(positionId);
          } else {
            variablesInTaintedPositions[variableId].bodyPositionIds.add(positionId);
          }
        }
      }
    );

    // Build a collection of all variables in tainted positions and
    // where they appear (head/body)
    const positions: { [variableId: string]: {
      headPositionIds: Set<string>;
      bodyPositionIds: Set<string>;
    } } = {};

    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        variableId: string,
        positionId: string,
        variableAttributes: Attributes,
        positionAttributes: Attributes,
        undirected: boolean
      ): void => {
        if (
          // variableNodesToTaintedPositions.has(variableId) &&
          attributes.type == ProgramGraphEdgeType.VARIABLE_AT_POSITION &&
          variableAttributes.type == ProgramGraphNodeType.VARIABLE &&
          positionAttributes.type == ProgramGraphNodeType.POSITION
        ) {
          if (!positions[variableId]) {
            positions[variableId] = {
              headPositionIds: new Set<string>(),
              bodyPositionIds: new Set<string>()
            };
          }

          if (attributes.head) {
            positions[variableId].headPositionIds.add(positionId);
          } else {
            positions[variableId].bodyPositionIds.add(positionId);
          }
        }
      }
    );

    const positionIds: Set<string> = new Set<string>();

    for (const variableId of Object.keys(variablesInTaintedPositions)) {
      const variableAppearsInHead = variablesInTaintedPositions[variableId].headPositionIds.size > 0;
      const variableAppearsInBody = variablesInTaintedPositions[variableId].bodyPositionIds.size > 0;
      const headPositions = positions[variableId].headPositionIds;
      const bodyPositions = positions[variableId].bodyPositionIds;

      // If the variable appears in head tainted positions,
      if (variableAppearsInHead) {
        for (const bodyPositionId of bodyPositions) {
          positionIds.add(bodyPositionId);
        }
      }

      if (variableAppearsInBody) {
        for (const headPositionId of headPositions) {
          positionIds.add(headPositionId);
        }
      }
    }

    // Filter positions not in EDB atoms
    // ProgramGraphEdgeType.POSITION_OF

    const filteredPositionIds: string[] = [];
    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        atomId: string,
        positionId: string,
        atomAttributes: Attributes,
        positionAttributes: Attributes,
        undirected: boolean
      ): void => {
        if (
          positionIds.has(positionId) &&
          attributes.type == ProgramGraphEdgeType.POSITION_OF
        ) {
          const positionIsNotYetTainted = !positionAttributes.tainted;
          const positionIsNotInEdbAtom = (!("isEDB" in atomAttributes) || !atomAttributes.isEDB);

          if (positionIsNotYetTainted && positionIsNotInEdbAtom) {
            filteredPositionIds.push(positionId);
          }
        }
      }
    );

    return filteredPositionIds;
  }

  _getVariablesAtPositions(positionIds: string[]) {
    const variableIds: Set<string> = new Set<string>();
    // Check edges from variable to position in head
    const edges = this.programGraph.graph.filterEdges(
      (
        edge: string,
        attributes: Attributes,
        variableId: string,
        positionId: string,
        variableAttributes: Attributes,
        _positionAttributes: Attributes,
        _undirected: boolean
      ): void => {
        if (
          positionIds.includes(positionId) &&
          variableAttributes.type === ProgramGraphNodeType.VARIABLE &&
          attributes.type == ProgramGraphEdgeType.VARIABLE_AT_POSITION
        ) {
          variableIds.add(variableId);
        }
      }
    );

    return variableIds;
  }

  // Check that variables in tainted positions are not used in joins
  // https://www.vldb.org/pvldb/vol15/p3976-bellomarini.pdf
  private _markTaintedJoins() {
    // Find the position of variables in tainted positions
    const taintedVariables: { [ruleId: string]: Set<string>; } = this._getTaintedVariables();

    // Now, look for tainted variables used in joins
    const taintedVariablesEGDInBodyJoins: { [ruleId: string]: {
      [variable: string]: IDatalogpmToken[]
    } } = {};

    const rulesAreEGD: { [ruleId: string]: boolean } = {};

    // Assume we have a single EGD per rule
    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        token: string,
        variable: string,
        tokenAttributes: Attributes,
        variableAttributes: Attributes,
        undirected: boolean
      ): void => {
        if (
          tokenAttributes.type === ProgramGraphNodeType.TOKEN && 
          variableAttributes.type === ProgramGraphNodeType.VARIABLE &&
          taintedVariables[variableAttributes.rule] && taintedVariables[variableAttributes.rule].has(variable)
        ) {          
          const rule = variableAttributes.rule;

          if ("egd" in tokenAttributes && tokenAttributes.egd) {
            rulesAreEGD[rule] = true;
          }

          if ("head" in tokenAttributes && !tokenAttributes.head) {
            if (!taintedVariablesEGDInBodyJoins[rule]) {
              taintedVariablesEGDInBodyJoins[rule] = {};
            }
            if (!taintedVariablesEGDInBodyJoins[rule][variable]) {
              taintedVariablesEGDInBodyJoins[rule][variable] = [];
            }

            taintedVariablesEGDInBodyJoins[rule][variable].push(tokenAttributes.token);
          }
        }
      }
    );

    // Look for variable used in joins and TGDs
    for (const ruleId of Object.keys(taintedVariablesEGDInBodyJoins)) {    
      const ruleIsEGD = rulesAreEGD[ruleId] || false;
      for (const variable of Object.keys(taintedVariablesEGDInBodyJoins[ruleId])) {
        if (!ruleIsEGD && taintedVariablesEGDInBodyJoins[ruleId][variable].length > 1) {
          // Mark the tokens as used in tainted join
          for (const token of taintedVariablesEGDInBodyJoins[ruleId][variable]) {
            this.programGraph.graph.updateNode(token, (attr: any) => {
              return {
                ...attr,
                usedInTaintedJoin: true
              };
            });
            this._usedInTaintedJoinVariableTokens.push(token);
          }
        }
      }
    }
  }

  // Check that variables in tainted positions are not used in filters
  // https://www.vldb.org/pvldb/vol15/p3976-bellomarini.pdf
  private _markTaintedFilters() {
    // Find the position of variables in tainted positions
    const taintedVariables: { [ruleId: string]: Set<string>; } = this._getTaintedVariables();

    // Now, look for tainted variables used in joins
    const taintedVariablesUsedInFilters: string[] = [];

    // Assume we have a single EGD per rule
    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        variableId: string,
        conditionId: string,
        variableAttributes: Attributes,
        conditionAttributes: Attributes,
        undirected: boolean
      ): void => {
        if (
          variableAttributes.type === ProgramGraphNodeType.VARIABLE && 
          conditionAttributes.type === ProgramGraphNodeType.CONDITION &&
          attributes.type === ProgramGraphEdgeType.VARIABLE_AT_CONDITION &&
          taintedVariables[variableAttributes.rule] && taintedVariables[variableAttributes.rule].has(variableId)
        ) {
          taintedVariablesUsedInFilters.push(variableId);
        }
      }
    );

    const tokensOfTaintedVariablesUsedInFilters = concatenateArrays(this.programGraph.getTokensOfVariables(taintedVariablesUsedInFilters));

    // Look for variable used in filters too
    for (const token of tokensOfTaintedVariablesUsedInFilters) {
      this.programGraph.graph.updateNode(token, (attr: any) => {
        return {
          ...attr,
          usedInTaintedFilter: true
        };
      });
      this._usedInTaintedFilterVariableTokens.push(token);
    }
  }

  private _markLiteralsUsedInTaintedPositions() {
    // Find the position of variables in tainted positions
    const literalTokensUsedInTaintedPositions: IDatalogpmToken[] = [];

    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        token: string,
        _position: string,
        tokenAttributes: Attributes,
        positionAttributes: Attributes
      ) => {
        if (attributes.type == ProgramGraphEdgeType.TOKEN_AT_POSITION &&
          positionAttributes.tainted &&
          tokenAttributes.isLiteral) {
          literalTokensUsedInTaintedPositions.push(tokenAttributes.token);
        }
      }
    );

    
    for (const token of literalTokensUsedInTaintedPositions) {
      this.programGraph.graph.updateNode(token, (attr: any) => {
        return {
          ...attr,
          isLiteralUsedInTaintedPositions: true
        };
      });
      this._literalTokensUsedInTaintedPositions.push(token);
    }

  }

  private _getTaintedVariables() {
    const taintedVariables: { [ruleId: string]: Set<string>; } = {};

    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        variable: string,
        position: string,
        variableAttributes: Attributes,
        positionAttributes: Attributes
      ) => {
        if (attributes.type == ProgramGraphEdgeType.VARIABLE_AT_POSITION &&
          positionAttributes.tainted) {
          if (!taintedVariables[variableAttributes.rule]) {
            taintedVariables[variableAttributes.rule] = new Set<string>();
          }
          taintedVariables[variableAttributes.rule].add(variable);
        }
      }
    );
    return taintedVariables;
  }

  _markConstantsInEGDsTaintedPositions() {
    // Find the position of variables in tainted positions
    const taintedVariables: { [ruleId: string]: IDatalogpmToken[] } = {};
    // Check edges from variable to position in head
    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        token: string,
        position: string,
        tokenAttributes: Attributes,
        positionAttributes: Attributes
      ) => {
        if (
          attributes.type == ProgramGraphEdgeType.TOKEN_AT_POSITION &&
          positionAttributes.tainted
        ) {
          if (!taintedVariables[tokenAttributes.rule]) {
            taintedVariables[tokenAttributes.rule] = [];
          }
          taintedVariables[tokenAttributes.rule].push(tokenAttributes.token);
        }
      }
    );

    // Now find EGD rules
    const edgRules: Set<string> = new Set<string>();

    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        token: string,
        variable: string,
        tokenAttributes: Attributes,
        variableAttributes: Attributes,
        undirected: boolean
      ): void => {
        if (
          tokenAttributes.type === ProgramGraphNodeType.TOKEN && 
          variableAttributes.type === ProgramGraphNodeType.VARIABLE
        ) {
          const rule = variableAttributes.rule;

          if (tokenAttributes.egd) {
            edgRules.add(rule);
          }
        }
      }
    );    

    for (const ruleId of Object.keys(taintedVariables)) {
      if (edgRules.has(ruleId)) {
        this._constantsInTaintedPositions.push(...taintedVariables[ruleId]);
      }      
    }

  }

	/**
	 * Return a dictionary with variable harmfulness.
	 *
	 * "A ∀-variable x is harmful, wrt a rule ρ in Σ, if x appears only
	 * in affected positions in ρ, otherwise it is harmless."
	 * @returns HamfulnessOfVariables flag for each variable.
	 */
	_getHamfulnessOfVariables(): HamfulnessOfVariables {
		const variables: HamfulnessOfVariables = {};

		this.programGraph.graph.forEachNode((_nodeId: string, attributes: Attributes) => {
			// Let's start from universal variables
			const isVariable =
				attributes.type === ProgramGraphNodeType.VARIABLE &&
				!attributes.existential;

			if (!isVariable) return false;

			const universalVariableId = _nodeId;

			// Gather all positions in which a variable appears
			const variablePositions: {
				position: string,
				affected: boolean
			}[] = [];
			this.programGraph.graph.mapEdges(
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
						source == universalVariableId &&
						attributes.type == ProgramGraphEdgeType.VARIABLE_AT_POSITION
					) {
						variablePositions.push({
							position: target,
							affected: targetAttributes.affected
						});
					}
				}
			);

			const affectedVariablePositions = variablePositions.filter((variablePosition) => variablePosition.affected);
			const nonAffectedVariablePositions = variablePositions.filter((variablePosition: {
				position: string,
				affected: boolean
			}) => !variablePosition.affected);

			if (nonAffectedVariablePositions.length == 0 && affectedVariablePositions.length > 0) {
				variables[universalVariableId] = {
					harmful: true
				};  
			}
		});
		return variables;
	}


	/**
	 * "If the harmful variable is in head(ρ), it is dangerous."
	 */
	_getDangerousVariables() {
		const dangerousVariables = new Set<string>();

		const harmfulVariableNodes = this.programGraph.graph.filterNodes(
			(_nodeId: string, attributes: Attributes): boolean =>
				attributes.type === ProgramGraphNodeType.VARIABLE && attributes.harmful
		);

		for (const harmfulVariableNodeId of harmfulVariableNodes) {
			const edgesToPositionsInHead = this.programGraph.graph.filterEdges(
				(
					edge: string,
					attributes: Attributes,
					source: string,
					target: string,
					sourceAttributes: Attributes,
					targetAttributes: Attributes,
					undirected: boolean
				): boolean =>
					source == harmfulVariableNodeId &&
					attributes.type == ProgramGraphEdgeType.VARIABLE_AT_POSITION &&
					attributes.head
			);

			if (edgesToPositionsInHead.length > 0) {
				dangerousVariables.add(harmfulVariableNodeId);
			}
		}

		return dangerousVariables;
	}

	

	markUnwardedVariableTokens() {

    // Find all existential variables
    const existentialVariableNodes = getExistentialVariableNodes(this.programGraph.graph);

    // Mark all positions of existential variables as affected
    // "We define p[i] as affected if (i) p appears in a rule in Σ with an
    // existentially quantified variable (∃-variable) in the i-th term or, (ii) ..."
    const positionsOfExistentialVariables = this.programGraph.getPositionsOfVariables(
      existentialVariableNodes
    );
    for (const positionOfVariable of positionsOfExistentialVariables) {
      this.programGraph.setNodeAttributes(positionOfVariable, {affected: true});
    }

    // Mark all positions that propagates nulls as affected
    this._markUniversallyQuantifiedVariablesInAffectedBodyPositions();

    // Get harmfulness of variables
    const variablesInAffectedPositions = this._getHamfulnessOfVariables();

    // Add the harmful attribute to the variable nodes
    for (const variableNodeId of Object.keys(variablesInAffectedPositions)) {
      this.programGraph.setNodeAttributes(variableNodeId, {harmful: variablesInAffectedPositions[variableNodeId].harmful});
    }

    // Determine dangerous variables
    const dangerousVariables = this._getDangerousVariables();
    for (const variableId of dangerousVariables) {
      this.programGraph.setNodeAttributes(variableId, {dangerous: true});
    }

    // Tainted join detection (to detect EGDs that don't harmless condition)
    this._markTaintedPositions();
    this._propagateTaintedness();
    this._markTaintedJoins();
    this._markTaintedFilters();
    this._markLiteralsUsedInTaintedPositions();
    this._markConstantsInEGDsTaintedPositions();
    // Warded fragment detection: end -----

    // Update internal collections
    // Update existential variables
    this._existentialVariableTokens = concatenateArrays(
      this.programGraph.getTokensOfVariables(Array.from(existentialVariableNodes))
    );

    // Update marked null variables
    this._markedNullVariableTokens = this.getMarkedNullVariableTokens();

    // ---
    // Update harmful variables
    const harmfulVariables = this.programGraph.graph.filterNodes(
      (_nodeId: string, attributes: Attributes): boolean =>
        attributes.type === ProgramGraphNodeType.VARIABLE && attributes.harmful
    );
    this._harmfulVariableTokens = concatenateArrays(
      this.programGraph.getTokensOfVariables(harmfulVariables)
    );

    // Update dangerous variables
    const dangerousVariables2 = this.programGraph.graph.filterNodes(
      (_nodeId: string, attributes: Attributes): boolean =>
        attributes.type === ProgramGraphNodeType.VARIABLE &&
        attributes.dangerous
    );
    this._dangerousVariableTokens = concatenateArrays(
      this.programGraph.getTokensOfVariables(dangerousVariables2)
    );

    const unwardedVariableIds = this._getWardBreakingDangerousVariables();
    const unwardedVariableTokens = this.programGraph.getTokensOfVariables(Array.from(unwardedVariableIds), RulePart.RULE_PART_BODY);
    this._unwardedVariableTokens = concatenateArrays(unwardedVariableTokens);

	}

  getMarkedNullVariableTokens(): IDatalogpmToken[] {
    const markedNullVariableTokens: IDatalogpmToken[] = [];

    // To correctly detect marked null variables, we need to
    // identify tokens which are in atoms with affected positions.
    const affectedPositions = new Set<string>();
    this.programGraph.graph.mapEdges(
      (
        edge: string,
        attributes: Attributes,
        variableId: string,
        positionId: string,
        variableAttributes: Attributes,
        positionAttributes: Attributes,
        undirected: boolean
      ) => {
        if (
          attributes.type == ProgramGraphEdgeType.VARIABLE_AT_POSITION &&
          positionAttributes.affected  
        ) {
          affectedPositions.add(positionId);
        }
      }
    );

    // Then, we look for tokens...
    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        token: string,
        variable: string,
        tokenAttributes: Attributes,
        variableAttributes: Attributes,
        undirected: boolean
      ): void => {
        if (
          tokenAttributes.type === ProgramGraphNodeType.TOKEN && 
          variableAttributes.type === ProgramGraphNodeType.VARIABLE &&
          affectedPositions.has(tokenAttributes.position)
        ) {          
          markedNullVariableTokens.push(tokenAttributes.token);          
        }
      }
    );

    return markedNullVariableTokens;
  }  

	getDiagnostics(): Diagnostic[] {
    return [
      ...this.unwardedVariableDiagnostic(),
      ...this.usedInTaintedJoinVariableDiagnostic(),
      ...this.usedInTaintedFilterVariableTokensDiagnostic(),
      ...this.literalTokensUsedInTaintedPositionsDiagnostic(),
      ...this.constantsInTaintedPositionsDiagnostic()
    ];
	}

	unwardedVariableDiagnostic() {
    return this.unwardedVariableTokens.map((datalogpmToken: IDatalogpmToken) => {
      const d = makeDiagnostic(
        datalogpmToken,
        ErrorTypes.ERR_VARIABLE_IS_UNWARDED_0,
        {variable: datalogpmToken.text}
      );
      d.data = {
        fragmentViolation: 'Warded'
      } as CustomDiagnosticData;
      return d;
    });
  }

  usedInTaintedJoinVariableDiagnostic() {
    return this.usedInTaintedJoinVariableTokens.map(
      (datalogpmToken: IDatalogpmToken) => {
        const d = makeDiagnostic(
          datalogpmToken,
          ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0,
          {variable: datalogpmToken.text}
        );
        d.data = {
          fragmentViolation: 'Warded'
        } as CustomDiagnosticData;
        return d;
      });
  }


  usedInTaintedFilterVariableTokensDiagnostic() {
    return this.usedInTaintedFilterVariableTokens.map(
      (datalogpmToken: IDatalogpmToken) => {
        const d = makeDiagnostic(
          datalogpmToken,
          ErrorTypes.ERR_VARIABLE_IN_TAINTED_POSITION_IS_USED_IN_FILTER_0,
          {variable: datalogpmToken.text}
        );
        d.data = {
          fragmentViolation: 'Warded'
        } as CustomDiagnosticData;
        return d;
      });
  }

  literalTokensUsedInTaintedPositionsDiagnostic() {
    return this.literalTokensUsedInTaintedPositions.map(
      (datalogpmToken: IDatalogpmToken) => {
        const d = makeDiagnostic(
          datalogpmToken,
          ErrorTypes.ERR_LITERAL_IN_TAINTED_POSITION,
          {literal: datalogpmToken.text}
        );
        d.data = {
          fragmentViolation: 'Warded'
        } as CustomDiagnosticData;
        return d;
      });
  }

  

  constantsInTaintedPositionsDiagnostic() {
    return this.constantsInTaintedPositions.map(
      (datalogpmToken: IDatalogpmToken) => {
        const d = makeDiagnostic(
          datalogpmToken,
          ErrorTypes.ERR_CONSTANT_USED_IN_TAINTED_POSITION,
          {variable: datalogpmToken.text}
        );
        d.data = {
          fragmentViolation: 'Warded'
        } as CustomDiagnosticData;
        return d;
      });
  }

}