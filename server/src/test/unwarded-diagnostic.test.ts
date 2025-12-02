// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Unwarded atom diagnostics test.
 */

// Reflect metadata shim for TypeDi to work
import "reflect-metadata";

import * as assert from "assert";
import Container, { Service } from "typedi";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { DefinitionProviderService } from "../definition-provider.service";
import { DocumentManagerService } from "../document-manager.service";
import { ErrorTypes } from "../datalogpm/diagnostic-messages";
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
    errorTypersFilter: ErrorTypes[] = []
  ): Promise<void> {
    // Prepare document and make it available to documentManagerService
    const textDocument = TextDocument.create(DOC_URI, "datalogpm", 0, content);

    const datalogpmDocument = new DatalogpmDocument(textDocument);

    let receivedDiagnostics = datalogpmDocument.diagnostics.map((diagnostic) => {
      const { relatedInformation, ...rest } = diagnostic;
      return rest;
    });
    let nonHintReceivedDiagnostics = receivedDiagnostics.filter((diagnostic: Diagnostic) => diagnostic.severity === DiagnosticSeverity.Error);

    if (errorTypersFilter.length > 0) {
      nonHintReceivedDiagnostics = nonHintReceivedDiagnostics.filter((diagnostic: Diagnostic) =>
        errorTypersFilter.includes(diagnostic.code as ErrorTypes)
      );
      receivedDiagnostics = receivedDiagnostics.filter((diagnostic: Diagnostic) =>
        errorTypersFilter.includes(diagnostic.code as ErrorTypes)
      );
    }
    
    assert.deepEqual(nonHintReceivedDiagnostics, expectedDiagnostics);
  }
}

suite("Unwarded atom diagnostics", () => {
  test("should not report a dangerous variable in the body if it does not appear in a join", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `% KeyPerson(x, p) → PSC(x, p)
% Company (x) → ∃p PSC(x, p)
% Control(y, x), PSC(y, f) → PSC(x, f)
% PSC(x, f), PSC(v, f), x > y → StrongLink(x, y)

@input("keyPerson").@bind("keyPerson", "csv", "/path", "file.csv").@mapping("keyPerson",0,"id","int").@mapping("keyPerson",1,"id2","int").
@input("company").@bind("company", "csv", "/path", "file.csv").@mapping("company",0,"id","int").
@input("control").@bind("control", "csv", "/path", "file.csv").@mapping("control",0,"id","int").@mapping("control",1,"id2","int").

psc(X, P) :- keyPerson(X, P).
psc(X, P) :- company (X).
psc(X, P) :- control(Y, X), psc(Y, P).
strongLink(X, Y) :- psc(X, P), psc(Y, P), X > Y.

@output("psc").
@output("strongLink").
`,
      []
    );
  });

  test("should not report a dangerous variable in the body if it does not appear in a join (recursion 1)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `% KeyPerson(x, p) → PSC(x, p)
% Company (x) → ∃p PSC(x, p)
% Control(y, x), PSC(y, f) → PSC(x, f)
% PSC(x, f), PSC(v, f), x > y → StrongLink(x, y)

@input("keyPerson").@bind("keyPerson", "csv", "/path", "file.csv").@mapping("keyPerson",0,"id","int").@mapping("keyPerson",1,"id2","int").
@input("company").@bind("company", "csv", "/path", "file.csv").@mapping("company",0,"id","int").
@input("control").@bind("control", "csv", "/path", "file.csv").@mapping("control",0,"id","int").@mapping("control",1,"id2","int").

psc(X, P) :- keyPerson(X, P).
psc(X, P) :- company (X).
fake(Y) :- company (X).
psc(X, P) :- control(Y, X), psc(Y, P), fake(P).
strongLink(X, Y) :- psc(X, P), psc(Y, P), X > Y.

@output("psc").
@output("strongLink").
`,
      [
        {
          code: ErrorTypes.ERR_VARIABLE_IS_UNWARDED_0,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IS_UNWARDED_0}`
          },             
          message:
            "Variable 'P' is dangerous and involved in a join; the program is not Warded Datalog±.",
          range: {
            end: {
              character: 36,
              line: 12,
            },
            start: {
              character: 35,
              line: 12,
            },
          },
          severity: DiagnosticSeverity.Error,
          tags: [],
          data: {
            fragmentViolation: "Warded"
          }          
        },
        {
          code: ErrorTypes.ERR_VARIABLE_IS_UNWARDED_0,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IS_UNWARDED_0}`
          },             
          message:
            "Variable 'P' is dangerous and involved in a join; the program is not Warded Datalog±.",
          range: {
            end: {
              character: 45,
              line: 12,
            },
            start: {
              character: 44,
              line: 12,
            },
          },
          severity: DiagnosticSeverity.Error,
          tags: [],
          data: {
            fragmentViolation: "Warded"
          }          
        },
      ]
    );
  });

  test("should report a dangerous variable in the body if it appears in a join (long propagation chain)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `% KeyPerson(x, p) → PSC(x, p)
% Company (x) → ∃p PSC(x, p)
% Control(y, x), PSC(y, f) → PSC(x, f)
% PSC(x, f), PSC(v, f), x > y → StrongLink(x, y)

@input("keyPerson").@bind("keyPerson", "csv", "/path", "file.csv").@mapping("keyPerson",0,"id","int").@mapping("keyPerson",1,"id2","int").
@input("company").@bind("company", "csv", "/path", "file.csv").@mapping("company",0,"id","int").
@input("control").@bind("control", "csv", "/path", "file.csv").@mapping("control",0,"id","int").@mapping("control",1,"id2","int").

psc(X, P) :- keyPerson(X, P).
psc(X, P) :- company (X).
fake4(Y) :- company (X).
fake3(Y) :- fake4(Y).
fake2(Y) :- fake3(Y).
fake1(Y) :- fake2(Y).
fake(Y) :- fake1(Y).
psc(X, P) :- control(Y, X), psc(Y, P), fake(P).
strongLink(X, Y) :- psc(X, P), psc(Y, P), X > Y.

@output("psc").
@output("strongLink").
`,
      [
        {
          code: ErrorTypes.ERR_VARIABLE_IS_UNWARDED_0,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IS_UNWARDED_0}`
          },             
          message:
            "Variable 'P' is dangerous and involved in a join; the program is not Warded Datalog±.",
          range: {
            end: {
              character: 36,
              line: 16,
            },
            start: {
              character: 35,
              line: 16,
            },
          },
          severity: DiagnosticSeverity.Error,
          tags: [],
          data: {
            fragmentViolation: "Warded"
          }          
        },
        {
          code: ErrorTypes.ERR_VARIABLE_IS_UNWARDED_0,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IS_UNWARDED_0}`
          },             
          message:
            "Variable 'P' is dangerous and involved in a join; the program is not Warded Datalog±.",
          range: {
            end: {
              character: 45,
              line: 16,
            },
            start: {
              character: 44,
              line: 16,
            },
          },
          severity: DiagnosticSeverity.Error,
          tags: [],
          data: {
            fragmentViolation: "Warded"
          }          
        },
      ]
    );
  });

  test("should report a dangerous variable in the body if it appears in a join (two terms with same predicate)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `company("a").

  % ...
  activity(Activity, Company) :- company(Company).
  % ...
  competitors(Competitor, Company, Activity) :- activity(Activity, Competitor),activity(Activity, "mybank").
  
  
  @output("competitors").`,
      [
        {
          code: ErrorTypes.ERR_VARIABLE_IS_UNWARDED_0,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IS_UNWARDED_0}`
          },             
          message:
            "Variable 'Activity' is dangerous and involved in a join; the program is not Warded Datalog±.",
          range: {
            end: {
              character: 65,
              line: 5,
            },
            start: {
              character: 57,
              line: 5,
            },
          },
          severity: DiagnosticSeverity.Error,
          tags: [],
          data: {
            fragmentViolation: "Warded"
          }          
        },
        {
          code: ErrorTypes.ERR_VARIABLE_IS_UNWARDED_0,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IS_UNWARDED_0}`
          },             
          message:
            "Variable 'Activity' is dangerous and involved in a join; the program is not Warded Datalog±.",
          range: {
            end: {
              character: 96,
              line: 5,
            },
            start: {
              character: 88,
              line: 5,
            },
          },
          severity: DiagnosticSeverity.Error,
          tags: [],
          data: {
            fragmentViolation: "Warded"
          }          
        },
      ]
    );
  });

  test("should report a dangerous variable in the body if it appears in a join (two terms with same predicate, Weakly Frontier Guarded program)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `edb1("a").
edb2("b").
idb1(X,Y) :- edb1(X).
idb2(Z,X) :- edb2(X).
idb3(X,Y,Z) :- idb1(X,Y), idb2(Z,X).
@output("idb3").`,
      [
        {
          code: ErrorTypes.ERR_VARIABLE_IS_UNWARDED_0,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IS_UNWARDED_0}`
          },             
          message:
            "Variable 'Y' is dangerous and involved in a join; the program is not Warded Datalog±.",
          range: {
            end: {
              character: 23,
              line: 4,
            },
            start: {
              character: 22,
              line: 4,
            },
          },
          severity: DiagnosticSeverity.Error,
          tags: [],
          data: {
            fragmentViolation: "Warded"
          }          
        },
        {
          code: ErrorTypes.ERR_VARIABLE_IS_UNWARDED_0,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IS_UNWARDED_0}`
          },             
          message:
            "Variable 'Z' is dangerous and involved in a join; the program is not Warded Datalog±.",
          range: {
            end: {
              character: 32,
              line: 4,
            },
            start: {
              character: 31,
              line: 4,
            },
          },
          severity: DiagnosticSeverity.Error,
          tags: [],
          data: {
            fragmentViolation: "Warded"
          }          
        }
      ], [ErrorTypes.ERR_VARIABLE_IS_UNWARDED_0]
    );
  });
  

});