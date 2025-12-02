// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Description of all builtin Datalog+/- predicates for signature help features.
 */

import { DatalogpmSignatureHelp } from "./datalogpm/common";

/**
 * Builtin Datalog+/- predicates.
 */
const BUILTINS: DatalogpmSignatureHelp[] = [
  {
    name: "@bind",
    signature:
      '@bind("atomName", "dataSource", "outermostContainer", "innermostContainer").',
    documentation: "Binds an input or output atom to a source.",
    terms: [
      {
        label: "atomName",
        documentation: "Atom to be bound",
      },
      {
        label: "dataSource",
        documentation:
          "Name of a data source as defined in reasoner configuration",
      },
      {
        label: "outermostContainer",
        documentation:
          "Container in the data source (e.g., a schema in a relational database)",
      },
      {
        label: "innermostContainer",
        documentation:
          "Content in the data source (e.g. a table in a relational database)",
      },
    ],
  },
  {
    name: "@implement",
    signature: '@implement("implementationName", "language", "module", "functionName").',
    documentation:
      "Declares an external implementation defined in Java or Python. The syntax varies according to the annotation depending on the language used.",
    terms: [
      {
        label: "implementationName",
        documentation: "Name of the function to be implemented, it's the symbol that you want to use in the program.",
      },
      {
        label: "language",
        documentation: "Language of external implementation, can be 'java' or 'python'.",
      },
      {
        label: "module",
        documentation: "Java: fully qualified name of the imported jar (e.g. `com.package1.className`). Python: the absolute path to Python module (e.g. `/Users/…​/pythonModule`).",
      },
      {
        label: "functionName",
        documentation: "Java: name of the static method. Python: the function in specified module.",
      },
    ],
  },
  {
    name: "@include",
    signature: '@include("moduleName").',
    documentation:
      "Defines dependencies between Datalog+/- modules.",
    terms: [
      {
        label: "moduleName",
        documentation: "Name of the module being included.",
      },
    ],
  },

  {
    name: "@input",
    signature: '@input("atomName").',
    documentation:
      "Marks an atom of the program to be imported from an external data source, for example a relational database.",
    terms: [
      {
        label: "atomName",
        documentation: "The atom to be imported from an external data source.",
      },
    ],
  },
  {
    name: "@library",
    signature: '@input("alias:", "libraryName"[, "methodName", "parameterString"]).',
    documentation:
      "Allows to import library functions implemented in the Java source.",
    terms: [
      {
        label: "alias",
        documentation: "Name the user wants to call the library as inside the program;",
      },
      {
        label: "libraryName",
        documentation: "Name of the library to invoke.",
      },
      {
        label: "methodName?",
        documentation: "Name of the method to import (optional).",
      },
      {
        label: "parameterString?",
        documentation: "String of parameters (optional, mainly used in the machine learning libraries).",
      },
    ],
  },
  {
    name: "@relaxedSafety",
    signature: '@relaxedSafety.',
    documentation:
      "Enables a mode of operation that accepts programs which may not be safe in general.",
    terms: [],
  },
  {
    name: "@output",
    signature: '@output("atomName").',
    documentation:
      "Marks an atom of the program to be exported to an external target, for example the standard output or a relational database.",
    terms: [
      {
        label: "atomName",
        documentation: "The atom to be exported to an external target.",
      },
    ],
  },
  {
    name: "@mapping",
    signature: '@mapping("atomName", positionInAtom, "columnName", "columnType").',
    documentation:
      "Maps specific columns of the input/output source to a position of an atom.",
    terms: [
      {
        label: "atomName",
        documentation: "The atom we want to map.",
      },
      {
        label: "positionInAtom",
        documentation: "0-based integer index denoting the position of the atom that we want to map.",
      },
      {
        label: "columnName",
        documentation: "Name of the column in the source (or equivalent data structure).",
      },
      {
        label: "columnType",
        documentation: "An indication of the type in the source (supported tyoes are: string, int, double, boolean and date).",
      },
    ],
  },
  {
    name: "@module",
    signature: '@module("moduleName").',
    documentation:
      "Defines the name of a module which can be included in other programs/modules using @include.",
    terms: [
      {
        label: "moduleName",
        documentation: "Module name to be declared.",
      },
    ],
  },
  {
    name: "@post",
    signature: '@post("atomName","directive").',
    documentation:
      "Specify a post-processing operation that is applied to facts of atoms annotated with `@output` before exporting the result into the target. ",
    terms: [
      {
        label: "atomName",
        documentation: "Name of the atom for which the post-processing is intended (atom must also be annotated with @output).",
      },
      {
        label: "directive",
        documentation: "Post-processing operation to be applied.",
      },
    ],
  },
  {
    name: "@qbind",
    signature: '@qbind("atomName", "data source", "outermost container", "query").',
    documentation:
      "Binds an input atom to a source, generating the facts for the atom as the result of a query executed on the source.",
    terms: [
      {
        label: "atomName",
        documentation: "the atom we want to bind",
      },
      {
        label: "data source",
        documentation: "the name of a data source defined in the reasoner configuration",
      },
      {
        label: "outermost container",
        documentation: "container in the data source (e.g., a schema in a relational database)",
      },
      {
        label: "query",
        documentation: "query in the language supported by the source (e.g., SQL for relational databases)",
      },
    ],
  },
  {
    name: "@saveChaseGraph",
    signature: '@saveChaseGraph.',
    documentation:
      "Enables the writing of a json file containing information about nodes proved during the chase procedure.",
    terms: [],
  },

];

export { BUILTINS };
