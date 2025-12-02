// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Datalog+/- program analyzer implemented using
 *       an ANTLR4 tree walker.
 */

import { Block, Spec } from "comment-parser";
import Container from "typedi";
import { AtomContext } from "datalogpm-parser/out/grammar/DatalogpmParser";
import { Diagnostic, Range } from "vscode-languageserver/node";
import { ParserRuleContext, Token, DatalogpmListener, DatalogpmParser } from "../../../datalogpm-parser/out";
import { CommentParserService } from "../comment-parser.service";
import { makeDiagnostic } from '../diagnostics/utils';
import { AnonymousVariablesAnalyzer } from './analyzers/anonymous_variables.analyzer';
import { AssignedVariableUsedInSameConditionAnalyzer } from './analyzers/assigned-variable-used-in-same-condition';
import { BindOnUnknownAnalyzer } from './analyzers/bind-on-unknown';
import { AfratiLinearFragmentAnalyzer } from './analyzers/fragment/afrati-linear.fragment';
import { FrontierGuardedFragmentAnalyzer } from './analyzers/fragment/frontier-guarded.fragment';
import { GuardedFragmentAnalyzer } from './analyzers/fragment/guarded.fragment';
import { LinearFragmentAnalyzer } from './analyzers/fragment/linear.fragment';
import { PlainDatalogFragmentAnalyzer } from './analyzers/fragment/plain-datalog.fragment';
import { ShyFragmentAnalyzer } from './analyzers/fragment/shy.fragment';
import { WardedFragmentAnalyzer } from './analyzers/fragment/warded.fragment';
import { WeaklyFrontierGuardedFragmentAnalyzer } from './analyzers/fragment/weakly-frontier-guarded.fragment';
import { WeaklyGuardedFragmentAnalyzer } from './analyzers/fragment/weakly-guarded.fragment';
import { GroundSemanticTagger } from './analyzers/ground-semantic-tagger';
import { NegationAnalyzer } from './analyzers/negation.analyzer';
import { NoFactOutputAnalyzer } from './analyzers/no-fact-output.analyzer';
import { NoKeywordInAtomNamesAnalyzer } from './analyzers/no-keyword-in-atom.analyzer';
import { NoVariablesInFactAnalyzer } from './analyzers/no-variables-in-fact.analyzer';
import { ProgramGraphAnalyzer } from './analyzers/program-graph-analyzer';
import {
  AggregationType,
  AnnotationCall,
  AtomCall,
  AtomCallType,
  EqualityConditionVisitStatus,
  IDatalogpmToken,
  TokenTag,
  DatalogpmBinding,
  DatalogpmGenericBinding,
  DatalogpmMapping,
  DatalogpmQueryBinding,
  DatalogpmTokenModifier,
  DatalogpmTokenType
} from "./common";
import { DependencyGraph } from "./dependency-graph";
import { ErrorTypes } from "./diagnostic-messages";
import { AtomLocation, ProgramGraph } from "./program-graph";
import { difference, union } from './set-utils';
import { ConditionVariablesAnalyzer } from './analyzers/condition-variables.analyzer';

/**
 * Implementation of an ANTLR4 `ParseTreeListener` for the analysis of a Datalog+/- program.
 */
export class VadacodeTreeWalker extends DatalogpmListener.default {
  // Pretty ugly way to avoid overlapping tokens, as we mark them
  // for suppression because inner functions (e.g. addInputToken)
  // create their own in the program graph.
  _suppressedTokens: IDatalogpmToken[] = [];
  suppressToken(termToken: IDatalogpmToken) {
    this._suppressedTokens.push(termToken);
  }

  /** Semantic tokens */
  antlrTokens: IDatalogpmToken[] = [];

  diagnostics: Diagnostic[] = [];

  _analyzers: ProgramGraphAnalyzer[] = [];

  // Symbol tables
  /** Set of @output atom names. */
  outputAtomsNames = new Set<string>();
  /** Set of @input atom names. */
  inputAtomNames = new Set<string>();
  /** Set of @bind atom names. */
  atomBindings = new Set<string>();
  /** Set of atom names. */
  atomNames = new Set<string>();
  /** Set of atoms appearing in rule bodies. */
  atomNamesAppearingInTheBody = new Set<string>();
  /** Set of atoms appearing in rule heads. */
  atomNamesAppearingInTheHead = new Set<string>();
  /** Set of atoms appearing in ground facts. */
  atomNamesAppearingInFact = new Set<string>();
  /** Set of atoms in recursive rules. */
  atomNamesAppearingBothInBodyAndHead = new Set<string>();
  temporalAtoms = new Set<string>();
  /** Set of atoms appearing as @exports. */
  atomNamesAppearingAsExports = new Set<string>();

  mappings: { [atomName: string]: DatalogpmMapping[] } = {};
  // FIXME: Currently Vadacode assumes a single binding per atom
  //        (multiple should be allowed).
  bindings: { [atomName: string]: DatalogpmGenericBinding } = {};
  

  atomReferences: { [atomName: string]: IDatalogpmToken[] } = {};
  /**
   * A dictionary whose keys are atom names and values are arrays of tokens referencing that atom name.
   *
   * @remarks: atom tokens mentioned in @output and @input annotations are considered without quotes.
   */
  atomTokens: { [atomName: string]: IDatalogpmToken[] } = {};

  existentialVariableTokens: IDatalogpmToken[] = [];
  markedNullVariableTokens: IDatalogpmToken[] = [];
  harmfulVariableTokens: IDatalogpmToken[] = [];
  dangerousVariableTokens: IDatalogpmToken[] = [];
  usedInTaintedJoinVariableTokens: IDatalogpmToken[] = [];
  undeclaredVariableTokens: IDatalogpmToken[] = [];
  inHeadAndOnlyInNegatedBody: IDatalogpmToken[] = [];

  egdTokens: IDatalogpmToken[] = [];
  emptyDefinitionInAnnotationTokens: IDatalogpmToken[] = [];

  atomDependencyGraph = new DependencyGraph();

  annotationCalls: AnnotationCall[] = [];
  atomCalls: AtomCall[] = [];

  moduleName?: string;

  // Visiting flags
  /** Last exited atom, used to know which atom a temporalAnnotation is referred. */
  lastExitedAtom?: string;
  /** Whether we are in an annotation body. */
  visitingAnnotationBody = false;
  /** Whether we are visiting a negated literal (atom). */
  visitingNegationLiteral = false;
  /** Whether we are visiting a body */
  visitingBody = false;
  /** Whether we are visiting a head */
  visitingHead = false;
  /** Whether we are visiting a fact */
  visitingFact = false;
  /** Whether we are visiting a head */
  atomInHeadBeingVisited: IDatalogpmToken | undefined;
  /** Whether we are visiting en eqCondition 
   *  and if we are visiting the left or the
   *  right hand side (used to distinguish
   *  equalities and assignments). */
  visitingEqualityCondition = EqualityConditionVisitStatus.NOT_VISITING;

  /** Duplicate @output declarations for an atom encountered during visit. */
  duplicateOutputRules: { [atomName: string]: IDatalogpmToken[] } = {};
  /** Atoms marked as outputs. */
  outputAtomTokens: { [atomName: string]: IDatalogpmToken[] } = {};
  /** Atoms marked as inputs. */
  inputAtomTokens: { [atomName: string]: IDatalogpmToken[] } = {};

  /** Atom documentation blocks in Vadoc format. */
  atomVadocBlocks: { [atomName: string]: Block } = {};

  /**
   * Index of the last rule being visited, 0-based.
   * If -1, no atom is being visited (e.g. we're in a comment).
   */
  idOfRuleBeingVisited = -1;
  /** Number of discovered rules (until now). */
  numberOfRules = 0;
  /**
   * Name of the atom being visited.
   * If empty, no atom is being visited (e.g. we're in a comment, or in a condition).
   */
  atomTokenBeingVisited: IDatalogpmToken | undefined;
  /**
   * Whether we are visiting an EGD or not.
   * If -1, no EGD is being visited (e.g. we're in an atom or in the body).
   */
  egdBeingVisited = -1;
  lastVisitedEGD = -1;
  /**
   * Index of the term being visited, 0-based.
   * If -1, no term is being visited (e.g. we're in a comment).
   */
  termPositionBeingVisited = -1;

  conditionBeingVisited = -1;
  lastVisitedCondition = -1;

  /**
   * Index of the conjunctive query term being visited (typically atoms), 0-based.
   * If -1, no term is being visited (e.g. we're in the head or in a comment).
   */
  bodyConjunctiveQueryTerm = -1;

  /**
   * Index of the current aggregation being visited, 0-based.
   * If greater that or equal to 0, we have visited an aggregation,
   * but there is no guarantee that we are still visiting it 
   * (e.g., we could be in a different context).
   */
  currentAggregationIndex = -1;

  /** 
   * Context of the current collection being visited.
   * If null, no collection is being visited.
   * This is used to detect correctly term count in
   * atom/annotation calls.
   */
  collectionBeingVisited: ParserRuleContext | null = null;

  /**
   * Tokens with unknown mapping column types coming from
   * @mapping annotations, used for diagnostics.
   */
  unknownMappingColumnTypeTokens: IDatalogpmToken[] = [];


  activeBlockComment: string | undefined;

  programGraph = new ProgramGraph();

  wardedAnalyzer: WardedFragmentAnalyzer;

  /**
   * Constructor.
   * @param tokens Takes a list of Datalog+/- tokens as they are output by ANTLR to be updated.
   */
  constructor(tokens: IDatalogpmToken[]) {
    super();
    this.antlrTokens = tokens;

    this.wardedAnalyzer = new WardedFragmentAnalyzer();

    // Duplicates NoFactOutputAnalyzer functionality so it can be removed
    // this._analyzers.push(new InputToOutputAnalyzer());

    this._analyzers.push(new GroundSemanticTagger());
    // Requires ground semantic tagger to be run first
    this._analyzers.push(new NoFactOutputAnalyzer());

    this._analyzers.push(new BindOnUnknownAnalyzer());

    this._analyzers.push(new NoVariablesInFactAnalyzer());
    this._analyzers.push(new AnonymousVariablesAnalyzer());
    this._analyzers.push(new NegationAnalyzer());

    // NOTE: this analyzer can't currently kick in because
    // the parser breaks before when encountering keywords in 
    // atom names.
    this._analyzers.push(new NoKeywordInAtomNamesAnalyzer());

    this._analyzers.push(new AssignedVariableUsedInSameConditionAnalyzer());

    this._analyzers.push(new ConditionVariablesAnalyzer());

    // Fragment analyzers
    this._analyzers.push(new PlainDatalogFragmentAnalyzer());
    this._analyzers.push(new LinearFragmentAnalyzer());
    this._analyzers.push(new AfratiLinearFragmentAnalyzer());
    this._analyzers.push(this.wardedAnalyzer);
    this._analyzers.push(new GuardedFragmentAnalyzer());
    this._analyzers.push(new WeaklyGuardedFragmentAnalyzer());
    this._analyzers.push(new FrontierGuardedFragmentAnalyzer());
    this._analyzers.push(new WeaklyFrontierGuardedFragmentAnalyzer());
    this._analyzers.push(new ShyFragmentAnalyzer());
  }

  /**
   * Finds a Vadacode token by line and column numbers.
   * @param line
   * @param column
   * @returns Vadacode token
   */
  private _findTokenByLineAndColumn(
    line: number,
    column: number
  ): IDatalogpmToken | undefined {
    return this.antlrTokens.find(
      (token: IDatalogpmToken) => token.line == line && token.column == column
    );
  }

  /**
   * Annotation body listener (like @name).
   * @param ctx Parse context.
   */
  enterAnnotationBody = (ctx: DatalogpmParser.AnnotationBodyContext): void => {

    this.visitingAnnotationBody = true;

    // Mark AT symbol as an annotation
    const atToken = ctx.AT().symbol;
    const annotationAtToken = this._findTokenByLineAndColumn(
      atToken.line - 1,
      atToken.column
    );
    if (annotationAtToken) {
      annotationAtToken.type = DatalogpmTokenType.ANNOTATION;
    }

    // Mark name as an annotation
    const atomToken = ctx.atom().ID().symbol;
    const annotationAtomToken = this._findTokenByLineAndColumn(
      atomToken.line - 1,
      atomToken.column
    );
    if (annotationAtomToken) {
      annotationAtomToken.type = DatalogpmTokenType.ANNOTATION;
    }

    const atomName = ctx.atom().ID().getText();

    const annotationCall = new AnnotationCall(annotationAtomToken);
    this.annotationCalls.push(annotationCall);

    switch (atomName) {
      case "output": {
        // Add the @output atom to the outputs
        const outputNameString = ctx.atom().term(0).getText();
        const outputName = outputNameString.substring(
          1,
          outputNameString.length - 1
        );

        // Mark string as an atom reference
        const term = ctx.atom().term(0).start;
        const termToken = this._findTokenByLineAndColumn(
          term.line - 1,
          term.column
        );
        if (!outputName) {
          if (termToken) this.emptyDefinitionInAnnotationTokens.push(termToken);
          return;
        }

        // Multiple output declaration check
        if (termToken && this.outputAtomsNames.has(outputName)) {
          // If the output was already marked as such, we have a duplicate declaration.
          if (!(outputName in this.duplicateOutputRules)) {
            this.duplicateOutputRules[outputName] = [
              // As we already met the atom, we are sure that we already registered its reference
              this.atomReferences[outputName][0],
            ];
          }
          this.duplicateOutputRules[outputName].push(termToken);
        } else {
          // This is the first time we met an @output declaration for this atom
          this.outputAtomsNames.add(outputName);
        }

        if (termToken) {
          // Add reference token
          if (!this.atomReferences[outputName])
            this.atomReferences[outputName] = [];
          this.atomReferences[outputName].push(termToken);

          // Save output token
          if (!this.outputAtomTokens[outputName])
            this.outputAtomTokens[outputName] = [];
          this.outputAtomTokens[outputName].push(termToken);

          // Add atom token to list of atom tokens
          if (!this.atomTokens[outputName]) this.atomTokens[outputName] = [];
          this.atomTokens[outputName].push(termToken);

          this.programGraph.addOutputAtomToken(termToken,
            this._makeCurrentRuleId()
          );
          this.suppressToken(termToken);
        }

        break;
      }
      case "input": {
        // Add the @input atom to the inputs
        const inputNameString = ctx.atom().term(0).getText();
        const inputName = inputNameString.substring(
          1,
          inputNameString.length - 1
        );
        this.inputAtomNames.add(inputName);

        const term = ctx.atom().term(0).start;
        const termToken = this._findTokenByLineAndColumn(
          term.line - 1,
          term.column
        );
        if (!inputName) {
          if (termToken) this.emptyDefinitionInAnnotationTokens.push(termToken);
          return;
        }

        if (termToken) {

          // Save output token
          if (!this.inputAtomTokens[inputName])
            this.inputAtomTokens[inputName] = [];
          this.inputAtomTokens[inputName].push(termToken);

          // Add atom token to list of atom tokens
          if (!this.atomTokens[inputName]) this.atomTokens[inputName] = [];
          this.atomTokens[inputName].push(termToken);

          // Add atom call
          const atomCall = new AtomCall(inputName, termToken, AtomCallType.ATOM_CALL_TYPE_INPUT);
          this.atomCalls.push(atomCall);      

          // Add atom reference to program graph & suppress token, as we will inherit it from graph
          this.programGraph.addInputAtomToken(
            termToken,
            this._makeCurrentRuleId()
          );
          this.suppressToken(termToken);
        }

        // Create vaDoc documentation, if available
        if (this.activeBlockComment) {
          const commentParserService = Container.get(CommentParserService);
          const block = commentParserService.parse(this.activeBlockComment);

          if (block[0]) {
            this.atomVadocBlocks[inputName] = block[0];
          }
        }


        break;
      }
      case "module": {
        const moduleNameString = ctx.atom().term(0).getText();
        const moduleName = moduleNameString.substring(
          1,
          moduleNameString.length - 1
        );
        this.moduleName = moduleName;

        break;
      }
      case "bind": {
        this._onBindingAnnotation(ctx);
        break;
      }
      case "qbind": {
        this._onQBindingAnnotation(ctx);
        break;
      }
      case "mapping": {
        this._onMappingAnnotation(ctx);
        break;
      }
      case "post": {
        this._onPostAnnotation(ctx);
        break;
      }
    }
  };

  _onBindingAnnotation(ctx: DatalogpmParser.AnnotationBodyContext) {
    const bindToken = ctx.start;
    const vadacodeBindToken = this._findTokenByLineAndColumn(
      bindToken.line - 1,
      bindToken.column
    );

    // Add the @bind atom to the inputs
    const bindingNameString = ctx.atom().term(0).getText();
    const bindName = bindingNameString.substring(
      1,
      bindingNameString.length - 1
    );
    const term = ctx.atom().term(0).start;
    const termToken = this._findTokenByLineAndColumn(
      term.line - 1,
      term.column
    );

    if (!bindName) {
      if (termToken) this.emptyDefinitionInAnnotationTokens.push(termToken);
      return;
    }

    this.atomBindings.add(bindName);

    // Wrap parsing into a try-catch block to avoid
    // crashing the server when a mapping is malformed
    // (which is pretty typical when developing).
    try {
      const dataSourceTerm = ctx.atom().term(1);
      const dataSource = removeQuotes(dataSourceTerm.getText());
      const outermostContainerTerm = ctx.atom().term(2);
      const outermostContainer = removeQuotes(outermostContainerTerm.getText());
      const innermostContainerTerm = ctx.atom().term(3);
      const innermostContainer = removeQuotes(innermostContainerTerm.getText());
      const binding = {
        token: vadacodeBindToken,
        atomName: bindName,    
        dataSource,
        outermostContainer,
        innermostContainer,      
      } as DatalogpmBinding;
      this.bindings[bindName] = binding;
    } finally {
      // Do nothing
    }

    // Add atom reference to program graph
    if (termToken) {
      this.programGraph.addBindingAtomToken(termToken, this._makeCurrentRuleId());
      this.suppressToken(termToken);
    }
  }

  _onQBindingAnnotation(ctx: DatalogpmParser.AnnotationBodyContext) {
    const bindToken = ctx.start;
    const vadacodeBindToken = this._findTokenByLineAndColumn(
      bindToken.line - 1,
      bindToken.column
    );

    // Add the @bind atom to the inputs
    const bindingNameString = ctx.atom().term(0).getText();
    const bindName = bindingNameString.substring(
      1,
      bindingNameString.length - 1
    );
    const term = ctx.atom().term(0).start;
    const termToken = this._findTokenByLineAndColumn(
      term.line - 1,
      term.column
    );

    if (!bindName) {
      if (termToken) this.emptyDefinitionInAnnotationTokens.push(termToken);
      return;
    }

    this.atomBindings.add(bindName);

    // Wrap parsing into a try-catch block to avoid
    // crashing the server when a mapping is malformed
    // (which is pretty typical when developing).
    try {
      const dataSourceTerm = ctx.atom().term(1);
      const dataSource = removeQuotes(dataSourceTerm.getText());
      const outermostContainerTerm = ctx.atom().term(2);
      const outermostContainer = removeQuotes(outermostContainerTerm.getText());
      const innermostContainerTerm = ctx.atom().term(3);
      const query = removeQuotes(innermostContainerTerm.getText());
      const binding = {
        token: vadacodeBindToken,
        atomName: bindName,    
        dataSource,
        outermostContainer,
        query: query,      
      } as DatalogpmQueryBinding;
      this.bindings[bindName] = binding;
    } finally {
      // Do nothing
    }

    // Add atom reference to program graph
    if (termToken) {
      this.programGraph.addBindingAtomToken(termToken, this._makeCurrentRuleId());
      this.suppressToken(termToken);
    }
  }

  _onMappingAnnotation(ctx: DatalogpmParser.AnnotationBodyContext) {
    const mappingToken = ctx.start;
    const vadacodeMappingToken = this._findTokenByLineAndColumn(
      mappingToken.line - 1,
      mappingToken.column
    );

    const mappingNameString = ctx.atom().term(0).getText();
    const mappingName = removeQuotes(mappingNameString);
    const term = ctx.atom().term(0).start;
    const termToken = this._findTokenByLineAndColumn(
      term.line - 1,
      term.column
    );

    if (termToken) {
      this.programGraph.addMappingAtomToken(
        termToken,
        this._makeCurrentRuleId()
      );
      this.suppressToken(termToken);
    }

    if (!mappingName) {
      if (termToken) this.emptyDefinitionInAnnotationTokens.push(termToken);
      return;
    }

    if (!this.mappings[mappingName]) {
      this.mappings[mappingName] = [];         
    }

    // Wrap parsing into a try-catch block to avoid
    // crashing the server when a mapping is malformed
    // (which is pretty typical when developing).
    try {
      const positionTerm = ctx.atom().term(1);
      const position = +positionTerm.getText();

      if (isNaN(position)) {
        const posToken = positionTerm.start;
        const vadacodePositionToken = this._findTokenByLineAndColumn(
          posToken.line - 1,
          posToken.column
        );

        if (vadacodePositionToken) {
          const diag = makeDiagnostic(
            vadacodePositionToken,
            ErrorTypes.MAPPING_POSITION_MUST_BE_INDEX,
            { position: positionTerm.getText() }

          );

          this.diagnostics.push(diag);  
        }
      }

      const columnNameTerm = ctx.atom().term(2);
      const columnName = columnNameTerm ? removeQuotes(columnNameTerm.getText()) : '';
      const columnTypeTerm = ctx.atom().term(3);
      const columnTypeString = columnTypeTerm ? removeQuotes(columnTypeTerm.getText()): '';
  
      let columnType: DatalogpmTokenType;
      // Types come from: https://www.vadalog.org/vadalog-handbook/latest/variables-types.html
      switch(columnTypeString) {
        case "string":
          columnType = DatalogpmTokenType.STRING;
          break;
        case "int":
          columnType = DatalogpmTokenType.INT;
          break;
        case "double":
          columnType = DatalogpmTokenType.DOUBLE;
          break;
        case "boolean":
          columnType = DatalogpmTokenType.BOOLEAN;
          break;
        case "date":
          columnType = DatalogpmTokenType.DATE;
          break;
        case "list":
          columnType = DatalogpmTokenType.LIST;
          break;
        case "set":
          columnType = DatalogpmTokenType.SET;
          break;
        case "unknown":
          columnType = DatalogpmTokenType.UNKNOWN;
          break;
        default: {
          const columnTypeTermToken = columnTypeTerm.start;
          if (!columnTypeTermToken) return;

          const columnTypeTermDatalogpmToken = this._findTokenByLineAndColumn(
            columnTypeTermToken.line - 1,
            columnTypeTermToken.column
          );
          if (!columnTypeTermDatalogpmToken) return;

          this.unknownMappingColumnTypeTokens.push(columnTypeTermDatalogpmToken);
          
          return;
        }
      }
      
      const datalogpmMapping = {
        token: vadacodeMappingToken,
        atomName: mappingName,
        position,
        columnName,
        columnType
      } as DatalogpmMapping;
      this.mappings[mappingName].push(datalogpmMapping);
    } finally {
      // Do nothing
    }

  }

  _onPostAnnotation(ctx: DatalogpmParser.AnnotationBodyContext) {
    const postToken = ctx.start;
    const vadacodePostToken = this._findTokenByLineAndColumn(
      postToken.line - 1,
      postToken.column
    );

    const postNameString = ctx.atom().term(0).getText();
    const postName = removeQuotes(postNameString);
    const term = ctx.atom().term(0).start;
    const termToken = this._findTokenByLineAndColumn(
      term.line - 1,
      term.column
    );

    if (termToken) {
      this.programGraph.addPostAtomToken(
        termToken,
        this._makeCurrentRuleId()
      );
      this.suppressToken(termToken);
    }
  }


  exitAnnotationBody = (ctx: DatalogpmParser.AnnotationBodyContext): void => {
    this.visitingAnnotationBody = false;
  };

  enterNegLiteral = (ctx: DatalogpmParser.NegLiteralContext): void => {
    this.visitingNegationLiteral = true;
  };
  exitNegLiteral = (ctx: DatalogpmParser.NegLiteralContext): void => {
    this.visitingNegationLiteral = false;
  };

  enterAtom = (ctx: AtomContext): void => {
    if (!ctx.ID()) return;

    // Annotations are marked as such
    const atomSymbol = ctx.ID().symbol;
    const atomToken = this._findTokenByLineAndColumn(
      atomSymbol.line - 1,
      atomSymbol.column
    );
    if (atomToken) {
      // When entering an atom, reset term position being visited
      this.termPositionBeingVisited = -1;

      if (!this.visitingAnnotationBody) {
        // Type is atom
        atomToken.type = DatalogpmTokenType.ATOM;

        // When an atom is met, we add it to used atoms
        const atomName = atomToken.text;
        this.atomNames.add(atomName);


        // Add head atoms
        if (this.visitingHead) {
          this.atomNamesAppearingInTheHead.add(atomName);
          atomToken.tags.add("head");

          this.atomInHeadBeingVisited = atomToken;

          // Add atom call
          const atomCall = new AtomCall(atomToken.text, atomToken, AtomCallType.ATOM_CALL_TYPE_HEAD);
          this.atomCalls.push(atomCall);      
        }

        if (this.visitingBody) {
          this.atomNamesAppearingInTheBody.add(atomName);
          
          if (this.atomInHeadBeingVisited) {
            this.atomDependencyGraph.addDependencyOfOn(
              atomToken.text,
              this.atomInHeadBeingVisited.text
            );
          }

          const atomCall = new AtomCall(atomToken.text, atomToken, AtomCallType.ATOM_CALL_TYPE_BODY);
          this.atomCalls.push(atomCall);      
        }

        if (this.visitingFact) {
          this.atomNamesAppearingInFact.add(atomName);

          // Add atom call
          const atomCall = new AtomCall(atomToken.text, atomToken, AtomCallType.ATOM_CALL_TYPE_FACT);
          this.atomCalls.push(atomCall);      
        }

        this.onAtom(atomToken);

        if (this.visitingBody || this.visitingHead || this.visitingFact) {
          this.atomTokenBeingVisited = atomToken;
          this.programGraph.addAtomToken(
            atomToken.text,
            atomToken,
            this.bodyConjunctiveQueryTerm,
            this._makeCurrentRuleId(),
            this.visitingBody ? AtomLocation.Body : this.visitingFact ? AtomLocation.Fact : AtomLocation.Head
          );
        }
      }
    } // End if(atomToken)
  };

  exitAtom = (ctx: AtomContext): void => {
    this.activeBlockComment = undefined;

    // Reset atim being visited
    this.atomTokenBeingVisited = undefined;

    // Reset term being visited
    this.termPositionBeingVisited = -1;

    if (!ctx.ID()) return;

    const atomName = ctx.ID().symbol;
    this.lastExitedAtom = atomName.text;
  };

  enterTemporalAnnotation = (
    ctx: DatalogpmParser.TemporalAnnotationContext
  ): void => {
    for (const token of this.antlrTokens) {
      if (this.lastExitedAtom && token.text == this.lastExitedAtom) {
        this.temporalAtoms.add(token.text);
      }
    }
  };

  enterHead = (ctx: DatalogpmParser.HeadContext): void => {
    this.visitingHead = true;
  };

  exitHead = (ctx: DatalogpmParser.HeadContext): void => {
    this.visitingHead = false;
  };

  enterBody = (ctx: DatalogpmParser.BodyContext): void => {
    this.visitingBody = true;
    this.bodyConjunctiveQueryTerm = 0;
  };

  exitBody = (ctx: DatalogpmParser.BodyContext): void => {
    this.visitingBody = false;
    this.bodyConjunctiveQueryTerm = -1;
  };

  _openRule(startToken: Token, stopToken?: Token) {
    const rRuleStartToken = this._findTokenByLineAndColumn(
      startToken.line - 1,
      startToken.column
    );

    let ruleRange = {
      start: {
        line: rRuleStartToken!.line,
        character: rRuleStartToken!.column,
      },
      end: {
        line: rRuleStartToken!.line,
        character: rRuleStartToken!.column + rRuleStartToken!.length
      }
    } as Range;

    if (stopToken) {
      const rRuleStopToken = this._findTokenByLineAndColumn(
        stopToken.line - 1,
        stopToken.column
      );
      if (rRuleStopToken) {
        ruleRange = {
          start: {
            line: rRuleStartToken!.line,
            character: rRuleStartToken!.column,
          },
          end: {
            line: rRuleStopToken!.line,
            character: rRuleStopToken!.column + 1 // (it's a dot, so we add 1)
          }
        } as Range;
      }
    }

    this.idOfRuleBeingVisited = this.numberOfRules;
    this.numberOfRules++;
    // Reset aggregation counter
    this.currentAggregationIndex = -1;
    this.programGraph.addRule(this._makeCurrentRuleId(), ruleRange, rRuleStartToken?.uri);
  }

  _closeRule() {
    this.programGraph.closeRule(this._makeCurrentRuleId());
  }

  enterFact = (ctx: DatalogpmParser.FactContext): void => {
    this._openRule(ctx.start, ctx.DOT()?.symbol);
    this.visitingFact = true;
  };

  exitFact = (ctx: DatalogpmParser.FactContext): void => {
    this.visitingFact = false;
    this._closeRule();
  };

  enterTerm = (ctx: DatalogpmParser.TermContext): void => {
    // Build annotation calls
    if (this.visitingAnnotationBody) {
      // Get last annotation call
      const annotationCall = this.annotationCalls[this.annotationCalls.length - 1];
      if (!annotationCall) console.error("No annotation call found");

      const term = ctx.start;
      const termToken = this._findTokenByLineAndColumn(
        term.line - 1,
        term.column
      );

      if (termToken && !this.collectionBeingVisited) {
        // We have a term token which is not part of a collection 
        // (i.e. a simple const or var term), so we can add it
        annotationCall.addTerm(termToken);
      }
    } else {

      if (this.visitingHead || this.visitingBody) {
        this.termPositionBeingVisited++;
      }

      // Get last annotation call
      const atomCall = this.atomCalls[this.atomCalls.length - 1];
      if (!atomCall) console.error("No atom call found");

      if (!this.collectionBeingVisited) {
        // If we are not visiting a collection, we can add the term normally
        // (this is to avoid that adding a collection of items make them
        // figure as first-level terms).
        const term = ctx.start;
        const termToken = this._findTokenByLineAndColumn(
          term.line - 1,
          term.column
        );

        // If we are visiting an atom call, add it to the atom call
        if (((this.atomTokenBeingVisited && (this.visitingBody || this.visitingHead)) || this.visitingFact) && termToken) {
          atomCall.addTerm(termToken);
        }
      }

      // booleanConstTerm | stringConstTerm | integerConstTerm | doubleConstTerm | dateConstTerm | setConstTerm | listTerm | varTerm | anonTerm;
      if (
        ctx.booleanConstTerm() ||
        ctx.stringConstTerm() ||
        ctx.integerConstTerm() ||
        ctx.doubleConstTerm() ||
        ctx.dateConstTerm() ||
        ctx.setConstTerm()
      ) {
        const term = ctx.start;
        const constantToken = this._findTokenByLineAndColumn(
          term.line - 1,
          term.column
        );

        // Let's ensure we are visiting a body atom (e.g. not a condition)
        if (this.visitingBody && this.atomTokenBeingVisited && constantToken) {
          this.programGraph.addConstantToken(
            constantToken,
            this._makeCurrentRuleId(),
            this.atomTokenBeingVisited!,
            this.bodyConjunctiveQueryTerm,
            this.termPositionBeingVisited,
            this.visitingHead,
            this.visitingNegationLiteral
          );
        }
      }
    }
  };

  // Update atom calls when entering collections

  enterList = (ctx: DatalogpmParser.ListContext) =>{
    this.collectionBeingVisited = ctx;
    this._onEnteredCollection(ctx.start);    
  };
  exitList = (ctx: DatalogpmParser.ListContext) =>{
    this.collectionBeingVisited = null;
  };

  enterStringSet = (ctx: DatalogpmParser.StringSetContext) => {
    this.collectionBeingVisited = ctx;
    this._onEnteredCollection(ctx.start);
  };
  exitStringSet = (ctx: DatalogpmParser.StringSetContext) => {
    this.collectionBeingVisited = null;
  };

  enterEmptySet = (ctx: DatalogpmParser.EmptySetContext) => {
    this.collectionBeingVisited = ctx;
    this._onEnteredCollection(ctx.start);
  };
  exitEmptySet = (ctx: DatalogpmParser.EmptySetContext) => {
    this.collectionBeingVisited = null;
  };

  enterIntegerSet = (ctx: DatalogpmParser.IntegerSetContext) => {
    this.collectionBeingVisited = ctx;
    this._onEnteredCollection(ctx.start);
  };
  exitIntegerSet = (ctx: DatalogpmParser.IntegerSetContext) => {
    this.collectionBeingVisited = null;
  };

  enterDoubleSet = (ctx: DatalogpmParser.DoubleSetContext) => {
    this.collectionBeingVisited = ctx;
    this._onEnteredCollection(ctx.start);
  };
  exitDoubleSet = (ctx: DatalogpmParser.DoubleSetContext) => {
    this.collectionBeingVisited = null;
  };

  enterDateSet = (ctx: DatalogpmParser.DateSetContext) => {
    this.collectionBeingVisited = ctx;
    this._onEnteredCollection(ctx.start);
  };
  exitDateSet = (ctx: DatalogpmParser.DateSetContext) => {
    this.collectionBeingVisited = null;
  };

  _onEnteredCollection = (firstToken: Token) => {
    // Build annotation calls
    if (this.visitingAnnotationBody) {
      // Do nothing for now
    } else {
      // Code derived by enterTerm()
      if (this.visitingHead || this.visitingBody) {
        this.termPositionBeingVisited++;
      }

      // Get last annotation call
      const atomCall = this.atomCalls[this.atomCalls.length - 1];
      if (!atomCall) console.error("No atom call found");

      // If we are visiting an atom call, add it to the atom call
      if (((this.atomTokenBeingVisited && (this.visitingBody || this.visitingHead)) || this.visitingFact)) {
        const integerSetPlaceholderToken: IDatalogpmToken = {
          line: firstToken.line - 1,
          column: firstToken.column,
          length: 1,
          text: firstToken.text,
          type: DatalogpmTokenType.AT,
          modifiers: [],
          tags: new Set<TokenTag>(),
        };
        atomCall.addTerm(integerSetPlaceholderToken);
      }
    }

  };

  

  enterEqCondition = (ctx: DatalogpmParser.EqConditionContext) => {
    this.visitingEqualityCondition = EqualityConditionVisitStatus.VISITING_LEFT_HAND_SIDE;
  };

  exitEqCondition = (ctx: DatalogpmParser.EqConditionContext) => {
    this.visitingEqualityCondition = EqualityConditionVisitStatus.NOT_VISITING;
  };

  enterVarTerm = (ctx: DatalogpmParser.VarTermContext) => {
    // Allow for broken code when writing.
    if (!ctx.VAR()) return;
    const variableSymbol = ctx.VAR().symbol;
    const variableToken = this._findTokenByLineAndColumn(
      variableSymbol.line - 1,
      variableSymbol.column
    );
    if (!variableToken) {
      return;
    }
    if (this.conditionBeingVisited >= 0) {      
      // The variable is in a condition
      this.programGraph.addConditionVariableToken(
        variableToken,
        this._makeCurrentRuleId(),
        this.conditionBeingVisited,
        this.visitingEqualityCondition == EqualityConditionVisitStatus.VISITING_LEFT_HAND_SIDE
      );
      this.visitingEqualityCondition = EqualityConditionVisitStatus.VISITING_RIGHT_HAND_SIDE;

    } else if (this.egdBeingVisited >= 0) {
      // The variable is an EGD
      this.programGraph.addEGDVariableToken(
        variableToken,
        this._makeCurrentRuleId(),
        this.egdBeingVisited
      );

    } else if (
      this.atomTokenBeingVisited &&
      (this.visitingBody || this.visitingHead || this.visitingFact)
    ) {
      this.programGraph.addVariableToken(
        variableToken,
        this._makeCurrentRuleId(),
        this.atomTokenBeingVisited,
        this.bodyConjunctiveQueryTerm,
        this.termPositionBeingVisited,
        this.visitingHead,
        this.visitingNegationLiteral
      );
    }
  };

  enterProgram = (ctx: DatalogpmParser.ProgramContext) => {
    this.outputAtomsNames.clear();
    this.diagnostics = [];
  };

  enterComment = (ctx: DatalogpmParser.CommentContext) => {
    if (ctx.BLOCK_COMMENT()) {
      const blockComment = ctx.BLOCK_COMMENT().getText();

      if (/^%%/i.test(blockComment)) {
        this.activeBlockComment = blockComment;
      }
    } else {
      // On non block comments (that is, line comments),
      // just forget the active block comment
      this.activeBlockComment = undefined;
    }
  };

  _makeCurrentRuleId() {
    return `R${this.idOfRuleBeingVisited}`;
  }


  enterAnnotation = (ctx: DatalogpmParser.AnnotationContext) =>  {
    this._openRule(ctx.start, ctx.DOT()?.symbol);
  };

  exitAnnotation = (ctx: DatalogpmParser.AnnotationContext) =>  {
    this._closeRule();
  };
  
  //#region Rrule
  enterRrule = (ctx: DatalogpmParser.RruleContext) => {
    this._openRule(ctx.start, ctx.DOT()?.symbol);
  };

  // Aggregation functions --------------------------------------------------

  // First, with contributors

  enterMsumAggExpression = (ctx: DatalogpmParser.MsumAggExpressionContext) => {
      this._onEnteredAggregationWithContributors(ctx, AggregationType.MSUM);
  };

  enterMprodAggExpression = (ctx: DatalogpmParser.MprodAggExpressionContext) => {
      this._onEnteredAggregationWithContributors(ctx, AggregationType.MPROD);
  };

  enterMcountAggExpression = (ctx: DatalogpmParser.McountAggExpressionContext) => {
      this._onEnteredAggregationWithContributors(ctx, AggregationType.MCOUNT);
  };

  enterMunionAggExpression = (ctx: DatalogpmParser.MunionAggExpressionContext) => {
      this._onEnteredAggregationWithContributors(ctx, AggregationType.MUNION);
  };

  enterUnionAggExpression = (ctx: DatalogpmParser.UnionAggExpressionContext) => {
      this._onEnteredAggregationWithContributors(ctx, AggregationType.UNION);
  };

  enterListAggExpression = (ctx: DatalogpmParser.ListAggExpressionContext) => {
      this._onEnteredAggregationWithContributors(ctx, AggregationType.LIST);
  };

  enterSetAggExpression = (ctx: DatalogpmParser.SetAggExpressionContext) => {
      this._onEnteredAggregationWithContributors(ctx, AggregationType.SET);
  };
      
  enterSumAggExpression = (ctx: DatalogpmParser.SumAggExpressionContext) => {
      this._onEnteredAggregationWithContributors(ctx, AggregationType.SUM);
  };

  enterProdAggExpression = (ctx: DatalogpmParser.ProdAggExpressionContext) => {
      this._onEnteredAggregationWithContributors(ctx, AggregationType.PROD);
  };

  enterAvgAggExpression = (ctx: DatalogpmParser.AvgAggExpressionContext) => {
      this._onEnteredAggregationWithContributors(ctx, AggregationType.AVG);
  };

  enterCountAggExpression = (ctx: DatalogpmParser.CountAggExpressionContext) => {
      this._onEnteredAggregationWithContributors(ctx, AggregationType.COUNT);
  };
      
  _onEnteredAggregationWithContributors = (
    ctx: DatalogpmParser.MsumAggExpressionContext | 
         DatalogpmParser.MprodAggExpressionContext | 
         DatalogpmParser.McountAggExpressionContext | 
         DatalogpmParser.MunionAggExpressionContext | 
         DatalogpmParser.UnionAggExpressionContext | 
         DatalogpmParser.ListAggExpressionContext | 
         DatalogpmParser.SetAggExpressionContext | 
         DatalogpmParser.SumAggExpressionContext | 
         DatalogpmParser.ProdAggExpressionContext | 
         DatalogpmParser.AvgAggExpressionContext | 
         DatalogpmParser.CountAggExpressionContext,
    aggregationType: AggregationType
  ) => {
    // Move to next aggregation index
    this.currentAggregationIndex++;

    // First create aggregation node
    this.programGraph.addAggregation(ctx.getText(), this._makeCurrentRuleId(), aggregationType, this.conditionBeingVisited);

    // Add each contributor variable
    const aggregationTerm = ctx.varList()?.children;
    if (aggregationTerm) {
      // Suppress '<' and '>' symbols
      const contributorVariableTokens = aggregationTerm.slice(1, -1).map((child: any) => child.symbol as Token);
      for (let contributorIndex = 0; contributorIndex < contributorVariableTokens.length; contributorIndex++) {

        const contributorVariableToken = contributorVariableTokens[contributorIndex];
        const variableToken = this._findTokenByLineAndColumn(
          contributorVariableToken.line - 1,
          contributorVariableToken.column
        );
        if (!variableToken) {
          return;
        }

        this.programGraph.addContributorVariable(variableToken, this._makeCurrentRuleId(), this.currentAggregationIndex, contributorIndex);
      }
    }
  };

  // Then, without contributors
  enterMmaxAggExpression = (ctx: DatalogpmParser.MmaxAggExpressionContext) => {
      this._onEnteredAggregationWithoutContributors(ctx, AggregationType.MMAX);
  };
  
  enterMminAggExpression = (ctx: DatalogpmParser.MminAggExpressionContext) => {
      this._onEnteredAggregationWithoutContributors(ctx, AggregationType.MMIN);
  };
  
  enterMinAggExpression = (ctx: DatalogpmParser.MinAggExpressionContext) => {
      this._onEnteredAggregationWithoutContributors(ctx, AggregationType.MIN);
  };

  enterMaxAggExpression = (ctx: DatalogpmParser.MaxAggExpressionContext) => {
      this._onEnteredAggregationWithoutContributors(ctx, AggregationType.MAX);
  };

  _onEnteredAggregationWithoutContributors = (
    ctx: DatalogpmParser.MmaxAggExpressionContext | DatalogpmParser.MminAggExpressionContext | DatalogpmParser.MinAggExpressionContext | DatalogpmParser.MaxAggExpressionContext,
    aggregationType: AggregationType
  ) => {
    // Move to next aggregation index
    this.currentAggregationIndex++;

    // First create aggregation node
    this.programGraph.addAggregation(ctx.getText(), this._makeCurrentRuleId(), aggregationType, this.conditionBeingVisited);
  };

  exitRrule = (ctx: DatalogpmParser.RruleContext): void => {
    this.atomInHeadBeingVisited = undefined;
    this._closeRule();
  };
  //#endregion

  exitComment = (ctx: DatalogpmParser.CommentContext) => {
    if (this.activeBlockComment) {
      const commentParserService = Container.get(CommentParserService);
      const vadocBlock = commentParserService.parse(this.activeBlockComment)[0];
      if (vadocBlock) {
        // Check @exports
        const exportTag = vadocBlock.tags.find(
          (tag: Spec) => tag.tag === "exports"
        );
        if (exportTag) {
          this.atomNamesAppearingAsExports.add(exportTag?.name);
          // Forget the active block comment
          this.activeBlockComment = undefined;
        }

        // Check @_silent (internal used during parsing replacement of modules:
        // all vadoc tags which have program scope (@export, @module, ...) are
        // converted into @_silent tags (which are not parsed).
        // This ensures that they are still interpreted as tags and as such
        // they reset the status of other tags (e.g. atom descriptions);
        // otherwise the program:
        // %% Welcome
        // %% @export a
        // a(1).
        // would interpret "Welcome" as the description of atom "a".
        const silentTag = vadocBlock.tags.find(
          (tag: Spec) => tag.tag === "_silent"
        );
        if (silentTag) {
          // Forget the active block comment
          this.activeBlockComment = undefined;
        }
      }
    }
    //
    //
  };

  enterEgdHead = (ctx: DatalogpmParser.EgdHeadContext) => {
    this.egdBeingVisited = this.lastVisitedEGD + 1;

    // Break execution if code is not complete yet and parsing
    // can ambiguosly return an EGD where it's not.
    if (!ctx.EQ()) {
      return;
    }
    
    // Annotations are marked as such
    const eqSymbol = ctx.EQ().symbol;
    const egdToken = this._findTokenByLineAndColumn(
      eqSymbol.line - 1,
      eqSymbol.column
    );

    if (egdToken) {
      this.egdTokens.push(egdToken);
      this.programGraph.addEGDToken(egdToken, this._makeCurrentRuleId(), this.egdBeingVisited);
    }
    
    this.lastVisitedEGD = this.egdBeingVisited;
  };

  exitEgdHead = (ctx: DatalogpmParser.EgdHeadContext) => {
    this.egdBeingVisited = -1;
  };

  enterCondition = (ctx: DatalogpmParser.ConditionContext) => {
    this.conditionBeingVisited = this.lastVisitedCondition + 1;

    this.programGraph.addCondition(ctx.getText(), this._makeCurrentRuleId(), this.conditionBeingVisited, !!ctx.eqCondition());

    this.lastVisitedEGD = this.egdBeingVisited;
  };

  exitCondition = (ctx: DatalogpmParser.ConditionContext) => {
    this.lastVisitedCondition = this.conditionBeingVisited;
    this.conditionBeingVisited = -1;

    if (this.bodyConjunctiveQueryTerm >= 0) {
      // We are visiting a body, so go to next conjunctive query term
      this.bodyConjunctiveQueryTerm++;
    }
  };

  exitLiteral = (ctx: DatalogpmParser.LiteralContext) => {
    if (this.bodyConjunctiveQueryTerm >= 0) {
      // We are visiting a body, so go to next conjunctive query term
      this.bodyConjunctiveQueryTerm++;
    }
  };


  // Generic functions

  onAtom(token: IDatalogpmToken) {
    const atomName = token.text;
    // Add atom token to list of atom tokens
    if (!this.atomTokens[atomName]) this.atomTokens[atomName] = [];
    this.atomTokens[atomName].push(token);

    // Create vaDoc documentation, if available
    if (this.activeBlockComment) {
      const commentParserService = Container.get(CommentParserService);
      const block = commentParserService.parse(this.activeBlockComment);

      if (block[0]) {
        this.atomVadocBlocks[atomName] = block[0];
      }
    }
  }

  // Diagnostics

  duplicateOutputDiagnostic() {
    for (const atomName in this.duplicateOutputRules) {
      const duplicateOutputTokens = this.duplicateOutputRules[atomName];
      for (const duplicateOutputToken of duplicateOutputTokens) {
        this.diagnostics.push(
          makeDiagnostic(
            duplicateOutputToken,
            ErrorTypes.ERR_ATOM_0_ALREADY_OUTPUT,
            {atom: atomName}
          )
        );
      }
    }
  }

  undeclaredOutputDiagnostic() {
    for (const outputAtomName in this.outputAtomTokens) {
      const outputAtomTokens = this.outputAtomTokens[outputAtomName];
      for (const outputAtomToken of outputAtomTokens) {
        if (
          !this.atomNames.has(outputAtomName) &&
          !this.inputAtomNames.has(outputAtomName)
        ) {
          this.diagnostics.push(
            makeDiagnostic(
              outputAtomToken,
              ErrorTypes.ERR_NON_EXISTING_OUTPUT_0,
              {atom: outputAtomName}
            )
          );
        }
      }
    }
  }

  unboundInputDiagnostic() {
    for (const inputAtomName in this.inputAtomTokens) {
      const inputAtomTokens = this.inputAtomTokens[inputAtomName];
      for (const inputAtomToken of inputAtomTokens) {
        if (
          !this.atomBindings.has(inputAtomName)
        ) {
          this.diagnostics.push(
            makeDiagnostic(
              inputAtomToken,
              ErrorTypes.ERR_NO_BINDINGS_FOR_INPUT_0,
              {atom: inputAtomName}
            )
          );
        }
      }
    }
  }

  unboundOutputDiagnostic() {
    for (const outputAtomName in this.outputAtomTokens) {
      const outputAtomTokens = this.outputAtomTokens[outputAtomName];
      for (const outputAtomToken of outputAtomTokens) {
        if (
          !this.atomBindings.has(outputAtomName)
        ) {
          this.diagnostics.push(
            makeDiagnostic(
              outputAtomToken,
              ErrorTypes.NO_BINDINGS_FOR_OUTPUT_0,
              {atom: outputAtomName}
            )
          );
        }
      }
    }
  }

  egdHintDiagnostic() {
    for (const egdToken of this.egdTokens) {
      this.diagnostics.push(
        makeDiagnostic(
          egdToken,
          ErrorTypes.HINT_EGD_0_1
        )
      );
    }
  }

  undeclaredVariableDiagnostic() {
    this.undeclaredVariableTokens.forEach(
    (datalogpmToken: IDatalogpmToken) => {
      this.diagnostics.push(
        makeDiagnostic(
          datalogpmToken,
          ErrorTypes.UNDECLARED_VARIABLE,
          {variable: datalogpmToken.text}
        )
      );
    });
  }



  
  

  unusedAtomDiagnostic() {
    for (const token of this.antlrTokens) {
      if (token.type == DatalogpmTokenType.ATOM) {
        const atomName = token.text;
        // Atom has been used as output
        const atomInOutput = this.outputAtomsNames.has(atomName);

        // Atom is source for another atom
        const atomUsedInBody = this.atomNamesAppearingInTheBody.has(atomName);

        const usedAtom = atomUsedInBody || atomInOutput;
        if (!usedAtom && !this.atomNamesAppearingAsExports.has(atomName)) {
          this.diagnostics.push(
            makeDiagnostic(
              token,
              ErrorTypes.ERR_UNUSED_ATOM,
              {atom: atomName}
            )
          );
        }
      }
    }
  }

  inputAtomAsHeadDiagnostic() {
    for (const token of this.antlrTokens.filter(
      (token: IDatalogpmToken) => token.type == DatalogpmTokenType.ATOM
    )) {
      const atomInInput = this.inputAtomNames.has(token.text);
      const atomInHead = token.tags.has("head");
      if (atomInInput && atomInHead) {
        this.diagnostics.push(
          makeDiagnostic(
            token,
            ErrorTypes.ERR_INPUT_ATOM_IN_HEAD_0,
            {atom: token.text}
          )
        );
      }
    }
  }

  unknownMappingColumnTypeTokensDiagnostic() {
    for (const token of this.unknownMappingColumnTypeTokens) {
      this.diagnostics.push(
        makeDiagnostic(
          token,
          ErrorTypes.ERR_UNKNOWN_MAPPING_COLUMN_TYPE,
          {columnType: token.text}
        )
      );
    }    
  }

  /**
   * Creates a warning diagnostic for undeclarea atoms.
   */
  undeclaredAtomDiagnostic() {
    const nonRecursiveAtomNamesAppearingInTheHead = union(
      this.atomNamesAppearingInFact,
      difference(
        this.atomNamesAppearingInTheHead,
        this.atomNamesAppearingBothInBodyAndHead
      )
    );
    const declaredAtoms = union(
      this.inputAtomNames,
      nonRecursiveAtomNamesAppearingInTheHead
    );
    const undeclaredAtoms = difference(this.atomNames, declaredAtoms);
    for (const token of this.antlrTokens) {
      if (
        token.type == DatalogpmTokenType.ATOM &&
        undeclaredAtoms.has(token.text)
      ) {
        this.diagnostics.push(
          makeDiagnostic(
            token,
            ErrorTypes.ERR_UNDECLARED_ATOM_0,
            {atom: token.text}
          )
        );
      }
    }
  }

  // Semantic tagging

  addSemanticModifierForExistentials() {
    this.markedNullVariableTokens.forEach(
      (datalogpmToken: IDatalogpmToken) => {
        datalogpmToken.modifiers.push(DatalogpmTokenModifier.EXISTENTIAL);
      }
    );
  }

  addTemporalModifiers() {
    for (const temporalAtom of this.temporalAtoms) {
      this.atomDependencyGraph.setNodeAttributes(temporalAtom, {
        temporal: true,
      });
    }

    const temporalAtoms = this.atomDependencyGraph.getTemporalAtoms();

    for (const temporalAtom of temporalAtoms) {
      const tokens = this.atomTokens[temporalAtom];
      for (const token of tokens) {
        token.modifiers.push(DatalogpmTokenModifier.TEMPORAL);
      }
    }
  }

  _analyzed = false;
  analyseProgram() {
    // Don't wait clear diagnostics as they are cleared upon
    // entering program; diagnostics are accumulated during
    // parsing as well.
    // this.diagnostics = [];

    // Program parsing diagnostics
    this.emptyDefinitionInAnnotationsDiagnostic();
    this.unusedAtomDiagnostic();
    this.inputAtomAsHeadDiagnostic();
    this.unknownMappingColumnTypeTokensDiagnostic();
    this.undeclaredAtomDiagnostic();
    this.duplicateOutputDiagnostic();
    this.undeclaredOutputDiagnostic();
    this.unboundInputDiagnostic();
    this.unboundOutputDiagnostic();
    this.addTemporalModifiers();
    this.enrichBindingsWithAtomReferences();
    this.egdHintDiagnostic();

    this.programGraph.analyze();

    for (const analyzer of this._analyzers) {
      analyzer.analyze(this.programGraph);
    }

    this.undeclaredVariableTokens = this.programGraph.undeclaredVariableTokens;
    // After analysis, we have information available
    this.existentialVariableTokens =
      this.wardedAnalyzer.existentialVariableTokens;
    this.markedNullVariableTokens =
      this.wardedAnalyzer.markedNullVariableTokens;      
    this.harmfulVariableTokens = this.wardedAnalyzer.harmfulVariableTokens;
    this.dangerousVariableTokens = this.wardedAnalyzer.dangerousVariableTokens;
    this.usedInTaintedJoinVariableTokens = this.wardedAnalyzer.usedInTaintedJoinVariableTokens;
   
    this.undeclaredVariableDiagnostic();

    for (const analyzer of this._analyzers) {
      const diagnostics = analyzer.getDiagnostics();
      this.diagnostics.push(...diagnostics);
    }    
    // This requires "affected" to be present
    this.addSemanticModifierForExistentials();

    // ---

    const variableTokens = this.programGraph.getVariableTokens();
    const atomTokens = this.programGraph.getAtomTokens();

    const antlrOtherTokens = this.antlrTokens.filter(
      (token) => (
        token.type !== DatalogpmTokenType.VARIABLE &&
        token.type !== DatalogpmTokenType.ATOM
      )
    );

    this._tokens = [
      // Merge all tokens into a single list
        ...variableTokens,
        ...atomTokens,
        ...antlrOtherTokens,
      ]
      // Sort tokens by line and column, this is fundamental
      // because otherwise Visual Studio Code fails silently.
      .sort((a, b) =>
        a.line === b.line ? a.column - b.column : a.line - b.line
      );
    
    // If we reach this point, the tokens are consistent
    this._analyzed = true;
  }

  _tokens: IDatalogpmToken[] = [];
  get tokens(): IDatalogpmToken[] {
    if (!this._analyzed) {
      throw new Error("Program not analyzed yet. Call analyseProgram() first.");
    }
    // Return the tokens excluding the ones in _supressedTokens
    return this._tokens.filter(
      (token) => !this._suppressedTokens.includes(token)
    );
  }

  enrichBindingsWithAtomReferences() {
    // Enrich bindings
    for (const bindingName in this.bindings) {
      const binding = this.bindings[bindingName];
      if (binding) {
        if (this.inputAtomTokens[bindingName] && this.inputAtomTokens[bindingName][0]) {
          binding.input = true;
          binding.inputToken = this.inputAtomTokens[bindingName][0];
        } else {
          binding.input = false;
        }
      }
    }
  }

  emptyDefinitionInAnnotationsDiagnostic() {
    for (const emptyDefinitionInAnnotationToken of this.emptyDefinitionInAnnotationTokens) {
      this.diagnostics.push(
        makeDiagnostic(
          emptyDefinitionInAnnotationToken,
          ErrorTypes.ERR_EMPTY_DEFINITION
        )
      );      
    }
  }

}

function removeQuotes(s: string) {
  return s.substring(
    1,
    s.length - 1
  );
}

