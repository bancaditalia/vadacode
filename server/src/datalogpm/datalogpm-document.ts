// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Representation of a Datalogpm document in the LSP server.
 */

import { Position, TextDocument } from "vscode-languageserver-textdocument";
import { Diagnostic, Range } from "vscode-languageserver/node";
import {
  CharStream,
  CommonTokenStream,
  ParseTreeWalker,
  DatalogpmLexer,
  DatalogpmParser,
} from "../../../datalogpm-parser/out";
import { IDatalogpmToken, DatalogpmGenericBinding, DatalogpmSignatureHelp } from "./common";
import { LexerErrorListener } from "./lexer-error-listener";
import { ParserErrorListener } from "./parser-error-listener";
import { DEFAULT_SETTINGS, VadacodeSettings } from "./settings";
import { TokensBuilder } from "./tokens-builder";
import { VadacodeTreeWalker } from "./vadacode-tree-walker";

import { Container } from "typedi";
import { AnnotationsDiagnosticProvider } from '../diagnostics/annotation.diagnostic';
import { SignatureDiagnosticProvider } from '../diagnostics/signature.diagnostic';
import { DEFAULT_FRAGMENT, Fragment } from '../isomorphic';
import { applicableFragments, classify } from './fragment-containment';
import { SignatureHelpBuilder } from './signature-help-builder';

/**
 * Representation of a Datalogpm document in the LSP server.
 */
export class DatalogpmDocument {
  _textDocument!: TextDocument;

  selectedFragment: Fragment = DEFAULT_FRAGMENT;

  settings: VadacodeSettings = DEFAULT_SETTINGS;

  private tokensBuilder = new TokensBuilder();

  private _tokens!: IDatalogpmToken[];
  private _references: { [atomName: string]: IDatalogpmToken[] } = {};

  private _antlrDiagnostics!: Diagnostic[];
  private _diagnostics!: Diagnostic[];
  private _fragmentViolationDiagnostics: Diagnostic[] = [];

  public bindings: { [atomName: string]: DatalogpmGenericBinding } = {};

  get document() {
    return this._textDocument;
  }

  set document(textDocument: TextDocument) {
    this._textDocument = textDocument;

    this.refresh();
  }

  get allTokens() {
    return this._tokens;
  }

  /**
   * Return the semantic tokens for the document.
   */
  get documentTokens(): IDatalogpmToken[] {
    return this._tokens.filter(
      (token: IDatalogpmToken) => token.uri === this.document.uri
    );
  }

  get diagnostics() {
    return this._diagnostics;
  }

  get text() {
    return this.document.getText();
  }

  refresh() {
    this._parse(this._textDocument);
    this.analyseProgram();
  }

  constructor(
    document: TextDocument,
    fragment: Fragment = DEFAULT_FRAGMENT
  ) {
    // The we set the fragment, so that it is ready for parsing
    this.selectedFragment = fragment;
    // The we set the document, because it triggers the parsing
    this.document = document;
  }

  atomNames = new Set<string>();

  signatureHelps: DatalogpmSignatureHelp[] = [];
  existentialVariableTokens: IDatalogpmToken[] = [];
  markedNullVariableNodes: IDatalogpmToken[] = [];
  harmfulVariableTokens: IDatalogpmToken[] = [];
  dangerousVariableTokens: IDatalogpmToken[] = [];
  usedInTaintedJoinVariableTokens: IDatalogpmToken[] = [];

  definitionTokens: { [atomName: string]: IDatalogpmToken } = {};

  public findToken(
    position: Position,
    callback: (token: IDatalogpmToken) => boolean = () => true
  ): IDatalogpmToken | undefined {
    const needleToken: IDatalogpmToken | undefined = this.allTokens.find(
      (token: IDatalogpmToken) =>
        callback(token) &&
        token.line == position.line &&
        position.character >= token.column &&
        position.character < token.column + token.length
    );

    return needleToken;
  }

  vadacodeTreeWalker?: VadacodeTreeWalker;

  moduleRanges: Range[] = [];

  private _parse(textDocument: TextDocument): void {
    // Replace @include statements with included code
    const inlinedProgram = textDocument.getText();

    // Parse inlined program
    const chars = new CharStream(inlinedProgram);
    const lexer = new DatalogpmLexer.default(chars);
    lexer.removeErrorListeners();
    const lexerErrorListener = new LexerErrorListener();
    lexer.addErrorListener(lexerErrorListener);

    const tokenStream = new CommonTokenStream(lexer);
    const tokens = this.tokensBuilder.buildFrom(
      tokenStream,
      lexer.symbolicNames,
      textDocument.uri
    );

    // Debug tokenizer (prints parsed tokens)
    // for (const token of tokenStream.tokens) {
    //   const name = lexer.symbolicNames[token.type] || lexer.literalNames[token.type] || token.type;
    //   console.log("* ",{
    //     text: token.text,
    //     type: name,
    //     line: token.line,
    //     column: token.column,
    //   });    
    // }

    const parser = new DatalogpmParser.default(tokenStream);
    parser.removeErrorListeners();
    const parserErrorListener = new ParserErrorListener();
    parser.addErrorListener(parserErrorListener);

    const tree = parser.program();

    // Debug parser (prints parse tree)
    // console.log("Parsed Datalog+/- program.", tree.toStringTree([], parser));


    this.vadacodeTreeWalker = new VadacodeTreeWalker(tokens);
    ParseTreeWalker.DEFAULT.walk(this.vadacodeTreeWalker, tree);

    this._antlrDiagnostics = [
      ...lexerErrorListener.diagnostics,
      ...parserErrorListener.diagnostics,
    ];

    this.atomNames = this.vadacodeTreeWalker.atomNames;
  }

  analyseProgram() {
    if (!this.vadacodeTreeWalker) return;
    this.vadacodeTreeWalker.analyseProgram();

    const semanticTokens = this.vadacodeTreeWalker.tokens;

    // Signature help
    const signatureHelpBuilder = Container.get(SignatureHelpBuilder);
    this.signatureHelps = signatureHelpBuilder.buildFrom(this.vadacodeTreeWalker);

    // Diagnostics
    this._updateDiagnostics(); 

    this.existentialVariableTokens =
      this.vadacodeTreeWalker.existentialVariableTokens;
    this.markedNullVariableNodes =
      this.vadacodeTreeWalker.markedNullVariableTokens;
      
    this.harmfulVariableTokens = this.vadacodeTreeWalker.harmfulVariableTokens;
    this.dangerousVariableTokens =
      this.vadacodeTreeWalker.dangerousVariableTokens;
    this.usedInTaintedJoinVariableTokens =
      this.vadacodeTreeWalker.usedInTaintedJoinVariableTokens;

    this._tokens = semanticTokens;

    this.bindings = this.vadacodeTreeWalker.bindings;
  }

  private _updateDiagnostics() {
    const diagnostics = this.vadacodeTreeWalker!.diagnostics;

    const diagnosticProviders = [
      Container.get(AnnotationsDiagnosticProvider),
    ];

    for (const provider of diagnosticProviders) {
      const providedDiagnostics = provider.provideDiagnostics(this.vadacodeTreeWalker!);
      diagnostics.push(...providedDiagnostics);
    }
    const signatureDiagnosticProvider = Container.get(SignatureDiagnosticProvider);
    const signatureDiagnostics = signatureDiagnosticProvider.provideDiagnostics(this.signatureHelps, this.vadacodeTreeWalker!);
    diagnostics.push(...signatureDiagnostics);

    this._diagnostics = [...diagnostics, ...this._antlrDiagnostics];

    // Filter diagnostics based on the current fragment
    const fragmentContainment = applicableFragments();
    let relevantFragments = fragmentContainment[this.selectedFragment];
    if (!relevantFragments) {
      relevantFragments = fragmentContainment[DEFAULT_FRAGMENT];
    }
    this._fragmentViolationDiagnostics = this._diagnostics.filter((diagnostic: Diagnostic) => diagnostic.data && diagnostic.data.fragmentViolation);
    this._diagnostics = this._diagnostics.filter((diagnostic: Diagnostic) => {
      if (diagnostic.data && diagnostic.data.fragmentViolation) {
        // Keep only diagnostics that are relevant to the current fragment
        return relevantFragments.includes(diagnostic.data.fragmentViolation);
      } else {
        // Keep diagnostics without fragment violations
        return true;
      }
    });
  }

  autoDetectFragment(): Fragment {
    this.refresh();
    const { stillValid, mostSpecific } = classify(this._fragmentViolationDiagnostics);
    this.selectedFragment = mostSpecific[0] || 'Datalog ∃';
    this.refresh();
    return this.selectedFragment;
  }
}
