// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Vadacode Language Server (LSP). Has the responsibility of
 * registering all the LSP features.
 *
 * @see {https://github.com/microsoft/vscode-languageserver-node/blob/main/testbed/server/src/server.ts voscode LSP testbed}
 * for further implementation examples.
 */

import {
  CodeAction,
  CodeActionParams,
  CodeLens,
  CodeLensParams,
  Command,
  Definition,
  DefinitionLink,
  DefinitionParams,
  DidChangeConfigurationNotification,
  DocumentSymbol,
  DocumentSymbolParams,
  InitializeParams,
  InitializeResult,
  InlayHintParams,
  LocationLink,
  ProposedFeatures,
  ReferenceParams,
  RenameParams,
  ResultProgressReporter,
  SemanticTokens,
  SemanticTokensParams,
  SignatureHelp,
  SignatureHelpParams,
  SymbolInformation,
  TextDocumentChangeEvent,
  TextDocumentSyncKind,
  TextDocuments,
  WorkDoneProgressReporter,
  WorkspaceEdit,
  WorkspaceSymbol,
  WorkspaceSymbolParams,
  createConnection
} from "vscode-languageserver/node";

import {
  CancellationToken,
  CompletionItem,
  Hover,
  Location,
  TextDocumentPositionParams,
} from "vscode-languageserver/node";

import { Service } from "typedi";
import { TextDocument } from "vscode-languageserver-textdocument";

import {
  SemanticTokenModifiers,
  SemanticTokenTypes,
} from "./semantic-provider.service";

import { CodeActionsProviderService } from "./code-actions-provider.service";
import { CompletionProviderService } from "./completion-provider.service";
import { DefinitionProviderService } from "./definition-provider.service";
import { HoverProviderService } from "./hover-provider.service";
import { ReferenceProviderService } from "./reference-provider.service";
import { RenameEditsService } from "./rename-edits.service";
import { SignatureHelpProviderService } from "./signature-help-provider.service";
import { SymbolProviderService } from "./symbol-provider.service";
import { DEFAULT_SETTINGS, VadacodeSettings } from "./datalogpm/settings";

import { CodeLensProviderService } from './codelens-provider.service';
import { DocumentManagerService } from "./document-manager.service";
import { InlayHintsService } from './inlay-hints.service';
import { Fragment, LANGUAGE_ID } from "./isomorphic";
import { DatalogpmBinding } from './datalogpm/common';
import { DatalogpmDocument } from "./datalogpm/datalogpm-document";

function initializeLanguageServer(
  params: InitializeParams,
  lspServer: LspServer
): InitializeResult {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  lspServer.hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  lspServer.hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  lspServer.hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      // Tell the client that this server supports code completion.
      completionProvider: {
        triggerCharacters: [",", "@"],
        resolveProvider: true,
        allCommitCharacters: ["("],
        completionItem: {
          labelDetailsSupport: true,
        },
      },
      semanticTokensProvider: {
        documentSelector: null,
        legend: {
          tokenTypes: SemanticTokenTypes,
          tokenModifiers: SemanticTokenModifiers,
        },
        full: true,
        range: false,
      },
      signatureHelpProvider: {
        triggerCharacters: ["("],
        retriggerCharacters: [","],
      },
      referencesProvider: true,
      hoverProvider: true,
      definitionProvider: true,
      documentSymbolProvider: true,
      renameProvider: true,
      codeActionProvider: true,
      workspaceSymbolProvider: true,
      inlayHintProvider: {
        documentSelector: [{ language: LANGUAGE_ID }],
        resolveProvider: true,
      },
      inlineValueProvider: {
        documentSelector: [{ language: LANGUAGE_ID }],
      },
      codeLensProvider: {
        resolveProvider: true,
      },
    },
  };

  result.capabilities.workspace = {
    workspaceFolders: {
      supported: true,
    },
  };
  return result;
}

@Service()
export class LspServer {
  // Create a connection for the server, using Node's IPC as a transport.
  // Also include all preview / proposed LSP features.
  connection = createConnection(ProposedFeatures.all);

  // Create a simple text document manager.
  documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

  hasConfigurationCapability = false;
  hasWorkspaceFolderCapability = false;
  hasDiagnosticRelatedInformationCapability = false;

  // The workspace folder this server is operating on
  workspaceFolder?: string;

  datalogpmFiles = new Set<string>();

  // The global settings, used when the `workspace/configuration` request is not supported by the client.
  // Please note that this is not the case when using this server with the client provided in this example
  // but could happen with other clients.
  readonly defaultSettings = DEFAULT_SETTINGS;
  globalSettings: VadacodeSettings = this.defaultSettings;

  /**
   * Language Server constructor.
   * @param completionProviderService Completion provider service, to support Code completion.
   * @param referenceProviderService Reference provider service, to support Find References.
   * @param hoverProviderService Hover provider service, to support Hover information.
   * @param documentManagerService Document manager service, to manage text documents.
   * @param signatureHelpProviderService Signature help provider service, to support Signature Help.
   * @param definitionProviderService Definition provider service, to support Go to Definition.
   * @param symbolProviderService Symbol provider service, to support Document Symbols.
   * @param renameEditsService Rename edits service, to support Rename Symbol.
   * @param codeActionsProviderService Code actions provider service, to support Code Actions.
   * @param inlayHintsProviderService Inlay hints provider service, to support Inlay Hints.
   */
  constructor(
    public completionProviderService: CompletionProviderService,
    public referenceProviderService: ReferenceProviderService,
    public hoverProviderService: HoverProviderService,
    public documentManagerService: DocumentManagerService,
    public signatureHelpProviderService: SignatureHelpProviderService,
    public definitionProviderService: DefinitionProviderService,
    public symbolProviderService: SymbolProviderService,
    public renameEditsService: RenameEditsService,
    public codeActionsProviderService: CodeActionsProviderService,
    public inlayHintsProviderService: InlayHintsService,
    public codeLensProviderService: CodeLensProviderService
  ) {
    this.connection.console.log("🚀 Creating server...");

    this.renameEditsService.connection = this.connection;
    this.referenceProviderService.connection = this.connection;

    this._lspBoilerplate();

    // The settings have changed. Is sent on server start as well.
    this.connection.onDidChangeConfiguration(async (change: any) => {
      this.connection.console.log(`[LSP] Settings changed: ${change}`);
      // Reset all cached document settings
      if (this.hasConfigurationCapability) {
        // Reset all cached document settings
        // this.documentSettings.clear();
        // this.documentManagerService.clearSettings();
      } else {
        this.globalSettings = <VadacodeSettings>(
          (change.settings.vadacode || this.defaultSettings)
        );
      }

    });

    // Only keep settings for open documents
    this.documents.onDidClose((e) => {
      this.connection.console.log(`[LSP] Document closed: ${e.document.uri}`);
      // Remove the document from the
      this.documentManagerService.delete(e.document.uri);
      this.connection.sendDiagnostics({
        uri: e.document.uri,
        diagnostics: []
      });
    });

    // The content of a text document has changed. This event is emitted
    // when the text document first opened or when its content has changed.
    this.documents.onDidChangeContent(
      (textDocumentChangeEvent: TextDocumentChangeEvent<TextDocument>) => {
        this.documentDidChangeContents(textDocumentChangeEvent.document);
      }
    );

    // Make the text document manager listen on the connection
    // for open, change and close text document events
    this.documents.listen(this.connection);

    // A text document managed by this manager has been opened.
    this.documents.onDidOpen((event) => {
      this.connection.console.log(
        `[Server(${process.pid}) Document opened: ${event.document.uri}`
      );
    });

    // Listen on the connection
    this.connection.listen();

    // Register notifications from the client
    this.connection.onNotification(
      "vadacode.showTextDocument",
      (fsPath: string) => {
        const document = this.documents.get(fsPath);
        if (document) {
          this.documentDidChangeContents(document);
        }
      }
    );

    this.connection.onNotification(
      "workspace/didChangeFragment",
      ({fragment}: {fragment: Fragment}) => {
        // Set the fragment at document manager level
        if (this.documentManagerService.selectedFragment !== fragment) {
          this.connection.console.log(`[LSP] Fragment changed: ${fragment}`);
          this.documentManagerService.selectedFragment = fragment;
          // Force update of all diagnostics
          this.documents.all().forEach((doc: TextDocument) => {
            const datalogpmDocument = this.documentManagerService.get(doc.uri);
            if (datalogpmDocument) {
              this.sendDiagnostics(datalogpmDocument);
            }
          });
        }
      }
    );

    this.connection.onNotification(
      "workspace/autoDetectFragment",
      ({uri}: {uri: string}) => {
        const datalogpmDocument = this.documentManagerService.get(uri);
        if (datalogpmDocument) {
          const fragment = datalogpmDocument.autoDetectFragment();
          this.connection.sendNotification("workspace/didChangeFragment", {
            fragment,
          });
          this.sendDiagnostics(datalogpmDocument);
        }
      }
    );

    this.connection.onNotification(
      "workspace/bindingTested",
      ({document, binding, result}: {document: TextDocument, binding: DatalogpmBinding, result: string}) => {
        codeLensProviderService.updateBindingTestResult(
          binding,
          result
        );
        this.connection.sendNotification("workspace/codeLens/refresh");
      }
    );

    this.documentManagerService.documentHasBeenUpdated$.subscribe(
      (datalogpmDocument: DatalogpmDocument) => {
        this.sendDiagnostics(datalogpmDocument);
      }
    );

    // Register handler for CodeAction requests.
    this._registerCodeActionFeature();

    // Register handler for semantic tokens.
    this._registerSemanticTokensFeature();

    // Register handler for references features.
    this._registerReferencesFeature();

    // Register handler for completion features.
    this._registerCompletionFeature();

    // Register handler for signature help features.
    this._registerSignatureHelpFeature();

    // Register handler for hover features.
    this._registerHoverFeature();

    // Register handler for "go to definition" features.
    this._registerGoToDefinitionFeature();

    // Register handler for document symbol features.
    this._registerDocumentSymbolFeature();

    // Register handler for workspace symbol features.
    this._registerWorkspaceSymbolFeature();

    // Register handler for inlay hints features.
    this._registerInlayHintFeature();

    // Register handler for rename feature.
    this._registerRenameFeature();

    // Register handler for CodeLens feature.
    this._registerCodeLensFeature();
  }

  private _registerRenameFeature() {
    this.connection.onRenameRequest(
      (
        renameParams: RenameParams,
        token: CancellationToken,
        workDoneProgress: WorkDoneProgressReporter
      ): Promise<WorkspaceEdit | undefined> | undefined => {
        const datalogpmDocument = this.documentManagerService.get(
          renameParams.textDocument.uri
        );
        if (datalogpmDocument) {
          return this.renameEditsService.provideRenameEdits(
            datalogpmDocument,
            renameParams.position,
            renameParams.newName
          );
        }
      }
    );
  }

  /**
   * Register the CodeLens feature.
   * 
   * @remarks CodeLens are inline notes and actions that appear above
   * relevant code in the editor. They provide contextual information and
   * actionable commands without cluttering the code itself.
   * 
   * @see https://code.visualstudio.com/api/language-extensions/programmatic-language-features#codelens-show-actionable-context-information-within-source-code
   */
  private _registerCodeLensFeature() {
    this.connection.onCodeLens(
      (
        codeLensParams: CodeLensParams
      ): Promise<CodeLens[] | undefined> => {
          const datalogpmDocument = this.documentManagerService.get(
            codeLensParams.textDocument.uri
          );
          if (datalogpmDocument) {
            return this.codeLensProviderService.provideCodeLens(
              datalogpmDocument
            );
          } else {
            return Promise.resolve([]);
          }
      }
    );
  }

  /**
   * Register the Inlay Hint feature.
   */
  private _registerInlayHintFeature() {
    this.connection.languages.inlayHint.on((inlayHintParams: InlayHintParams) => {
      const datalogpmDocument = this.documentManagerService.get(
        inlayHintParams.textDocument.uri
      );
      if (datalogpmDocument) {
        return this.inlayHintsProviderService.provideInlayHints(
          datalogpmDocument,
          inlayHintParams.range
        );
      }
      return [];
    });

    this.connection.languages.inlayHint.resolve((hint) => {
      return this.inlayHintsProviderService.resolve(hint);
    });
  }

  /**
   * Register the Workspace Symbol feature.
   */
  private _registerWorkspaceSymbolFeature() {
    this.connection.onWorkspaceSymbol(
      (
        workspaceSymbolParams: WorkspaceSymbolParams,
        token: CancellationToken,
        workDoneProgress: WorkDoneProgressReporter,
        resultProgress?: ResultProgressReporter<
          SymbolInformation[] | DocumentSymbol[]
        >
      ):
        | Promise<SymbolInformation[] | WorkspaceSymbol[] | undefined>
        | undefined => {
        return undefined;
      }
    );
  }

  /**
   * Register the Document Symbol feature.
   */
  private _registerDocumentSymbolFeature() {
    this.connection.onDocumentSymbol(
      (
        documentSymbolParams: DocumentSymbolParams,
        token: CancellationToken,
        workDoneProgress: WorkDoneProgressReporter,
        resultProgress?: ResultProgressReporter<
          SymbolInformation[] | DocumentSymbol[]
        >
      ):
        | Promise<SymbolInformation[] | DocumentSymbol[] | undefined>
        | undefined => {
        const datalogpmDocument = this.documentManagerService.get(
          documentSymbolParams.textDocument.uri
        );
        if (datalogpmDocument) {
          return this.symbolProviderService.provideDocumentSymbols(
            datalogpmDocument
          );
        }
      }
    );
  }

  /**
   * Register the "Go to Definition" feature.
   */
  private _registerGoToDefinitionFeature() {
    this.connection.onDefinition(
      (
        definitionParams: DefinitionParams,
        token: CancellationToken,
        workDoneProgress: WorkDoneProgressReporter,
        resultProgress?: ResultProgressReporter<Location[] | LocationLink[]>
      ): Promise<Definition | DefinitionLink[] | undefined> | undefined => {
        const datalogpmDocument = this.documentManagerService.get(
          definitionParams.textDocument.uri
        );
        if (datalogpmDocument) {
          return this.definitionProviderService.provideDefinitionInformation(
            datalogpmDocument,
            definitionParams.position
          );
        }
      }
    );
  }

  /**
   * Register the Hover feature.
   */
  private _registerHoverFeature() {
    this.connection.onHover(
      (
        textDocumentPositionParams: TextDocumentPositionParams,
        token: CancellationToken
      ): Hover | undefined => {
        const datalogpmDocument = this.documentManagerService.get(
          textDocumentPositionParams.textDocument.uri
        );
        if (datalogpmDocument) {
          return this.hoverProviderService.provideHoverInformation(
            datalogpmDocument,
            textDocumentPositionParams.position
          );
        }
      }
    );
  }

  /**
   * Register the Signature Help feature.
   */
  private _registerSignatureHelpFeature() {
    this.connection.onSignatureHelp(
      async (
        signatureHelpParams: SignatureHelpParams,
        token: CancellationToken,
        workDoneProgress: WorkDoneProgressReporter,
        resultProgress?: ResultProgressReporter<CompletionItem[]>
      ): Promise<SignatureHelp | undefined> => {
        const datalogpmDocument = this.documentManagerService.get(
          signatureHelpParams.textDocument.uri
        );
        if (datalogpmDocument) {
          return this.signatureHelpProviderService.provideSignatureHelp(
            datalogpmDocument,
            signatureHelpParams.position,
            token,
            signatureHelpParams.context
          );
        } else {
          return undefined;
        }
      }
    );
  }

  /**
   * Register the Completion feature.
   */
  private _registerCompletionFeature() {
    this.connection.onCompletion(
      async (
        textDocumentPositionParams: TextDocumentPositionParams,
        token: CancellationToken,
        workDoneProgress: WorkDoneProgressReporter,
        resultProgress?: ResultProgressReporter<CompletionItem[]>
      ): Promise<CompletionItem[]> => {
        const datalogpmDocument = this.documentManagerService.get(
          textDocumentPositionParams.textDocument.uri
        );
        if (datalogpmDocument) {
          return this.completionProviderService.provideCompletionItems(
            datalogpmDocument,
            textDocumentPositionParams.position,
            token,
            workDoneProgress,
            resultProgress
          );
        } else {
          return [];
        }
      }
    );

    // Register handler for when completion is resolved.
    this.connection.onCompletionResolve(
      (item: CompletionItem): CompletionItem => {
        return item;
      }
    );
  }

  /**
   * Register the References feature.
   */
  private _registerReferencesFeature() {
    this.connection.onReferences(
      (
        params: ReferenceParams
      ): Promise<Location[] | undefined> | undefined => {
        const datalogpmDocument = this.documentManagerService.get(
          params.textDocument.uri
        );
        if (datalogpmDocument) {
          return this.referenceProviderService.provideReferences(
            datalogpmDocument,
            params.context,
            params.position,
            params.partialResultToken,
            params.workDoneToken
          );
        }
      }
    );
  }

  /**
   * Register the Semantic Tokens feature.
   */
  private _registerSemanticTokensFeature() {
    this.connection.languages.semanticTokens.on(
      (params: SemanticTokensParams): SemanticTokens => {
        return this.documentManagerService.provideDocumentSemanticTokens(
          params.textDocument.uri
        );
      }
    );
  }

  /**
   * Register the Code Action feature.
   */
  private _registerCodeActionFeature() {
    this.connection.onCodeAction(
      (
        params: CodeActionParams
      ): Promise<(Command | CodeAction)[] | undefined> | undefined => {
        const datalogpmDocument = this.documentManagerService.get(
          params.textDocument.uri
        );
        if (datalogpmDocument) {
          return this.codeActionsProviderService.provideCodeActions(
            datalogpmDocument,
            params.context,
            params.range
          );
        }

        return;
      }
    );
  }

  private _lspBoilerplate() {
    this.connection.onInitialize((params: InitializeParams) => {
      return initializeLanguageServer(params, this);
    });

    // handler for the initialized notification.
    this.connection.onInitialized(() => {
      if (this.hasConfigurationCapability) {
        // Register for all configuration changes.
        this.connection.client.register(
          DidChangeConfigurationNotification.type,
          undefined
        );
      }
    });
  }

  /**
   * Get the settings for a document.
   * @param resource The URI of the document.
   * @returns The settings for the document.
   */
  async getDocumentSettings(resource: string): Promise<VadacodeSettings> {
    if (!this.hasConfigurationCapability) {
      return this.globalSettings;
    }
    const result: VadacodeSettings = this.documentManagerService.getSettings(resource);
    return result;
  }

  /**
   * Handle document changes.
   *
   * @remarks
   * This method is called when a text document has changed.
   * It updates the document in the document manager, updates the module dependencies, and sends diagnostics to the client.
   *
   * @param doc The text document that has changed.
   * @returns void
   *
   */
  documentDidChangeContents(doc: TextDocument) {
    const uri = doc.uri;

    const datalogpmDocument = this.documentManagerService.setContents(uri, doc);

    // All Datalog+/- files have been consumed, we can now evaluate diagnostics and so on
    // this.connection.languages.diagnostics.refresh();
    this.sendDiagnostics(datalogpmDocument);
  }

  /**
   * Handle changes in all documents.
   */
  documentsDidChangeContents() {
    this.documents.all().forEach((doc) => this.documentDidChangeContents(doc));
  }

  /**
   * Send diagnostics for a Datalog+/- Document.
   * @param datalogpmDocument The Datalog+/- Document to send diagnostics for.
   */
  sendDiagnostics(datalogpmDocument: DatalogpmDocument) {
    const diagnostics = datalogpmDocument.diagnostics || [];
    this.connection.sendDiagnostics({
      uri: datalogpmDocument._textDocument.uri,
      diagnostics,
    });
  }
}
