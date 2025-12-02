// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Representation of a program graph.
 */

// Graphology usage:
// import Graph from "graphology";
// import { DirectedGraph } from "graphology";
// const d = new DirectedGraph();
// const g = new Graph();

import { MultiDirectedGraph } from "graphology";
import { Attributes } from "graphology-types";
import { Range, URI } from "vscode-languageserver/node";
import { AggregationType, IDatalogpmAtomAttributes, IDatalogpmAtomToken, IDatalogpmAtomTokenAttributes, IDatalogpmToken, IDatalogpmVariableAttributes, IDatalogpmVariableToken, DatalogpmTokenType } from "./common";
import { concatenateArrays } from './set-utils';

/**
 * Attributes of an atom node in the program graph.
 */
export type AtomAttributes = Attributes & {
  type: ProgramGraphNodeType.ATOM;
  location: AtomLocation;
};

/**
 * Type of a program graph node.
 */
export enum ProgramGraphNodeType {
  RULE = "rule",
  ATOM = "atom",
  TOKEN = "token",
  VARIABLE = "variable",
  POSITION = "position",
  EGD = "egd",
  CONDITION = "condition",
  AGGREGATION = "aggregation"
}

/**
 * Type of a program graph edge.
 */
export enum ProgramGraphEdgeType {
  ATOM_OF = "atom",
  TOKEN_OF = "token",
  VARIABLE_AT_POSITION = "variable",
  VARIABLE_AT_EGD = "variable-at-egd",
  VARIABLE_AT_CONDITION = "variable-at-condition",
  POSITION_OF = "position",
  VARIABLE_AT_ATOM_TOKEN = "variable-at-atom-token",
  EGD_OF = "egd-of",
  TOKEN_AT_POSITION = "token-at-position",
  AGGREGATION_OF_RULE = "aggregation-of-rule",
  CONTRIBUTOR_OF_AGGREGATION = "contributor-of-aggregation"
}

/**
 * Location (where it appears in a rule) of an atom.
 */
export enum AtomLocation {  
  Head = 'Head',
  Body = 'Body',
  Fact = 'Fact',
  Input = 'Input',
  Output = 'Output',
  Binding = 'Binding',
  Mapping = 'Mapping',
  Post = 'Post'
}

/**
 * Position of an atom in the program graph.
 */
export interface AtomPosition {
  index: number;
  type: ProgramGraphNodeType;
  atom: string;
}

/**
 * Parts of a rule.
 */
export enum RulePart {
  RULE_PART_HEAD = 0,
  RULE_PART_BODY = 1,
  RULE_PART_ALL
}

/**
 * Get the existential variable nodes in the program graph.
 * @returns Return a list of existential variables in the program.
 */
export function getExistentialVariableNodes(graph: MultiDirectedGraph): Set<string> {
  // Find all variable nodes
  const existentialVariableNodes = graph.filterNodes(
    (_nodeId: string, attributes: Attributes): boolean => {
      // Let's start from variables
      const isVariable = attributes.type === ProgramGraphNodeType.VARIABLE;

      if (!isVariable) return false;

      // Check edges from variable to position in head
      const headEdges = graph.filterEdges(
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
          attributes.type == ProgramGraphEdgeType.VARIABLE_AT_POSITION &&
          attributes.head
      );

      // Check edges from variable to position in body
      const bodyEdges = graph.filterEdges(
        (
          edge: string,
          attributes: Attributes,
          source: string,
          target: string,
          sourceAttributes: Attributes,
          targetAttributes: Attributes,
          undirected: boolean
        ): boolean =>
          target == _nodeId &&
          attributes.type == ProgramGraphEdgeType.TOKEN_OF &&
          !sourceAttributes.head
      );

      return headEdges.length > 0 && bodyEdges.length == 0;
    }
  );
  return new Set<string>(existentialVariableNodes);
}

/**
 * Build a unique ID for an atom token.
 * @param atomToken The atom token.
 * @returns The unique ID for the atom token.
 */
function buildAtomTokenId(atomToken: IDatalogpmToken) {
  return `L${atomToken.line}C${atomToken.column}L${atomToken.length}`;
}

/**
 * Representation of a program in form of a graph.
 * Used for program analysis to support propagation
 * of effects.
 */
export class ProgramGraph {
  graph = new MultiDirectedGraph();

  protected _analyzed = false;

  addRule(ruleId: string, range: Range, uri?: URI) {
    // Add check if rule exists first
    if (this.graph.hasNode(ruleId)) {
      console.warn("Rule already exists in graph: ", ruleId);
      return;
    }
    
    this.graph.addNode(ruleId, { 
      type: ProgramGraphNodeType.RULE,
      range,
      uri
     });
  }

  closeRule(ruleId: string, attributes: Partial<Attributes> = {}) {
    // Add check if rule exists first
    if (!this.graph.hasNode(ruleId)) {
      console.warn("Rule does not exist in graph: ", ruleId);
      return;
    }
    
    this.graph.updateNode(ruleId, (attr: any) => {
      return {
        ...attr,
        ...attributes,
      };
    });
  }

  addEGDToken(egdToken: IDatalogpmToken, ruleId: string, egdPosition: number) {

    // Let's create first the EGD
    const egdId = `egd${egdPosition}@${ruleId}`;
    if (!this.graph.hasNode(egdId)) {
        this.graph.addNode(egdId, {
        type: ProgramGraphNodeType.EGD
      });
      // Add EGD to rule
      this.graph.addEdge(egdId, ruleId, {
        type: ProgramGraphEdgeType.EGD_OF,
      });
    }

    // Then add the token
    const tokenId = `L${egdToken.line}C${egdToken.column}L${egdToken.length}`;
    this.graph.addNode(tokenId, {
      type: ProgramGraphNodeType.TOKEN,
      token: egdToken,
      rule: ruleId
    });
    this.graph.addEdge(tokenId, egdId, {
      type: ProgramGraphEdgeType.TOKEN_OF,
      token: egdToken
    });

  }

  addCondition(condition: string, ruleId: string, conditionPosition: number, equality: boolean) {
    // Let's create first the Condition
    const conditionId = `condition${conditionPosition}@${ruleId}`;
    if (!this.graph.hasNode(conditionId)) {
        this.graph.addNode(conditionId, {
        type: ProgramGraphNodeType.CONDITION,
        text: condition,
        equality
      });
      // Add atom to rule
      this.graph.addEdge(conditionId, ruleId, {
        type: ProgramGraphEdgeType.ATOM_OF
      });
    }
  }

  addAnnotationAtomToken(termToken: IDatalogpmToken, ruleId: string, location: AtomLocation) {
    const atomName = termToken.text.replace(/"/g, "");
    this.addAtomToken(atomName, {
      ...termToken,
      type: DatalogpmTokenType.ATOM,
      text: atomName,
      column: termToken.column + 1, // +1 to account for the "
      length: termToken.length - 2 // -1 to account for the ""
    }, 0, ruleId, location);

  }

  addInputAtomToken(termToken: IDatalogpmToken, ruleId: string) {
    this.addAnnotationAtomToken(termToken, ruleId, AtomLocation.Input);
  }

  addOutputAtomToken(termToken: IDatalogpmToken, ruleId: string) {
    this.addAnnotationAtomToken(termToken, ruleId, AtomLocation.Output);
  }

  addBindingAtomToken(atomToken: IDatalogpmToken, ruleId: string) {
    this.addAnnotationAtomToken(atomToken, ruleId, AtomLocation.Binding);
  }

  addMappingAtomToken(atomToken: IDatalogpmToken, ruleId: string) {
    this.addAnnotationAtomToken(atomToken, ruleId, AtomLocation.Mapping);
  }

  addPostAtomToken(atomToken: IDatalogpmToken, ruleId: string) {
    this.addAnnotationAtomToken(atomToken, ruleId, AtomLocation.Post);
  }


  addAtomToken(atomId: string, atomToken: IDatalogpmToken, bodyConjunctiveQueryTerm: number, ruleId: string, location: AtomLocation, negated = false) {
    if (!this.graph.hasNode(atomId)) {
      // Add atom to rule
      this.graph.addNode(atomId, { type: ProgramGraphNodeType.ATOM });
      this.graph.addEdge(atomId, ruleId, {
        type: ProgramGraphEdgeType.ATOM_OF,
      });
    }

    const tokenId = buildAtomTokenId(atomToken);
    this.graph.addNode(tokenId, {
      type: ProgramGraphNodeType.TOKEN,
      token: atomToken,
      rule: ruleId,
      location
    });
    this.graph.addEdge(tokenId, atomId, {
      type: ProgramGraphEdgeType.TOKEN_OF,
      token: atomToken,
      location
    });
  }

  addConstantToken(
    variableToken: IDatalogpmToken,
    ruleId: string,
    atomToken: IDatalogpmToken,
    bodyConjunctiveQueryTerm: number,
    termPositionBeingVisited: number,
    head: boolean,
    negated: boolean
  ) {
    const atomName = atomToken.text;
    const positionId = `${atomName}[${termPositionBeingVisited}]`;
    if (!this.graph.hasNode(positionId)) {
      this.graph.addNode(positionId, {
        index: termPositionBeingVisited,
        type: ProgramGraphNodeType.POSITION,
        atom: atomName,
      } as AtomPosition);
    }
    if (!this.graph.hasEdge(atomName, positionId)) {
      this.graph.addEdge(atomName, positionId, {
        type: ProgramGraphEdgeType.POSITION_OF
      });
    }

    // Create token
    const tokenId = `L${variableToken.line}C${variableToken.column}L${variableToken.length}`;
    this.graph.addNode(tokenId, {
      type: ProgramGraphNodeType.TOKEN,
      token: variableToken,
      rule: ruleId,
      head,
      atomIndex: bodyConjunctiveQueryTerm,
      termIndex: termPositionBeingVisited,
      // Mark this token as a literal
      isLiteral: true
    });
    // Link Token to position
    this.graph.addEdge(tokenId, positionId, {
      type: ProgramGraphEdgeType.TOKEN_AT_POSITION,
      head,
    });
  }

  addVariableToken(
    variableToken: IDatalogpmToken,
    ruleId: string,
    atomToken: IDatalogpmToken,
    bodyConjunctiveQueryTerm: number,
    termPositionBeingVisited: number,
    head: boolean,
    negated: boolean
  ) {
    const atomName = atomToken.text;
    const positionId = `${atomName}[${termPositionBeingVisited}]`;
    if (!this.graph.hasNode(positionId)) {
      this.graph.addNode(positionId, {
        index: termPositionBeingVisited,
        type: ProgramGraphNodeType.POSITION,
        atom: atomName,
      } as AtomPosition);
    }
    if (!this.graph.hasEdge(atomName, positionId)) {
      this.graph.addEdge(atomName, positionId, {
        type: ProgramGraphEdgeType.POSITION_OF
      });
    }

    const variableName = variableToken.text;
    const variableId = `${variableName}_${ruleId}`;
    if (!this.graph.hasNode(variableId)) {
      this.graph.addNode(variableId, {
        name: variableName,
        type: ProgramGraphNodeType.VARIABLE,
        rule: ruleId
      });
    }

    this.graph.addEdge(variableId, positionId, {
      type: ProgramGraphEdgeType.VARIABLE_AT_POSITION,
      head,
      bodyConjunctiveQueryTerm,
      negated
    });

    // Link the variable to the atom token. This is needed to
    // detect variables that appear together in the same atom.
    const atomTokenId = buildAtomTokenId(atomToken);
    this.graph.addEdge(variableId, atomTokenId, {
      type: ProgramGraphEdgeType.VARIABLE_AT_ATOM_TOKEN,
      head,
      bodyConjunctiveQueryTerm,
      negated
    });

    // Add token to variable
    const tokenId = `L${variableToken.line}C${variableToken.column}L${variableToken.length}`;
    this.graph.addNode(tokenId, {
      type: ProgramGraphNodeType.TOKEN,
      token: variableToken,
      rule: ruleId,
      head,
      atomIndex: bodyConjunctiveQueryTerm,
      termIndex: termPositionBeingVisited,
      atom: atomName,
      position: positionId
    });
    this.graph.addEdge(tokenId, variableId, {
      type: ProgramGraphEdgeType.TOKEN_OF,
      head,
    });
  }


  addEGDVariableToken(
    variableToken: IDatalogpmToken,
    ruleId: string,
    egdPosition: number
  ) {
    // Assume the EGD node was already created in the graph
    const egdId = `egd${egdPosition}@${ruleId}`;
    if (!this.graph.hasNode(egdId)) {
      // If we can't find the node, something strange is going on with the parsing
      // and ANTLR4 believes we are in an EGD, when we are not; just bail.
      return;
    }

    // Create the variable token if it doesn't exist
    const variableName = variableToken.text;
    const variableId = `${variableName}_${ruleId}`;
    if (!this.graph.hasNode(variableId)) {
      this.graph.addNode(variableId, {
        name: variableName,
        type: ProgramGraphNodeType.VARIABLE,
        rule: ruleId
      });
    }

    this.graph.addEdge(variableId, egdId, {
      type: ProgramGraphEdgeType.VARIABLE_AT_EGD
    });

    const tokenId = `L${variableToken.line}C${variableToken.column}L${variableToken.length}`;
    this.graph.addNode(tokenId, {
      type: ProgramGraphNodeType.TOKEN,
      token: variableToken,
      rule: ruleId,
      egd: true
    });
    this.graph.addEdge(tokenId, variableId, {
      type: ProgramGraphEdgeType.TOKEN_OF,
      token: variableId
    });

  }

  addConditionVariableToken(
    variableToken: IDatalogpmToken,
    ruleId: string,
    conditionPosition: number,
    leftHandSideOfAnEqCondition: boolean
  ) {
    // Assume the EGD node was already created in the graph
    const conditionId = `condition${conditionPosition}@${ruleId}`;

    // Create the variable token if it doesn't exist
    const variableName = variableToken.text;
    const variableId = `${variableName}_${ruleId}`;

    // Add the variable if it doesn't exist
    if (!this.graph.hasNode(variableId)) {
      this.graph.addNode(variableId, {
        name: variableName,
        type: ProgramGraphNodeType.VARIABLE,
        rule: ruleId
      });
    }

    // Link the variable to the condition
    this.graph.addEdge(variableId, conditionId, {
      type: ProgramGraphEdgeType.VARIABLE_AT_CONDITION,
      leftHandSideOfAnEqCondition
    });

    // Link the token to the variable
    const tokenId = `L${variableToken.line}C${variableToken.column}L${variableToken.length}`;
    this.graph.addNode(tokenId, {
      type: ProgramGraphNodeType.TOKEN,
      token: variableToken,
      rule: ruleId
    });
    this.graph.addEdge(tokenId, variableId, {
      type: ProgramGraphEdgeType.TOKEN_OF,
      token: variableId
    });
  }

  public addAggregation(condition: string, ruleId: string, aggregationType: AggregationType, aggregationPosition: number) {
    // Let's create first the Aggregation
    const aggregationId = `aggregation${aggregationPosition}@${ruleId}`;

    if (!this.graph.hasNode(aggregationId)) {
        this.graph.addNode(aggregationId, {
        type: ProgramGraphNodeType.AGGREGATION,
        text: condition,
        aggregationType
      });
      // Add atom to rule
      this.graph.addEdge(aggregationId, ruleId, {
        type: ProgramGraphEdgeType.AGGREGATION_OF_RULE
      });
    }    
  }

  public addContributorVariable(
    variableToken: IDatalogpmToken,
    ruleId: string,
    aggregationPosition: number,
    contributorIndex: number) {

    const aggregationId = `aggregation${aggregationPosition}@${ruleId}`;

    // Create the variable token if it doesn't exist
    const variableName = variableToken.text;
    const variableId = `${variableName}_${ruleId}`;

    // Add the variable if it doesn't exist
    if (!this.graph.hasNode(variableId)) {
      this.graph.addNode(variableId, {
        name: variableName,
        type: ProgramGraphNodeType.VARIABLE,
        rule: ruleId
      });
    }

    // Link the variable to the condition
    this.graph.addEdge(variableId, aggregationId, {
      type: ProgramGraphEdgeType.CONTRIBUTOR_OF_AGGREGATION,
      index: contributorIndex
    });
      
  }

  
  public getPositionsOfVariables(variableNodeIds: Set<string>) {
    // Find all variable nodes
    const positionNodes = this.graph.filterNodes(
      (_nodeId: string, attributes: Attributes): boolean => {
        // Let's start from positions
        const isPosition = attributes.type === ProgramGraphNodeType.POSITION;

        if (!isPosition) return false;

        // Check edges from variable to position in head
        const edges = this.graph.filterEdges(
          (
            edge: string,
            attributes: Attributes,
            source: string,
            target: string,
            sourceAttributes: Attributes,
            targetAttributes: Attributes,
            undirected: boolean
          ): boolean =>
            variableNodeIds.has(source) &&
            target == _nodeId &&
            attributes.type == ProgramGraphEdgeType.VARIABLE_AT_POSITION
        );

        return edges.length > 0;
      }
    );
    return new Set(positionNodes);
  }

  getTokensOfVariables(variableNodeIds: string[], rulePart = RulePart.RULE_PART_ALL): { [key: string]: IDatalogpmToken[] } {
    const tokens: { [key: string]: IDatalogpmToken[] } = {};

    for (const variableNodeId of variableNodeIds) {
      this.graph.forEachEdge(
        (
          edge: string,
          attributes: Attributes,
          source: string,
          target: string,
          sourceAttributes: Attributes,
          targetAttributes: Attributes,
          undirected: boolean
        ): void => {
          const filter = (rulePart == RulePart.RULE_PART_HEAD && attributes.head) || (rulePart == RulePart.RULE_PART_BODY && !attributes.head) || rulePart == RulePart.RULE_PART_ALL;

          if (
            target == variableNodeId &&
            attributes.type == ProgramGraphEdgeType.TOKEN_OF &&
            sourceAttributes.type == ProgramGraphNodeType.TOKEN &&
            filter
          ) {
            if (!tokens[variableNodeId]) {
              tokens[variableNodeId] = [];
            }
            tokens[variableNodeId].push(sourceAttributes.token);
          }
        }
      );
    }

    return tokens;
  }

  getTokenAttributes(atomIds: string[], rulePart = RulePart.RULE_PART_ALL): { [key: string]: Attributes[] } {
    const tokens: { [key: string]: Attributes[] } = {};

    for (const atomId of atomIds) {
      this.graph.forEachEdge(
        (
          edge: string,
          attributes: Attributes,
          token: string,
          atom: string,
          tokenAttributes: Attributes,
          atomAttributes: Attributes,
          undirected: boolean
        ): void => {
          const filter = (rulePart == RulePart.RULE_PART_HEAD && attributes.head) || (rulePart == RulePart.RULE_PART_BODY && !attributes.head) || rulePart == RulePart.RULE_PART_ALL;

          if (
            atom == atomId &&
            attributes.type == ProgramGraphEdgeType.TOKEN_OF &&
            tokenAttributes.type == ProgramGraphNodeType.TOKEN &&
            filter
          ) {
            if (!tokens[atomId]) {
              tokens[atomId] = [];
            }
            tokens[atomId].push(tokenAttributes);
          }
        }
      );
    }

    return tokens;
  }


  /**
   * Return the Datalog+/- tokens of the given token node ids.
   * @param tokenNodeIds 
   * @returns 
   */
  getDatalogpmTokensOfTokens(tokenNodeIds: string[]): IDatalogpmToken[] {
    const tokens: IDatalogpmToken[] = [];

    for (const tokenNodeId of tokenNodeIds) {
      this.graph.forEachNode((nodeId: string, attributes: Attributes): void => {
        if (nodeId == tokenNodeId) {
          tokens.push(attributes.token);
        }
      });
    }

    return tokens;
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
    

  private _undeclaredVariableTokens: IDatalogpmToken[] = [];
  get undeclaredVariableTokens() {
    if (!this._analyzed) throw new Error("ProgramGraph not analyzed yet");
    return this._undeclaredVariableTokens;
  }

  _updateInternalCollections() {
    // Update undeclared variables
    const undeclaredVariables = this.graph.filterNodes(
      (_nodeId: string, attributes: Attributes): boolean =>
        attributes.type === ProgramGraphNodeType.VARIABLE &&
        attributes.undeclared
    );
    this._undeclaredVariableTokens = concatenateArrays(
      this.getTokensOfVariables(undeclaredVariables)
    );
  }

  /**
   * Analyze the program graph and apply tags for existential, harmful
   * and dangerous variables.
   * 
   * @remarks Analysis is progressively refactored out using ProgramGraphAnalyzer 
   *          classes, so this method will be eventually emptied.
   */
  analyze() {
    // Warded fragment detection: start ---

    // Find all existential variables
    const existentialVariableNodes = getExistentialVariableNodes(this.graph);

    // Add the existential attribute to the variable nodes:
    // true for existential variables, false for universal variables
    for (const existentialVariableNode of existentialVariableNodes) {
      this.setNodeAttributes(existentialVariableNode, {existential: true});
    }

    const existentialAtomTokenVariables: {[atomToken: string]: string[]} = {};
    this.graph.forEachEdge(
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
          variableAttributes.existential
        ) {
          if (!existentialAtomTokenVariables[atomToken]) {
            existentialAtomTokenVariables[atomToken] = [];
          }
          existentialAtomTokenVariables[atomToken].push(variableAttributes.name);
        }
      }
    );

    for (const [atomToken, variables] of Object.entries(existentialAtomTokenVariables)) {
      this.setNodeAttributes(atomToken, {
        existentialVariables: variables
      });
    }

    // Check for atoms in conditions which have not been defined
    this._markUndefinedVariablesInConditions();

    // End of checks, mark analysis flags from now on
    
    // Update internal collections
    this._updateInternalCollections();

    // Mark the program as analyzed (so that collections may be queried)
    this._analyzed = true;
  }

  public setNodeAttributes(positionId: string, attributes: any) {
    this.graph.updateNode(positionId, (attr: any) => {
      return {
        ...attr,
        ...attributes,
      };
    });
  }

  _markUndefinedVariablesInConditions() {
    // Find the position of variables in tainted positions
    const variableUsedInConditions = this.graph.filterNodes(
      (_nodeId: string, attributes: Attributes): boolean => {
        // Let's start from positions
        const isVariable = attributes.type === ProgramGraphNodeType.VARIABLE;

        if (!isVariable) return false;

        // Check edges from variable to position in head
        const edges = this.graph.filterEdges(
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
            attributes.type == ProgramGraphEdgeType.VARIABLE_AT_CONDITION
        );

        return edges.length > 0;
      }
    );
    
    const variablesUsedInBodyAtoms = this._getVariablesUsedInBodyAtoms();   

    const variableUsedInAssignments = this.graph.filterNodes(
      (_nodeId: string, attributes: Attributes): boolean => {
        // Let's start from positions
        const isVariable = attributes.type === ProgramGraphNodeType.VARIABLE;

        if (!isVariable) return false;

        // Check edges from variable to position in head
        const edges = this.graph.filterEdges(
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
            attributes.type == ProgramGraphEdgeType.VARIABLE_AT_CONDITION &&
            attributes.leftHandSideOfAnEqCondition
        );

        return edges.length > 0;
      }
    );

    // Now find variables which appear in the body
    const variablesUsedInConditionsNotUsedInBodyAtoms = variableUsedInConditions.filter(v => !variablesUsedInBodyAtoms.includes(v));
    const undeclaredVariables = variablesUsedInConditionsNotUsedInBodyAtoms.filter(v => !variableUsedInAssignments.includes(v));
    
    for (const undeclaredVariable of undeclaredVariables) {
      this.graph.updateNode(undeclaredVariable, (attr: any) => {
        return {
          ...attr,
          undeclared: true
        };
      });
    }

  }

  private _getVariablesUsedInBodyAtoms() {
    return this.graph.filterNodes(
      (_nodeId: string, attributes: Attributes): boolean => {
        // Let's start from positions
        const isVariable = attributes.type === ProgramGraphNodeType.VARIABLE;

        if (!isVariable) return false;

        // Check edges from variable to position in head
        const edges = this.graph.filterEdges(
          (
            edge: string,
            attributes: Attributes,
            source: string,
            target: string,
            sourceAttributes: Attributes,
            targetAttributes: Attributes,
            undirected: boolean
          ): boolean => source == _nodeId &&
          (attributes.type == ProgramGraphEdgeType.VARIABLE_AT_POSITION) &&
          !attributes.head &&
            !attributes.negated
        );

        return edges.length > 0;
      }
    );
  }

  /**
   * Transforms the program graph as a human-readable string.
   * @returns {string} A string representation of the program graph.
   */
  toString(): string {
    if (!this._analyzed) throw new Error("ProgramGraph not analyzed yet");

    let result = "ProgramGraph:\n";
    result += "  Nodes:\n";
    this.graph.forEachNode((nodeId: string, attributes: Attributes) => {
      result += `   - ${nodeId}: ${JSON.stringify(attributes)}\n`;
    });
    result += "  Edges:\n";
    this.graph.forEachEdge((edgeId: string, attributes: Attributes, source: string, target: string, sourceAttributes: Attributes, targetAttributes: Attributes, undirected: boolean) => {
      result += `   - ${edgeId}: ${JSON.stringify(attributes)} (from ${source} to ${target})\n`;
    });
    return result;
  }

  public getVariableTokens(): IDatalogpmVariableToken[] {

    // Get all the variable attributes
    const variableAttributes: { [variable: string]: IDatalogpmVariableAttributes } = {};
    this.graph.forEachNode((nodeId: string, attributes: Attributes) => {
      if (attributes.type === ProgramGraphNodeType.VARIABLE) {
        variableAttributes[nodeId] = attributes as IDatalogpmVariableAttributes;
      }
    });

    // Get all the variable tokens
    const variableTokens: { [key: string]: IDatalogpmToken[] } = this.getTokensOfVariables(Object.keys(variableAttributes));
    
    // Now, for each variable token, build a new IDatalogpmVariableToken using attributes
    const variableTokensWithAttributes: IDatalogpmVariableToken[] = [];
    for (const variableName in variableTokens) {
      const variableAttribute: any = variableAttributes[variableName] ? { ...variableAttributes[variableName] } : {};
      const tokens = variableTokens[variableName];

      // Change invadedBy string[] into IDatalogpmToken[]
      const attackedBy: IDatalogpmToken[] = [];
      if (variableAttribute.attackedBy) {
        for (const invader of variableAttribute.attackedBy) {
          attackedBy.push(...variableTokens[invader]);
        }
      }

      // Now map unstructured variableAttribute to IDatalogpmVariableToken attributes
      const datalogpmVariableAttributes: IDatalogpmVariableAttributes = {
        name: variableAttribute.name,
        rule: variableAttribute.rule || {},
        existential: variableAttribute.existential || false,
        harmless: variableAttribute.harmless || false,
        harmful: variableAttribute.harmful || false,
        dangerous: variableAttribute.dangerous || false,
        protected_: variableAttribute.protected_ || false,
        attackedBy,
      };
      

      for (const token of tokens) {
        // Create a new IDatalogpmVariableToken with the attributes
        const variableToken = {
          ...token,
          ...datalogpmVariableAttributes
        } as IDatalogpmVariableToken;
        variableTokensWithAttributes.push(variableToken);
      }
    }

    return variableTokensWithAttributes;
  }

  public getAtomTokens(): IDatalogpmAtomToken[] {
    // Get all the variable attributes
    const atomAttributes: { [variable: string]: IDatalogpmVariableAttributes } = {};
    this.graph.forEachNode((nodeId: string, attributes: Attributes) => {
      if (attributes.type === ProgramGraphNodeType.ATOM) {
        atomAttributes[nodeId] = attributes as IDatalogpmVariableAttributes;
      }
    });

    // Get all the variable tokens
    const atomTokenAttributes: { [key: string]: Attributes[] } = this.getTokenAttributes(Object.keys(atomAttributes));
    
    // Now, for each variable token, build a new IDatalogpmVariableToken using attributes
    const atomTokensWithAttributes: IDatalogpmAtomToken[] = [];
    for (const atomName in atomTokenAttributes) {
      const atomAttribute: any = atomAttributes[atomName] ? { ...atomAttributes[atomName] } : {};
      const atomTokenAttribute: any = atomTokenAttributes[atomName] ? [ ...atomTokenAttributes[atomName] ] : [];

      // Now map unstructured variableAttribute to IDatalogpmVariableToken attributes
      const datalogpmAtomAttributes: IDatalogpmAtomAttributes = {
        isEDB: atomAttribute.isEDB || false,
        isIDB: atomAttribute.isIDB || false
      };

      for (const tokenAttributes of atomTokenAttribute) {
        const datalogpmAtomTokenAttributes: IDatalogpmAtomTokenAttributes = {
          guard: tokenAttributes.guard || false,
          weakGuard: tokenAttributes.weakGuard || false,
          frontierGuard: tokenAttributes.frontierGuard || false,
          weakFrontierGuard: tokenAttributes.weakFrontierGuard || false,
          existentialVariables: tokenAttributes.existentialVariables || [],
        };

        // Create a new IDatalogpmVariableToken with the attributes
        const atomToken = {
          ...tokenAttributes.token,
          ...datalogpmAtomAttributes,
          ...datalogpmAtomTokenAttributes
        } as IDatalogpmAtomToken;
        atomTokensWithAttributes.push(atomToken);
      }

    }

    return atomTokensWithAttributes;
  }

  public getRules(): IDatalogpmAtomToken[] {
    return [];
  }

}

