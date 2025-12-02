// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Common types and enums for Datalog+/- language support.
 */

import { Range } from "vscode-languageserver-textdocument";
import { URI } from "vscode-languageserver/node";

/**
 * Enumeration of Datalog+/- semantic token types.
 */
export enum DatalogpmTokenType {
  COMMENT = "comment",
  ATOM = "atom",
  INT = "int",
  DOUBLE = "double",
  DATE = "date",
  STRING = "string",
  BOOLEAN = "boolean",
  VARIABLE = "variable",
  ANNOTATION = "annotation",
  AT = "at",
  ID = "id",
  ANON_VAR = "anon_var",
  IMPLICATION = "implication",
  EQ = "eq",
  DOT = "dot",
  LIST = "list",
  SET = "set",
  UNKNOWN = "unknown",
}

/**
 * Enumeration of Datalog+/- semantic token modifiers.
 */
export enum DatalogpmTokenModifier {
  // An expression is unused if it does not appear in the body of any atom or
  // is not exported in output.
  UNUSED = "unused",
  // An expression is ground if it does not contain any variables.
  GROUND = "ground",
  // An atom is temporal if it has temporal annotations
  TEMPORAL = "temporal",
  // A variable is existential if its in the head but not in the body
  EXISTENTIAL = "existential",
}

/**
 * Enumeration of Datalog+/- token tags.
 */
export type TokenTag = "head" | "body" | "definition";

/**
 * Interface representing a Datalog+/- token.
 */
export interface IDatalogpmToken {
  line: number;
  column: number;
  length: number;
  uri?: URI;
  text: string;
  type: DatalogpmTokenType;
  modifiers: DatalogpmTokenModifier[];
  tags: Set<TokenTag>;
}

/*
 * Interface representing a Datalog+/- variable attributes (which come analyzers).
 */
export interface IDatalogpmVariableAttributes {
  name: string;
  rule: IDatalogpmRuleToken;

  existential: boolean;

  harmless: boolean;
  harmful: boolean;
  dangerous: boolean;

  protected_: boolean;
  attackedBy: IDatalogpmToken[];
}

/**
 * Interface representing a Datalog+/- atom attributes (which come from analyzers).
 */
export interface IDatalogpmAtomAttributes {
  isEDB: boolean;
  isIDB: boolean;
}

/**
 * Interface representing a Datalog+/- atom token attributes (which come from analyzers).
 */
export interface IDatalogpmAtomTokenAttributes {
  guard?: boolean;
  frontierGuard?: boolean;
  weakGuard: boolean;
  weakFrontierGuard: boolean;
  existentialVariables: string[];
}

/**
 * Interface representing a Datalog+/- rule attributes (which come from analyzers).
 */
export interface IDatalogpmRuleAttributes {
  rule: IDatalogpmRuleToken;

  existential: boolean;

  harmless: boolean;
  harmful: boolean;
  dangerous: boolean;

  protected_: boolean;
  attackedBy: IDatalogpmToken[];
}

/**
 * Interfaces combining IDatalogpmToken with specific attributes, 
 * used to represent a variable in the program graph.
 */
export interface IDatalogpmVariableToken extends IDatalogpmToken, IDatalogpmVariableAttributes {}

/**
 * Interfaces combining IDatalogpmToken with specific attributes,
 * used to represent an atom in the program graph.
 */
export interface IDatalogpmAtomToken extends IDatalogpmToken, IDatalogpmAtomAttributes, IDatalogpmAtomTokenAttributes {}

/**
 * Interfaces combining IDatalogpmToken with specific attributes,
 * used to represent a rule in the program graph.
 */
export interface IDatalogpmRuleToken extends IDatalogpmToken, IDatalogpmRuleAttributes {}

/**
 * Returns VSCode Range for a given Datalog+/- token.
 * @param token 
 * @returns 
 */
export function getTokenRange(token: IDatalogpmToken): Range {
  return {
    start: { line: token.line, character: token.column },
    end: { line: token.line, character: token.column + token.length },
  } as Range;
}

export interface IDatalogpmTokenTag {
  /// Unused placeholder to avoid empty interface error
  placeholder: string;
}

/**
 * Class representing a tag for a token that is a reference to an atom.
 */
export class AtomReferenceTokenTag implements IDatalogpmTokenTag {
  atom: string;
  constructor(atom: string) {
    this.atom = atom;
  }
  placeholder = "string";
}

/**
 * Marks the source of a Datalog+/- signature in a program.
 */
export enum DatalogpmSignatureSource {
  DOCUMENTATION = "documentation",
  USAGE = "usage",
  FACT = "fact",
  INPUT = "input",
}

/**
 * Interface representing help information for a term signature.
 */
export interface DatalogpmSignatureTermHelp {
  label: string;
  documentation: string;
  token?: IDatalogpmToken;
  type?: DatalogpmTokenType;
}

/**
 * Interface representing help information for an atom signature.
 */
export interface AtomSignatureHelp {
  name: string;
  signature: string;
  documentation: string;
  token?: IDatalogpmAtomToken;
  terms: DatalogpmSignatureTermHelp[];
  source: DatalogpmSignatureSource
}

/**
 * Interface representing help information for an annotation signature.
 */
export interface AnnotationSignatureHelp {
  name: string;
  signature: string;
  documentation: string;
  token?: IDatalogpmToken;
  terms: DatalogpmSignatureTermHelp[];
}

/**
 * Type representing either an atom or annotation signature help.
 */
export type DatalogpmSignatureHelp = AtomSignatureHelp | AnnotationSignatureHelp;

/**
 * Interface representing metadata for a variable, used as an
 * interface in Hover factory.
 */
export interface VariableMetadata {
  name: string;
  existential: boolean;
  markedNull: boolean;
  harmful: boolean;
  dangerous: boolean;
  usedInTaintedJoin: boolean;
}

/**
 * Enumeration representing the visit status of an equality condition.
 */
export enum EqualityConditionVisitStatus {
  NOT_VISITING,
  VISITING_LEFT_HAND_SIDE,
  VISITING_RIGHT_HAND_SIDE,
}

/**
 * Class representing a call to an annotation.
 */
export class AnnotationCall {
  atom?: IDatalogpmToken;
  terms: IDatalogpmToken[] = [];

  constructor(atom?: IDatalogpmToken) {
    this.atom = atom;
  }

  addTerm(term: IDatalogpmToken) {
    this.terms.push(term);
  }
}

/**
 * Enumeration representing the type of an atom call.
 */
export enum AtomCallType {
  ATOM_CALL_TYPE_HEAD,
  ATOM_CALL_TYPE_BODY,
  ATOM_CALL_TYPE_FACT,
  ATOM_CALL_TYPE_INPUT,
  ATOM_CALL_TYPE_OUTPUT,
}

/**
 * Class representing a call to an atom.
 */
export class AtomCall {
  name: string;
  atom: IDatalogpmToken;
  call_type: AtomCallType;
  terms: IDatalogpmToken[] = [];

  constructor(name: string, atom: IDatalogpmToken, head: AtomCallType) {
    this.name = name;
    this.atom = atom;
    this.call_type = head;
  }

  addTerm(term: IDatalogpmToken) {
    this.terms.push(term);
  }
}

/**
 * Interface representing a Datalog+/- mapping from VSCode
 * semantic tokens to position in source code.
 */
export interface DatalogpmMapping {
  token: IDatalogpmToken;
  atomName: string;
  position: number;
  columnName: string;
  columnType: string;
}

/**
 * Interface representing a Datalog+/- binding.
 */
export interface DatalogpmGenericBinding {
  input: boolean;
  inputToken: IDatalogpmToken;
  token: IDatalogpmToken;
  atomName: string;
}


/**
 * Interface representing a Datalog+/- binding.
 */
export interface DatalogpmBinding extends DatalogpmGenericBinding {
  dataSource: string;
  outermostContainer: string;
  innermostContainer: string;
}

/**
 * Interface representing a Datalog+/- query binding.
 */
export interface DatalogpmQueryBinding extends DatalogpmGenericBinding {
  dataSource: string;
  outermostContainer: string;
  query: string;
}

/**
 * URL template for VadaCode manual diagnostic codes,
 * used to link diagnostics to their documentation.
 */
export const VADACODE_MANUAL_DIAGNOSTIC_URL = `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#{diagnosticCode}`;

/**
 * Enumeration representing types of aggregations in Datalog+/-.
 */
export enum AggregationType {
  MSUM = "msum",
  MPROD = "mprod",
  MCOUNT = "mcount",
  MUNION = "munion",
  MMAX = "mmax",
  MMIN = "mmin",
  UNION = "union",
  LIST = "list",
  SET = "set",
  MIN = "min",
  MAX = "max",
  SUM = "sum",
  PROD = "prod",
  AVG = "avg",
  COUNT = "count",
}
