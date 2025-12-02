// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file EGD harmless diagnostics test.
 */

// Reflect metadata shim for TypeDi to work
import "reflect-metadata";

import * as assert from "assert";
import Container, { Service } from "typedi";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { DefinitionProviderService } from "../definition-provider.service";
import { DocumentManagerService } from "../document-manager.service";
import { DatalogpmDocument } from "../datalogpm/datalogpm-document";
import { ErrorTypes } from "../datalogpm/diagnostic-messages";

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
    filterErrorTypes: ErrorTypes[] = [],
  ): Promise<void> {
    // Prepare document and make it available to documentManagerService
    const textDocument = TextDocument.create(DOC_URI, "datalogpm", 0, content);

    const datalogpmDocument = new DatalogpmDocument(textDocument);


    let receivedDiagnostics = datalogpmDocument.diagnostics.map((diagnostic) => {
      const { relatedInformation, ...rest } = diagnostic;
      return rest;
    });
    if (filterErrorTypes.length > 0) {
      receivedDiagnostics = receivedDiagnostics.filter((diagnostic: Diagnostic) =>
        filterErrorTypes.includes(diagnostic.code as ErrorTypes)
      );
    }
    const nonHintReceivedDiagnostics = receivedDiagnostics.filter((diagnostic: Diagnostic) => diagnostic.severity != DiagnosticSeverity.Hint);
    
    assert.deepEqual(nonHintReceivedDiagnostics, expectedDiagnostics);
  }
}

suite("EGD harmless diagnostics", () => {
  test("should not report tainted join error for a program that uses two different tainted variables (1)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `% Bring in some data
parent_db("Parent", "Child").
sibling_db("Sibling1", "Sibling2").

% Everyone has a parent.
person(Person) :- parent_db(Person, _).
person(Person) :- parent_db(_, Person).
person(Person) :- sibling_db(Person, _).
person(Person) :- sibling_db(_, Person).

% Every person has a parent.
parent_of(Parent, Person) :- person(Person).
% Create parent relationships from ground data.
parent_of(Parent, Child) :- parent_db(Parent, Child).
% Every sibling has the same parent.
Parent1=Parent2 :- parent_of(Parent1, Child1), parent_of(Parent2, Child2), sibling_db(Child1, Child2).

% Every parent is an ancestor.
ancestor(Parent, Child) :- parent_of(Parent, Child).
% The parent of an ancestor is an ancestor.
ancestor(AncestorParent, Child) :- ancestor(AncestorParent, Ancestor), ancestor(Ancestor, Child).

@output("person").
@output("parent_of").
@output("ancestor").      
  `,
  [
    {
    code: ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0,
    codeDescription: {
      href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0}`
    },
    data: {
      fragmentViolation: "Warded"
    },
    message: "Variable 'Ancestor' is in a tainted position and used in join or filter operation. The program does not satisfy the EGDs harmless sufficient condition.",
    range: {
      end: {
      character: 68,
      line: 20
      },
      start: {
      character: 60,
      line: 20
      }
    },
    severity: 1,
    tags: []
    },
    {
    code: ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0,
    codeDescription: {
      href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0}`
    },
    data: {
      fragmentViolation: "Warded"
    },
    message: "Variable 'Ancestor' is in a tainted position and used in join or filter operation. The program does not satisfy the EGDs harmless sufficient condition.",
    range: {
      end: {
      character: 88,
      line: 20
      },
      start: {
      character: 80,
      line: 20
      }
    },
    severity: 1,
    tags: []
    }
  ]
  );
  });

  test("should not report tainted join error for a program that uses two different tainted variables (2)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `company("TechCorp").
company("InnovateInc").
company("FutureTech").
company("GreenSolutions").
company("EcoSystems").
company("SmartDevices").
company("NextGen").
  
nace("6201", "TechCorp").
nace("6202", "InnovateInc").
nace("6203", "FutureTech").
nace("6204", "GreenSolutions").
nace("6205", "EcoSystems").
nace("6206", "SmartDevices").
nace("6207", "NextGen").
  
activity(A,X) :- company(X).
  
competitor(X,Y,A) :- activity(A,X), activity(A,Y).
competitor(X,Y,A) :- competitor(X,Z,A), competitor(Z,Y,A).
  
A=B :- activity(A,X), activity(B,Y), nace(N,X), nace(N,Y).
  `,
  [
    {
    code: ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0,
    codeDescription: {
      href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0}`
    },
    data: {
      fragmentViolation: "Warded"
    },
    message: "Variable 'A' is in a tainted position and used in join or filter operation. The program does not satisfy the EGDs harmless sufficient condition.",
    range: {
      end: {
      character: 31,
      line: 18
      },
      start: {
      character: 30,
      line: 18
      }
    },
    severity: 1,
    tags: []
    },
    {
    code: ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0,
    codeDescription: {
      href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0}`
    },
    data: {
      fragmentViolation: "Warded"
    },
    message: "Variable 'A' is in a tainted position and used in join or filter operation. The program does not satisfy the EGDs harmless sufficient condition.",
    range: {
      end: {
      character: 46,
      line: 18
      },
      start: {
      character: 45,
      line: 18
      }
    },
    severity: 1,
    tags: []
    },
    {
    code: ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0,
    codeDescription: {
      href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0}`
    },
    data: {
      fragmentViolation: "Warded"
    },
    message: "Variable 'A' is in a tainted position and used in join or filter operation. The program does not satisfy the EGDs harmless sufficient condition.",
    range: {
      end: {
      character: 37,
      line: 19
      },
      start: {
      character: 36,
      line: 19
      }
    },
    severity: 1,
    tags: []
    },
    {
    code: ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0,
    codeDescription: {
      href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0}`
    },
    data: {
      fragmentViolation: "Warded"
    },
    message: "Variable 'A' is in a tainted position and used in join or filter operation. The program does not satisfy the EGDs harmless sufficient condition.",
    range: {
      end: {
      character: 56,
      line: 19
      },
      start: {
      character: 55,
      line: 19
      }
    },
    severity: 1,
    tags: []
    }
  ], [ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0]
  );
  });

    test("should report harmful condition only for TGDs and not EGDs", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `
% Bring in some data
parent_db("Parent", "Child").
sibling_db("Sibling1", "Sibling2").

% Everyone has a parent.
person(Person) :- parent_db(Person, _).
person(Person) :- parent_db(_, Person).
person(Person) :- sibling_db(Person, _).
person(Person) :- sibling_db(_, Person).

% Every person has a parent.
parent_of(Parent, Person) :- person(Person).
% Create parent relationships from ground data.
parent_of(Parent, Child) :- parent_db(Parent, Child).
% Every sibling has the same parent.
Parent1=Parent2 :- parent_of(Parent1, Child1), parent_of(Parent1, Child2), sibling_db(Child1, Child2).

% Every parent is an ancestor.
ancestor(Parent, Child) :- parent_of(Parent, Child).
% The parent of an ancestor is an ancestor.
ancestor(AncestorParent, Child) :- ancestor(AncestorParent, Ancestor), ancestor(Ancestor, Child).

@output("person").
@output("parent_of").
@output("ancestor").      
  `,
  [    
    {
    code: ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0,
    codeDescription: {
      href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0}`
    },
    data: {
      fragmentViolation: "Warded"
    },
    message: "Variable 'Ancestor' is in a tainted position and used in join or filter operation. The program does not satisfy the EGDs harmless sufficient condition.",
    range: {
      end: {
      character: 68,
      line: 21
      },
      start: {
      character: 60,
      line: 21
      }
    },
    severity: 1,
    tags: []
    },
    {
    code: ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0,
    codeDescription: {
      href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0}`
    },
    data: {
      fragmentViolation: "Warded"
    },
    message: "Variable 'Ancestor' is in a tainted position and used in join or filter operation. The program does not satisfy the EGDs harmless sufficient condition.",
    range: {
      end: {
      character: 88,
      line: 21
      },
      start: {
      character: 80,
      line: 21
      }
    },
    severity: 1,
    tags: []
    }  
  ]
  );
  });


    test("should detect safe taintedness violation in a rule far from the EGD", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `% Direct PSP connections
psp_connected("PSP1", "PSP2").
psp_connected("PSP2", "PSP3").
psp_connected("PSP3", "PSP1").

% For each PSP, there exists a group (existential variable)
psp_group(P, G) :- psp_connected(P, _).

% For each pair of connected PSPs, their groups must be equal (EGD)
G1 = G2 :- psp_group(P1, G1), psp_group(P2, G2), psp_connected(P1, P2).

% Intermediaries and their PSPs
intermediary("BankA", "PSP1").
intermediary("BankB", "PSP2").
intermediary("BankC", "PSP3").

% Customers and their accounts
account("Alice", "BankA").
account("Bob", "BankB").
account("Carol", "BankC").

% Customers are connected if their intermediaries' PSPs have the same group
customer_connected(X, Y) :- 
  account(X, I1), intermediary(I1, P1), psp_group(P1, G),
  account(Y, I2), intermediary(I2, P2), psp_group(P2, G).

@output("customer_connected").
@post("customer_connected", "unique").     
    `,
  [
    {
    code: ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0,
    codeDescription: {
      href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0}`
    },
    data: {
      fragmentViolation: "Warded"
    },
    message: "Variable 'G' is in a tainted position and used in join or filter operation. The program does not satisfy the EGDs harmless sufficient condition.",
    range: {
      end: {
      character: 55,
      line: 23
      },
      start: {
      character: 54,
      line: 23
      }
    },
    severity: 1,
    tags: []
    },
    {
    code: ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0,
    codeDescription: {
      href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IS_EGD_HARMFUL_0}`
    },
    data: {
      fragmentViolation: "Warded"
    },
    message: "Variable 'G' is in a tainted position and used in join or filter operation. The program does not satisfy the EGDs harmless sufficient condition.",
    range: {
      end: {
      character: 55,
      line: 24
      },
      start: {
      character: 54,
      line: 24
      }
    },
    severity: 1,
    tags: []
    }
  ]
  );
  });


    test("should report constants used in affected positions", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `activity(A,X) :- company(X).
 
competitor(X,Y,A) :- activity(A,X), activity(A,Y).
competitor(X,Y,A) :- competitor(X,Z,"3"), competitor(Z,Y,A).
 
A=B :- activity(A,X), activity("B",Y), nace(N,X), nace(N,Y).    
`,
[
  {
    "code": ErrorTypes.ERR_CONSTANT_USED_IN_TAINTED_POSITION,
    "codeDescription": {
      "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_CONSTANT_USED_IN_TAINTED_POSITION}`
    },
    "message": "No constants are allowed in tainted positions to guarantee Safe taintedness condition.",
    "range": {
      "end": {
        "character": 34,
        "line": 5
      },
      "start": {
        "character": 31,
        "line": 5
      }
    },
    "severity": DiagnosticSeverity.Error,
    "tags": [],
        "data": {
      "fragmentViolation": "Warded"
    }    
  },
], [ErrorTypes.ERR_CONSTANT_USED_IN_TAINTED_POSITION]
);
  });

});
