// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Service to manage the documents registered in a Language Server.
 */

import { Subject } from "rxjs";
import { Service } from "typedi";
import { TextDocument } from "vscode-languageserver-textdocument";
import { SemanticTokens } from "vscode-languageserver/node";
import { DEFAULT_FRAGMENT, Fragment } from './isomorphic';
import { SemanticProviderService } from "./semantic-provider.service";
import { VadacodeSettings } from "./datalogpm/settings";
import { DatalogpmDocument } from "./datalogpm/datalogpm-document";

/**
 * Document manager service.
 */
@Service()
export class DocumentManagerService {
  // Cache the settings of all open documents
  readonly datalogpmDocuments: Map<string, DatalogpmDocument> = new Map();

  //#region Selected Fragment
  _selectedFragment: Fragment = DEFAULT_FRAGMENT;

  set selectedFragment(fragment: Fragment) {
    this._selectedFragment = fragment;

    this.datalogpmDocuments.forEach((datalogpmDocument) => {
      datalogpmDocument.selectedFragment = fragment;
      datalogpmDocument.refresh();
    });
  }
  // getter for selectedFragment
  get selectedFragment(): Fragment {
    return this._selectedFragment;
  }
  //#endregion

  documentHasBeenUpdated$ = new Subject<DatalogpmDocument>();

  constructor(
    public semanticProviderService: SemanticProviderService
  ) {
    //this.moduleDependencyService.invalidatedModules$.subscribe(
    //  (moduleDefinition: ModuleDefinition) =>
    //    this._updateModuleDocument(moduleDefinition)
    //);
  }

  validateDocument() {
    throw new Error("Method not implemented.");
  }

  delete(uri: string) {
    this.datalogpmDocuments.delete(uri);
  }

  clearSettings(uri?: string) {
    throw new Error("Method not implemented.");
  }

  getSettings(resource: string): VadacodeSettings {
    throw new Error("Method not implemented.");
  }

  setSettings(resource: string, result: VadacodeSettings) {
    throw new Error("Method not implemented.");
  }

  /**
   * Set the contents of a document.
   *
   * @param uri URI of the document.
   * @param textDocument Text document.
   * @returns Datalog+/- Document.
   */
  setContents(uri: string, textDocument: TextDocument) {

    const datalogpmDocument = new DatalogpmDocument(
      textDocument,
      this.selectedFragment
    );
    this.datalogpmDocuments.set(uri, datalogpmDocument);

    return datalogpmDocument;
  }

  provideDocumentSemanticTokens(uri: string): SemanticTokens {
    const datalogpmDocument = this.datalogpmDocuments.get(uri);
    if (datalogpmDocument && datalogpmDocument.documentTokens) {
      const tokens = this.semanticProviderService.provideDocumentSemanticTokens(
        datalogpmDocument.documentTokens
      );
      return tokens;
    } else {
      return { data: [] };
    }
  }

  get(uri: string) {
    return this.datalogpmDocuments.get(uri);
  }

  has(uri: string) {
    return !!this.datalogpmDocuments.get(uri);
  }

  mapDocuments(callback: (datalogpmDocument: DatalogpmDocument) => void) {
    return this.datalogpmDocuments.forEach((value, _key, _map) => {
      return callback(value);
    });
  }

}
