// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Mapping diagnostic test.
 */

// Reflect metadata shim for TypeDi to work
import "reflect-metadata";

import * as assert from "assert";
import Container, { Service } from "typedi";
import {
  Diagnostic,
  DiagnosticSeverity
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { DefinitionProviderService } from "../definition-provider.service";
import { DocumentManagerService } from "../document-manager.service";
import { ErrorTypes } from '../datalogpm/diagnostic-messages';
import { DatalogpmDocument } from "../datalogpm/datalogpm-document";

const DOC_URI = "test://test/test.vada";

@Service()
export class DiagnosticsTest {
  constructor(
    public definitionProviderService: DefinitionProviderService,
    public documentManagerService: DocumentManagerService
  ) {}

  async expectDiagnostics(
    content: string,
    expectedDiagnostics: Diagnostic[]
  ): Promise<void> {
    // Prepare document and make it available to documentManagerService
    const textDocument = TextDocument.create(DOC_URI, "datalogpm", 0, content);

    const datalogpmDocument = new DatalogpmDocument(textDocument);

    const receivedDiagnostics = datalogpmDocument.diagnostics.map((diagnostic) => {
      const { relatedInformation, ...rest } = diagnostic;
      return rest;
    });

    const nonHintReceivedDiagnostics = receivedDiagnostics.filter((diagnostic: Diagnostic) => diagnostic.severity != DiagnosticSeverity.Hint);
    
    assert.deepEqual(nonHintReceivedDiagnostics, expectedDiagnostics);
  }
}

suite("Mapping diagnostics", () => {
  test("should report an error if position is not an integer", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(`
@input("m").
@bind("m","postgres","doctors_source","Medprescriptions").
@mapping("m",0,"id","int").
@mapping("m","k","patient","string").
@mapping("m",2,"npi","int").
@mapping("m",3,"doctor","string").
@mapping("m",4,"spec","string").
@mapping("m",5,"conf","int").
`
      , [
        {
            "code": ErrorTypes.MAPPING_POSITION_MUST_BE_INDEX,
            codeDescription: {
              href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.MAPPING_POSITION_MUST_BE_INDEX}`
            },
            "message": "Mapping position must be an index (0-based) (instead it's '\"k\"').",
            "range": {
              "end": {
                "character": 16,
                "line": 4
              },
              "start": {
                "character": 13,
                "line": 4
              }
            },
            "severity": DiagnosticSeverity.Error,
            "tags": []
          }    ]);
  });

  test("should not report an error if everything is ok", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(`
@input("m").
@bind("m","postgres","doctors_source","Medprescriptions").
@mapping("m",0,"id","int").
@mapping("m",1,"patient","string").
@mapping("m",2,"npi","int").
@mapping("m",3,"doctor","string").
@mapping("m",4,"spec","string").
@mapping("m",5,"conf","int").`
      , []);
  });

  test("should not show diagnostics for allowed column types", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(`
@input("m").
@bind("m","postgres","doctors_source","Medprescriptions").
@mapping("m",0,"id","int").
@mapping("m",1,"patient","string").
@mapping("m",2,"npi","double").
@mapping("m",3,"doctor","date").
@mapping("m",4,"spec","list").
@mapping("m",5,"conf","set").
@mapping("m",6,"spec","unknown").
`, []);
  });

  test("should show diagnostics for non-allowed column types", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(`
@input("m").
@bind("m","postgres","doctors_source","Medprescriptions").
@mapping("m",0,"id","int2").
@mapping("m",1,"patient","xstring").
@mapping("m",2,"npi","dokuble").
`,

    [
      {
        "code": "1042",
        "codeDescription": {
          "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_UNKNOWN_MAPPING_COLUMN_TYPE}`
        },
        "message": "Column type '\"int2\"' is not recognized. Use one of the supported types: string, integer, double, date, boolean, set, list, unknown.",
        "range": {
          "end": {
            "character": 26,
            "line": 3
          },
          "start": {
            "character": 20,
            "line": 3
          }
        },
        "severity": DiagnosticSeverity.Error,
        "tags": []
      },
      {
        "code": "1042",
        "codeDescription": {
          "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_UNKNOWN_MAPPING_COLUMN_TYPE}`
        },
        "message": "Column type '\"xstring\"' is not recognized. Use one of the supported types: string, integer, double, date, boolean, set, list, unknown.",
        "range": {
          "end": {
            "character": 34,
            "line": 4
          },
          "start": {
            "character": 25,
            "line": 4
          }
        },
        "severity": DiagnosticSeverity.Error,
        "tags": []
      },
      {
        "code": "1042",
        "codeDescription": {
          "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_UNKNOWN_MAPPING_COLUMN_TYPE}`
        },
        "message": "Column type '\"dokuble\"' is not recognized. Use one of the supported types: string, integer, double, date, boolean, set, list, unknown.",
        "range": {
          "end": {
            "character": 30,
            "line": 5
          },
          "start": {
            "character": 21,
            "line": 5
          }
        },
        "severity": DiagnosticSeverity.Error,
        "tags": []
      }
    ]
);
  });

});
