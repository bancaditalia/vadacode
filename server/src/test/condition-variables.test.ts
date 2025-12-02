// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Binding hints diagnostics test.
 */

// Reflect metadata shim for TypeDi to work
import "reflect-metadata";

import * as assert from "assert";
import Container, { Service } from "typedi";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
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
    expectedDiagnostics: Diagnostic[],
    errorTypes: ErrorTypes[] = []
  ): Promise<void> {
    // Prepare document and make it available to documentManagerService
    const textDocument = TextDocument.create(DOC_URI, "datalogpm", 0, content);

    const datalogpmDocument = new DatalogpmDocument(textDocument);

    let receivedDiagnostics = datalogpmDocument.diagnostics.map((diagnostic) => {
      const { relatedInformation, ...rest } = diagnostic;
      return rest;
    });
    if (errorTypes.length > 0) {
      receivedDiagnostics = receivedDiagnostics.filter((diagnostic) =>
        errorTypes.includes(diagnostic.code as ErrorTypes)
      );
    }

    assert.deepEqual(receivedDiagnostics, expectedDiagnostics);
  }
}

suite("Cycle detection in condition variables", () => {

  test("should not report errors without cycles", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `a(1).
b(R) :- a(X), Z=4.
@output("b").
`,
  [], [ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES]
    );
  });

  test("should report errors with a single cycle", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `a(1).
b(R) :- a(X), Z=X+1, W=Z+R, R=Z+W.
@output("b").
`,
  [{
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 15,
        "line": 1
      },
      "start": {
        "character": 14,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 24,
        "line": 1
      },
      "start": {
        "character": 23,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 31,
        "line": 1
      },
      "start": {
        "character": 30,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 11,
        "line": 1
      },
      "start": {
        "character": 10,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 17,
        "line": 1
      },
      "start": {
        "character": 16,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 3,
        "line": 1
      },
      "start": {
        "character": 2,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 26,
        "line": 1
      },
      "start": {
        "character": 25,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 29,
        "line": 1
      },
      "start": {
        "character": 28,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 22,
        "line": 1
      },
      "start": {
        "character": 21,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 33,
        "line": 1
      },
      "start": {
        "character": 32,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  }], [ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES]
    );
  });

  test("should report errors with a single cycle (multiple components)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `a(1).
b(R) :- a(X), Z=X+1, B=4, W=Z+R, K=1, R=Z+W.
@output("b").
`,
  [{
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 15,
        "line": 1
      },
      "start": {
        "character": 14,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 29,
        "line": 1
      },
      "start": {
        "character": 28,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 41,
        "line": 1
      },
      "start": {
        "character": 40,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES,
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 11,
        "line": 1
      },
      "start": {
        "character": 10,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 17,
        "line": 1
      },
      "start": {
        "character": 16,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 3,
        "line": 1
      },
      "start": {
        "character": 2,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 31,
        "line": 1
      },
      "start": {
        "character": 30,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 39,
        "line": 1
      },
      "start": {
        "character": 38,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 27,
        "line": 1
      },
      "start": {
        "character": 26,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 43,
        "line": 1
      },
      "start": {
        "character": 42,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  }], [ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES]
    );
  });

  test("should report errors with multiple cycles ", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `a(1).
b(R) :- a(X), Z=X+1, B=K, W=Z+R, K=B, R=Z+W.
@output("b").
`,
  [{
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 15,
        "line": 1
      },
      "start": {
        "character": 14,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 29,
        "line": 1
      },
      "start": {
        "character": 28,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 41,
        "line": 1
      },
      "start": {
        "character": 40,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES,
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 11,
        "line": 1
      },
      "start": {
        "character": 10,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 17,
        "line": 1
      },
      "start": {
        "character": 16,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 3,
        "line": 1
      },
      "start": {
        "character": 2,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 31,
        "line": 1
      },
      "start": {
        "character": 30,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 39,
        "line": 1
      },
      "start": {
        "character": 38,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 27,
        "line": 1
      },
      "start": {
        "character": 26,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (Z, X, R, W).",
    "range": {
      "end": {
        "character": 43,
        "line": 1
      },
      "start": {
        "character": 42,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  }, 
  {
    "code": "1047",
    "codeDescription": {
      "href": "https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#1047"
    },
    "message": "Cycle detected in condition variables dependencies (B, K).",
    "range": {
      "end": {
        "character": 22,
        "line": 1
      },
      "start": {
        "character": 21,
        "line": 1
      }
    },
    "severity": 1,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": "https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#1047"
    },
    "message": "Cycle detected in condition variables dependencies (B, K).",
    "range": {
      "end": {
        "character": 36,
        "line": 1
      },
      "start": {
        "character": 35,
        "line": 1
      }
    },
    "severity": 1,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": "https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#1047"
    },
    "message": "Cycle detected in condition variables dependencies (B, K).",
    "range": {
      "end": {
        "character": 24,
        "line": 1
      },
      "start": {
        "character": 23,
        "line": 1
      }
    },
    "severity": 1,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": "https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#1047"
    },
    "message": "Cycle detected in condition variables dependencies (B, K).",
    "range": {
      "end": {
        "character": 34,
        "line": 1
      },
      "start": {
        "character": 33,
        "line": 1
      }
    },
    "severity": 1,
    "tags": []
  }

], [ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES]
    );
  });


  test("should report errors with multiple cycles ", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `case("Case", 1).
caseName(Name) :- case(Name, _), W = Name + (7 + (W + 3)).
@output("caseName").  
`,
  [{
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (W, Name).",
    "range": {
      "end": {
        "character": 34,
        "line": 1
      },
      "start": {
        "character": 33,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (W, Name).",
    "range": {
      "end": {
        "character": 51,
        "line": 1
      },
      "start": {
        "character": 50,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": "1047",
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (W, Name).",
    "range": {
      "end": {
        "character": 13,
        "line": 1
      },
      "start": {
        "character": 9,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
  {
    "code": ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES,
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (W, Name).",
    "range": {
      "end": {
        "character": 27,
        "line": 1
      },
      "start": {
        "character": 23,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },
{
    "code": ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES,
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES}`
    },
    "message": "Cycle detected in condition variables dependencies (W, Name).",
    "range": {
      "end": {
        "character": 41,
        "line": 1
      },
      "start": {
        "character": 37,
        "line": 1
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": []
  },  
], [ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES]
    );
  });

});

