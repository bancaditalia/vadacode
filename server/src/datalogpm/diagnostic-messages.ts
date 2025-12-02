// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Diagnostic messages for Datalog+/- language parsing (at
 * all levels: lexer, parser, symbols, ...).
 */

import { DiagnosticSeverity } from 'vscode-languageserver';

export enum ErrorTypes {
  ERR_UNUSED_ATOM = "1000",
  ERR_UNEXPECTED_TOKEN_0 = "1001",
  ERR_UNEXPECTED_EOF = "1002",
  ERR_UNEXPECTED_TOKEN = "1003",
  ERR_PARSING_ERROR_EXPECTED_0 = "1004",
  ERR_UNRECOGNIZED_TOKEN_0 = "1005",
  ERR_UNRECOGNIZED_TOKEN = "1006",
  MISSING_0_AT_EOF = "1007",
  MISSING_0_AT = "1008",
  EXTRANEOUS_INPUT_AT_0_EXPECTING_1 = "1009",
  UNKNOWN_PARSING_ERROR_0 = "1010",
  ERR_UNDECLARED_ATOM_0 = "1011",
  ERR_INPUT_ATOM_IN_HEAD_0 = "1012",
  // ERR_INPUT_ATOM_AS_OUTPUT_0 = "1013", Deprecated in favor of ERR_NO_EXTENSIONAL_ATOM_AS_OUTPUT
  ERR_ATOM_0_ALREADY_OUTPUT = "1014",
  ERR_NON_EXISTING_OUTPUT_0 = "1015",
  ERR_VARIABLE_IS_UNWARDED_0 = "1016",
  ERR_NO_BINDINGS_FOR_INPUT_0 = "1017",
  NO_BINDINGS_FOR_OUTPUT_0 = "1018",
  ERR_VARIABLE_IS_EGD_HARMFUL_0 = "1019",
  HINT_EGD_0_1 = "1020",
  ERR_EMPTY_DEFINITION = "1021",
  UNDECLARED_VARIABLE = "1022",
  INVALID_NEGATION_POSITIVE_BODY_0 = "1023",
  ANNOTATION_PARAMETERS = "1024",
  ANONYMOUS_VARIABLE = "1025",
  ATOM_SIGNATURE_TERMS = "1026",
  MAPPING_POSITION_MUST_BE_INDEX = "1027",
  NON_AFRATI_LINEAR_JOIN = "1028",
  EXISTENTIAL_VARIABLE_IN_DATALOG = "1029",
  ERR_ATOM_NOT_IN_GUARDED_RULE = "1030",
  ERR_ATOM_NOT_IN_FRONTIER_GUARDED_RULE = "1031",
  NON_LINEAR_RULE = "1032",
  ERR_ATOM_NOT_IN_WEAKLY_GUARDED_RULE = "1033",
  ERR_ATOM_NOT_IN_WEAKLY_FRONTIER_GUARDED_RULE = "1034",
  ERR_ATOM_NOT_VIOLATING_SHY_S1_CONDITION = "1035",
  ERR_ATOM_NOT_VIOLATING_SHY_S2_CONDITION = "1036",
  ERR_CONSTANT_USED_IN_TAINTED_POSITION = "1037",
  ERR_NO_EXTENSIONAL_ATOM_AS_OUTPUT = "1039",
  ERR_BINDING_ON_UNKNOWN_ATOM = "1040",
  ERR_NO_VARIABLES_IN_FACT = "1041",
  ERR_UNKNOWN_MAPPING_COLUMN_TYPE = "1042",
  ERR_NO_KEYWORD_IN_ATOM_NAME = "1043",
  ERR_VARIABLE_USED_IN_SAME_CONDITION_AS_ASSIGNED = "1044",
  ERR_VARIABLE_IN_TAINTED_POSITION_IS_USED_IN_FILTER_0 = "1045",
  ERR_LITERAL_IN_TAINTED_POSITION = "1046",
  ERR_CYCLE_IN_CONDITION_VARIABLES = "1047"
}

export type DiagnosticMessage = {
  name: string;
  code: ErrorTypes;
  message: string;
  severity: DiagnosticSeverity;
  description?: string;
  examples?: string[];
  fixes?: string[];
  notes?: {
    type: 'caution' | 'tip' | 'warning' | 'important' | 'note';
    value: string;
  }[]
};

export const DIAGNOSTIC_MESSAGES: { [key in ErrorTypes]: DiagnosticMessage } = {
  [ErrorTypes.ERR_UNUSED_ATOM]: {
    name: "Unused atom",
    code: ErrorTypes.ERR_UNUSED_ATOM,
    message: "Unused atom '{atom}'.",
    severity: DiagnosticSeverity.Warning,
    description: "This atom is created but not used in any rule or query. Consider removing it if it's not needed.",
  },
  [ErrorTypes.ERR_UNEXPECTED_TOKEN_0]: {
    name: "Unexpected token",
    code: ErrorTypes.ERR_UNEXPECTED_TOKEN_0,
    message: "Unexpected symbol '{token}'.",
    severity: DiagnosticSeverity.Error,
    description: "This symbol is not expected in this context. Check the syntax of the rule or query.",
  },
  [ErrorTypes.ERR_UNEXPECTED_EOF]: {
    name: "Unexpected end of file",
    code: ErrorTypes.ERR_UNEXPECTED_EOF,
    message: "Unexpected end of file.",
    severity: DiagnosticSeverity.Error,
    description: "The parser reached the end of the file while expecting more input. Check for missing symbols or incomplete rules.",
  },
  [ErrorTypes.ERR_UNEXPECTED_TOKEN]: {
    name: "Unexpected token",
    code: ErrorTypes.ERR_UNEXPECTED_TOKEN,
    message: "Unexpected symbol.",
    severity: DiagnosticSeverity.Error,
    description: "This symbol is not expected in this context. Check the syntax of the rule or query.",
  },
  [ErrorTypes.ERR_PARSING_ERROR_EXPECTED_0]: {
    name: "Parsing error",
    code: ErrorTypes.ERR_PARSING_ERROR_EXPECTED_0,
    message: "Parsing error: '{token}' expected.",
    severity: DiagnosticSeverity.Error,
    description: "The parser expected a different symbol or token. Check the syntax of the rule or query.",
  },
  [ErrorTypes.ERR_UNRECOGNIZED_TOKEN_0]: {
    name: "Unrecognized token",
    code: ErrorTypes.ERR_UNRECOGNIZED_TOKEN_0,
    message: "Unexpected symbol.",
    severity: DiagnosticSeverity.Error,
    description: "This symbol is not recognized by the parser. Check for typos or unsupported syntax.",
  },
  [ErrorTypes.ERR_UNRECOGNIZED_TOKEN]: {
    name: "Unrecognized token",
    code: ErrorTypes.ERR_UNRECOGNIZED_TOKEN,
    message: "Unexpected symbol.",
    severity: DiagnosticSeverity.Error,
    description: "This symbol is not recognized by the parser. Check for typos or unsupported syntax.",
  },
  [ErrorTypes.MISSING_0_AT_EOF]: {
    name: "Missing token at end of file",
    code: ErrorTypes.MISSING_0_AT_EOF,
    message: "Missing '{missing}' at the end of file.",
    severity: DiagnosticSeverity.Error,
    description: "The parser expected a specific symbol at the end of the file. Check for missing symbols or incomplete rules.",
  },
  [ErrorTypes.MISSING_0_AT]: {
    name: "Missing token",
    code: ErrorTypes.MISSING_0_AT,
    message: "Missing '{expectedToken}' before '{currentToken}'.",
    severity: DiagnosticSeverity.Error,
    description: "The parser expected a specific symbol before the current position. Check for missing symbols or incomplete rules.",
  },
  [ErrorTypes.EXTRANEOUS_INPUT_AT_0_EXPECTING_1]: {
    name: "Extraneous input",
    code: ErrorTypes.EXTRANEOUS_INPUT_AT_0_EXPECTING_1,
    message: "Unexpected symbol '{extraneous}' (expecting '{expecting}').",
    severity: DiagnosticSeverity.Error,
    description: "The parser encountered an unexpected symbol while expecting another one. Check for typos or unsupported syntax.",
  },
  [ErrorTypes.UNKNOWN_PARSING_ERROR_0]: {
    name: "Unknown parsing error",
    code: ErrorTypes.UNKNOWN_PARSING_ERROR_0,
    message: "Unknown parsing error: {message}.",
    severity: DiagnosticSeverity.Error,
    description: "An unknown error occurred during parsing. This may be due to a bug in the parser or an unsupported syntax.",
  },
  [ErrorTypes.ERR_UNDECLARED_ATOM_0]: {
    name: "Undeclared atom",
    code: ErrorTypes.ERR_UNDECLARED_ATOM_0,
    message: "Undeclared atom: {atom}.",
    severity: DiagnosticSeverity.Error,
    description: "This atom is used in a rule or query but has not been declared. Declare the atom to use it, either as a fact (a rule with no head and only constants, like `person(\"First Name\", \"Last Name\", 37).`) or by importing it with `@input`.",
    notes: [{
      type: "tip",
      value: "You can declare an atom by making it a fact, importing it with `@input` or creating it in the head of a rule.",
    }]
  },
  [ErrorTypes.ERR_INPUT_ATOM_IN_HEAD_0]: {
    name: "Input atom in head",
    code: ErrorTypes.ERR_INPUT_ATOM_IN_HEAD_0,
    message: "Atom '{atom}' is used in rule head and as an input. Do you want to create a new atom instead?",
    severity: DiagnosticSeverity.Warning,
    description: "This atom is used in the head of a rule and as an input. This may cause confusion or unintended behavior. Consider creating a new atom instead.",
  },
  [ErrorTypes.ERR_ATOM_0_ALREADY_OUTPUT]: {
    name: "Duplicate output atom",
    code: ErrorTypes.ERR_ATOM_0_ALREADY_OUTPUT,
    message: "Duplicate @output for atom '{atom}'.",
    severity: DiagnosticSeverity.Error,
    description: "This atom is already declared as an output. You cannot declare it again. Remove the duplicate declaration.",
  },
  [ErrorTypes.ERR_NON_EXISTING_OUTPUT_0]: {
    name: "Non-existing output atom",
    code: ErrorTypes.ERR_NON_EXISTING_OUTPUT_0,
    message: "Atom '{atom}' has not been declared but is being used as an output.",
    severity: DiagnosticSeverity.Error,
    description: "This atom is used as an output but has not been declared as such. Check the spelling of atom name or declare it the head of a rule to output it.",
  },
  [ErrorTypes.ERR_VARIABLE_IS_UNWARDED_0]: {
    name: "Unwarded variable",
    code: ErrorTypes.ERR_VARIABLE_IS_UNWARDED_0,
    message:
      "Variable '{variable}' is dangerous and involved in a join; the program is not Warded Datalog±.",
    severity: DiagnosticSeverity.Error,
    description: "This error occurs because the Datalog+/- program violates the wardedness property, which is a key safety condition in Warded Datalog±.",
  },
  [ErrorTypes.ERR_NO_BINDINGS_FOR_INPUT_0]: {
    name: "No bindings for input",
    code: ErrorTypes.ERR_NO_BINDINGS_FOR_INPUT_0,
    message:
      "Input '{atom}' has no bindings. Add @bind and @mapping rules.",
    severity: DiagnosticSeverity.Warning,
    description: `This \`@input\` atom has no bindings. You need to add \`@bind\` and \`@mapping\` rules to bind the input atom to a data source. To fix it, add a \`@bind\` rule to bind the input atom to a data source, and a \`@mapping\` rule to map the columns of the data source to the terms of the input atom. 
    
Example:

[source,datalogpm]
----
@input("atom").
@bind("atomName", "data source", "outermost container", "innermost container").
@mapping("atomName", column1positionInAtom, "column1Name", "column1Type").
@mapping("atomName", column2positionInAtom, "column2Name", "column2Type").
----
`,
  },
  [ErrorTypes.NO_BINDINGS_FOR_OUTPUT_0]: {
    name: "No bindings for output",
    code: ErrorTypes.NO_BINDINGS_FOR_OUTPUT_0,
    message:
    "Output '{atom}' has no bindings, output will be sent with the response.",
    severity: DiagnosticSeverity.Hint,
    description: "This `@output` atom has no bindings. The output will be sent with the response, but you may want to add bindings to control the output.",
  },
  [ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0]: {
    name: "Variable is EGD harmful",
    code: ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0,
    message:
    "Variable '{variable}' is in a tainted position and used in join or filter operation. The program does not satisfy the EGDs harmless sufficient condition.",
    severity: DiagnosticSeverity.Error,
    description: "This error arises because the program violates the _safe taintedness_ condition for Equality-Generating Dependencies (EGDs)."
  },
  [ErrorTypes.HINT_EGD_0_1]: {
    name: "EGD hint",
    code: ErrorTypes.HINT_EGD_0_1,
    message:
    "Equality-generating dependency: existential variables are made equal in the reasoning process.",
    severity: DiagnosticSeverity.Hint,
    description: "This hint indicates that the head of the rule contains an equality-generating dependency (EGD) that can lead to existential variables being made equal during reasoning.",
  },
  [ErrorTypes.ERR_EMPTY_DEFINITION]: {
    name: "Empty definition",
    code: ErrorTypes.ERR_EMPTY_DEFINITION,
    message:
    "Definition can't be empty.",
    severity: DiagnosticSeverity.Error,
    description: "The annotation requires at least one term.",
    examples: ['% Here the definition is empty\n@input().'],
    fixes: ['@input("atom").'],
  },
  [ErrorTypes.UNDECLARED_VARIABLE]: {
    name: "Undeclared variable",
    code: ErrorTypes.UNDECLARED_VARIABLE,
    message:
    "Variable '{variable}' is not bound. Bind it either in a positive atom or in an assignment.",
    severity: DiagnosticSeverity.Error,
    description: "Variables used in conditions must be bound in a positive atom or in an assignment.",
  },
  [ErrorTypes.INVALID_NEGATION_POSITIVE_BODY_0]: {
    name: "Invalid negation",
    code: ErrorTypes.INVALID_NEGATION_POSITIVE_BODY_0,
    message:
    "Variable '{variable}' does not occur in a non-negated body atom. Every variable that occurs in the head and in a body negation must have a binding in a non-negated atom.",
    severity: DiagnosticSeverity.Error, 
    description: "If a variable occurs in the head of a rule and is also used in a negated body atom, it must have a binding in a non-negated body atom. For example, if 'X' is in the head and 'not p(X)' is in the body, there must be another atom like 'p(X)' in the body.",
    examples: ['% Here X is not bound in a non-negated body atom\na(X) :- not b(X).'],
    fixes: ['a(X) :- c(X), not b(X).'],
  },
  [ErrorTypes.ANNOTATION_PARAMETERS]: {
    name: "Annotation parameters",
    code: ErrorTypes.ANNOTATION_PARAMETERS,
    message:
    "Expected {expected} arguments, but got {received}.",
    severity: DiagnosticSeverity.Error,
    description: "The number of arguments in the annotation must match the expected number. For example, if the annotation is '@mapping', it should have the correct number of arguments as defined in the specification.",
    examples: ['% @mapping requires 4 terms\n@mapping("atom", 0, "id").'],
    fixes: ['@mapping("atom", 0, "id", "int").'],
  },
  [ErrorTypes.ANONYMOUS_VARIABLE]: {
    name: "Anonymous variable",
    code: ErrorTypes.ANONYMOUS_VARIABLE,
    message:
    "Variable {variable} is not used in the head. You should make it anonymous (replacing it with an `_`).",
    severity: DiagnosticSeverity.Warning,
    description: "If a variable is not used in the head of a rule, it should be replaced with an underscore ('_') to indicate that it is anonymous. For example, instead of using 'X' in the head, use '_' if 'X' is not used.",
  },
  [ErrorTypes.ATOM_SIGNATURE_TERMS]: {
    name: "Atom signature terms",
    code: ErrorTypes.ATOM_SIGNATURE_TERMS,
    message:
    "Expected {expected} terms, but got {received}.",
    severity: DiagnosticSeverity.Error,
    description: "The number of terms in the atom's signature must match the number of terms in the atom. For example, if the atom is 'p(X,Y)', then the signature must have 2 terms, not 3. If the missing variable need not to be brought to the head, you can use the anonymous variable _ to mark them.",
  },
  [ErrorTypes.MAPPING_POSITION_MUST_BE_INDEX]: {
    name: "Mapping position must be an index",
    code: ErrorTypes.MAPPING_POSITION_MUST_BE_INDEX,
    message:
    "Mapping position must be an index (0-based) (instead it's '{position}').",
    severity: DiagnosticSeverity.Error,
    description: "The mapping position must be an index (0-based) that indicates the position of the term in the atom's signature. For example, if the atom is 'p(X,Y)', then the mapping position can be 0 or 1, but not 2.",
    examples: ['% Here position is "pos"\n@mapping("atom", "pos", "id", "int").'],
    fixes: ['@mapping("atom", 0, "id", "int").'],
  },
  [ErrorTypes.NON_AFRATI_LINEAR_JOIN]: {
    name: "Non-Afrati linear join",
    code: ErrorTypes.NON_AFRATI_LINEAR_JOIN,
    message:
    "Rule is not AfratiLienar: predicate '{atom}' is intensional and appears in the body of a rule with another intensional predicate.",
    severity: DiagnosticSeverity.Error,
    description: "Non-Afrati linear join. A _linear_ program is a Datalog program such that every clause in the program has at most one intensional atom in its body.",
  },
  [ErrorTypes.EXISTENTIAL_VARIABLE_IN_DATALOG]: {
    name: "Existential variable in Datalog",
    code: ErrorTypes.EXISTENTIAL_VARIABLE_IN_DATALOG,
    message:
    "Existential variable '{variable}' is used in a Datalog rule. This is not allowed.",
    severity: DiagnosticSeverity.Error,
    description: "In Datalog, existential variables are not allowed. If you need to use an existential variable, consider using other fragments instead.",
  },
  [ErrorTypes.ERR_ATOM_NOT_IN_GUARDED_RULE]: {
    name: "Atom not in guarded rule",
    code: ErrorTypes.ERR_ATOM_NOT_IN_GUARDED_RULE,
    message:
    "Rule is not Guarded, as there is no atom in the body including all universally quantified variables.",
    severity: DiagnosticSeverity.Error,
    description: "The atom is not in a Guarded rule, which is a rule that has a guard. A guard is an atom that contains all the universally quantified variables of the rule.",
  },
  [ErrorTypes.ERR_ATOM_NOT_IN_FRONTIER_GUARDED_RULE]: {
    name: "Atom not in frontier guarded rule",
    code: ErrorTypes.ERR_ATOM_NOT_IN_FRONTIER_GUARDED_RULE,
    message:
    "Rule is not Frontier Guarded, as there is no atom in the body including all universally quantified variables of the head.",
    severity: DiagnosticSeverity.Error,
    description: "The atom is not in a Frontier Guarded rule, which is a rule that has a frontier guard. A frontier guard is an atom that contains all the universally quantified variables of the rule head.",
  },
  [ErrorTypes.NON_LINEAR_RULE]: {
    name: "Non-linear rule",
    code: ErrorTypes.NON_LINEAR_RULE,
    message:
    "Rule is not linear, since there are multiple atoms in the body.",
    severity: DiagnosticSeverity.Error,
    description: "The rule contains more than one atom in the body, which is not allowed in linear Datalog programs.",
  },
  [ErrorTypes.ERR_ATOM_NOT_IN_WEAKLY_GUARDED_RULE]: {
    name: "Rule is not Weakly Guarded",
    code: ErrorTypes.ERR_ATOM_NOT_IN_WEAKLY_GUARDED_RULE,
    message:
    "Rule is not Weakly Guarded, as there is no atom in the body including all dangerous variables.",
    severity: DiagnosticSeverity.Error,
    description: "Rule is not Weakly Guarded but because it misses a weak guard atom. A weak guard is an atom that contains all the dangerous universally quantified variables.",
  },
  [ErrorTypes.ERR_ATOM_NOT_IN_WEAKLY_FRONTIER_GUARDED_RULE]: {
    name: "Rule is not Weakly Frontier Guarded",
    code: ErrorTypes.ERR_ATOM_NOT_IN_WEAKLY_FRONTIER_GUARDED_RULE,
    message:
    "Rule is not Weakly Frontier Guarded, as there is no atom in the body including all dangerous variables in the head.",
    severity: DiagnosticSeverity.Error,
    description: "Rule is not Weakly Frontier Guarded but because it misses a weak guard atom. A weak guard is an atom that contains all the dangerous universally quantified variables.",
  },
  [ErrorTypes.ERR_ATOM_NOT_VIOLATING_SHY_S1_CONDITION]: {
    name: "Variable violating SHY S1 condition",
    code: ErrorTypes.ERR_ATOM_NOT_VIOLATING_SHY_S1_CONDITION,
    message:
    "Rule is not Shy: Variable '{variable}' occurs in more than one body atom and is not protected in the body of the rule.",
    severity: DiagnosticSeverity.Error
  },
  [ErrorTypes.ERR_ATOM_NOT_VIOLATING_SHY_S2_CONDITION]: {
    name: "Variable violating SHY S2 condition",
    code: ErrorTypes.ERR_ATOM_NOT_VIOLATING_SHY_S2_CONDITION,
    message:
    "Rule is not Shy: Two distinct ∀-variables, that are not protected in the body of the rule and occur both in head and in two different body atoms, are attacked by the same invading variable.",
    severity: DiagnosticSeverity.Error,
  },
  [ErrorTypes.ERR_CONSTANT_USED_IN_TAINTED_POSITION]: {
    name: "Constant used in tainted position",
    code: ErrorTypes.ERR_CONSTANT_USED_IN_TAINTED_POSITION,
    message:
    "No constants are allowed in tainted positions to guarantee Safe taintedness condition.",
    severity: DiagnosticSeverity.Error
  },
  [ErrorTypes.ERR_NO_EXTENSIONAL_ATOM_AS_OUTPUT]: {
    name: "No extensional atom as output",
    code: ErrorTypes.ERR_NO_EXTENSIONAL_ATOM_AS_OUTPUT,
    message:
    "Extensional atoms cannot be used as outputs.",
    severity: DiagnosticSeverity.Error,
    description: "In Datalog+/-, extensional atoms cannot be used as outputs. If you want to output extensional data, create a copy rule that transforms the extensional atom into an intensional one.",
  },
  [ErrorTypes.ERR_BINDING_ON_UNKNOWN_ATOM]: {
    name: "Binding on unknown atom",
    code: ErrorTypes.ERR_BINDING_ON_UNKNOWN_ATOM,
    message:
    "Bindings must be specified for either @input or @output atoms. Check if you mispelled the atom name, or add the missing @input or @output annotation.",
    severity: DiagnosticSeverity.Error,
  },
  [ErrorTypes.ERR_NO_VARIABLES_IN_FACT]: {
    name: "No variables in fact",
    code: ErrorTypes.ERR_NO_VARIABLES_IN_FACT,
    message:
    "Variables are not allowed in facts.",
    severity: DiagnosticSeverity.Error,
    description: "In Datalog+/-, facts cannot contain variables. Replace variables with constants.",
  },
  [ErrorTypes.ERR_UNKNOWN_MAPPING_COLUMN_TYPE]: {
    name: "Unknown mapping column type",
    code: ErrorTypes.ERR_UNKNOWN_MAPPING_COLUMN_TYPE,
    message:
    "Column type '{columnType}' is not recognized. Use one of the supported types: string, integer, double, date, boolean, set, list, unknown.",
    severity: DiagnosticSeverity.Error
  },
  [ErrorTypes.ERR_NO_KEYWORD_IN_ATOM_NAME]: {
    name: "No keyword in atom name",
    code: ErrorTypes.ERR_NO_KEYWORD_IN_ATOM_NAME,
    message:
    "Atom name contains reserved keyword {keyword}.",
    severity: DiagnosticSeverity.Error
  },
  [ErrorTypes.ERR_VARIABLE_USED_IN_SAME_CONDITION_AS_ASSIGNED]: {
    name: "Variable used in same condition as assigned",
    code: ErrorTypes.ERR_VARIABLE_USED_IN_SAME_CONDITION_AS_ASSIGNED,
    message:
    "Variable is used in the same condition where it is assigned.",
    severity: DiagnosticSeverity.Error,
  },
  [ErrorTypes.ERR_VARIABLE_IN_TAINTED_POSITION_IS_USED_IN_FILTER_0]: {
    name: "Variable in tainted position is used in filter",
    code: ErrorTypes.ERR_VARIABLE_IN_TAINTED_POSITION_IS_USED_IN_FILTER_0,
    message:
    "Variable '{variable}' is in a tainted position and used in a filter operation.",
    severity: DiagnosticSeverity.Error,
  },
  [ErrorTypes.ERR_LITERAL_IN_TAINTED_POSITION]: {
    name: "Literal is tainted position",
    code: ErrorTypes.ERR_LITERAL_IN_TAINTED_POSITION,
    message:
    "Literal '{literal}' is used in a tainted position.",
    severity: DiagnosticSeverity.Error,
  },
  [ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES]: {
    name: "Cycle in condition variables",
    code: ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES,
    message:
    "Cycle detected in condition variables dependencies ({variables}).",
    severity: DiagnosticSeverity.Error,
    description: "A cycle has been detected in the dependencies of condition variables. Review the conditions and variable assignments to eliminate cycles.",
  }
  

};
