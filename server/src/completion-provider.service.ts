// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Service to provide completion items.
 */

import { Service } from "typedi";

import { Position } from "vscode-languageserver-textdocument";
import {
  CancellationToken,
  CompletionItem,
  CompletionItemKind,
  ResultProgressReporter,
  WorkDoneProgressReporter,
} from "vscode-languageserver/node";
import { DatalogpmDocument } from "./datalogpm/datalogpm-document";

type AnnotationSuggestionCallback = () => string[];
type AnnotationSuggestionInsertTextCallback = (name: string) => string;

/**
 * Annotation suggestion.
 */
interface AnnotationSuggestion {
  name: string;
  signature?: string;
  insertText?: AnnotationSuggestionInsertTextCallback;
  arguments?: string | string[] | AnnotationSuggestionCallback;
}

/**
 * Get annotation completions from Datalog+/- syntax.
 * @param text Text to be completed.
 * @param atomNames Set of atom names in the document.
 * @returns VSCode completion items.
 */
function getAnnotationCompletions(text: string, atomNames: Set<string>): CompletionItem[] {
  const singleArgumentAnnotationSuggestions: AnnotationSuggestion[] = [
    {
      name: "executionMode",
      signature: '("mode")',
      insertText: (name: string) => `@${name}("`,
      arguments: ["streaming", "distributed"],
    },
    {
      name: "input",
      signature: '("atomName")',
      insertText: (name: string) => `@${name}("`,
    },
    {
      name: "output",
      signature: '("atomName")',
      insertText: (name: string) => `@${name}("`,
      arguments: () => {
        return Array.from(atomNames);
      },
    },
    {
      name: "bind",
      signature:
        '("atomName", "data source", "outermost container", "innermost container")',
      insertText: (name: string) => `@${name}`,
      arguments: () => {
        return Array.from(atomNames);
      },
    },
    {
      name: "qbind",
      signature: '("atomName")',
      insertText: (name: string) => `@${name}("`,
      arguments: () => {
        return Array.from(atomNames);
      },
    },
    {
      name: "mapping",
      signature: '("atomName", positionInAtom, "columnName", "columnType")',
      insertText: (name: string) => `@${name}("`,
      arguments: () => {
        return Array.from(atomNames);
      },
    },
    {
      name: "delete",
      signature: '("atomName", "set of key positions")',
      insertText: (name: string) => `@${name}("`,
      arguments: () => {
        return Array.from(atomNames);
      },
    },
    {
      name: "update",
      signature: '("atomName", "set of key positions")',
      insertText: (name: string) => `@${name}("`,
      arguments: () => {
        return Array.from(atomNames);
      },
    },
    {
      name: "implement",
      signature: '@implement("implementationName", "language", "module", "functionName").',
      insertText: (name: string) => `@${name}("`,
    },
    {
      name: "post",
      signature: '("atomName", "post processing directive")',
      insertText: (name: string) => `@${name}("`,
      arguments: () => {
        return Array.from(atomNames);
      },
    },
    {
      name: "relaxedSafety",
      insertText: (name: string) => `@${name}.\n`,
    },
    {
      name: "saveChaseGraph",
      insertText: (name: string) => `@${name}.\n`,
    },
    {
      name: "module",
      signature: '("moduleName")',
      insertText: (name: string) => `@${name}("`,
    },
    {
      name: "include",
      insertText: (name: string) => `@${name}("`,
    },
    {
      name: "library",
      signature: '("libraryAlias:", "libraryName", "function")',
      insertText: (name: string) => `@${name}("`,
    },
    {
      name: "partial_linearization",
      insertText: (name: string) => `@${name}.\n`,
    },
    {
      name: "timeMapping",
      signature:
        "(predicateName,posStart/dateStart, posEnd/dateEnd,posClosedStart/booleanClosedStart,posClosedEnd/booleanClosedEnd, posStartName, posEndName, posClosedStartName, posClosedEndName)",
      insertText: (name: string) => `@${name}.\n`,
    },
  ];

  // Get completions for annotations
  const annotationCompletions: CompletionItem[] =
    singleArgumentAnnotationSuggestions
      .filter((annotationSuggestion: AnnotationSuggestion) =>
        `@${annotationSuggestion.name}`.startsWith(text)
      )
      .map((annotationSuggestion: AnnotationSuggestion) => {
        const r: CompletionItem = {
          label: `@${annotationSuggestion.name}`,
          labelDetails: {
            detail: annotationSuggestion.signature,
          },
          detail: "annotation",
          kind: CompletionItemKind.Keyword,
          // commitCharacters: annotationSuggestion.arguments ? ['('] : [],
          insertText: annotationSuggestion.insertText
            ? annotationSuggestion.insertText(annotationSuggestion.name)
            : undefined,
          command: annotationSuggestion.arguments
            ? {
                command: "editor.action.triggerSuggest",
                title: "Re-trigger completions...",
              }
            : undefined,
        };

        return r;
      });

  // Get completions for annotation arguments
  const annotationArgumentsCompletions: CompletionItem[] = [];
  singleArgumentAnnotationSuggestions
    .filter((annotationSuggestion: AnnotationSuggestion) =>
      text.startsWith(`@${annotationSuggestion.name}("`)
    )
    .forEach((annotationSuggestion: AnnotationSuggestion) => {
      let args: string[] | undefined;
      if (typeof annotationSuggestion.arguments === "function") {
        args = annotationSuggestion.arguments();
      } else if (typeof annotationSuggestion.arguments === "string") {
        args = [annotationSuggestion.arguments];
      } else if (annotationSuggestion.arguments) {
        args = annotationSuggestion.arguments;
      }

      if (!args) return;

      for (const arg of args) {
        const r: CompletionItem = {
          label: arg,
          detail: "executionMode",
          kind: CompletionItemKind.Method,
          insertText: `${arg}").`,
        };
        annotationArgumentsCompletions.push(r);
      }
    });

  // Return all completions
  const completions = [
    ...annotationCompletions,
    ...annotationArgumentsCompletions,
  ];
  return completions;
}

/**
 * Completion provider service.
 */
@Service()
export class CompletionProviderService {
  /**
   * Provide completion items for the given document at the given position.
   * @param datalogpmDocument Datalog+/- Document
   * @param position Position in document
   * @param token
   * @param workDoneProgress
   * @param resultProgress
   * @returns
   */
  async provideCompletionItems(
    datalogpmDocument: DatalogpmDocument,
    position: Position,
    token?: CancellationToken,
    workDoneProgress?: WorkDoneProgressReporter,
    resultProgress?: ResultProgressReporter<CompletionItem[]>
  ): Promise<CompletionItem[]> {
    // Get text until position
    const range = {
      start: { line: position.line, character: 0 },
      end: position,
    };
    const text = datalogpmDocument.document.getText(range);

    const atomNames = datalogpmDocument.atomNames;
    const atomNameCompletions: CompletionItem[] = Array.from(atomNames)
      .filter((atomName: string) => atomName.startsWith(text))
      .map((atomName, index) => ({
        label: atomName,
        detail: "atom",
        kind: CompletionItemKind.Variable,
        commitCharacters: ["("],
        insertText: `${atomName}(`,
      }));

    const annotationCompletions = getAnnotationCompletions(text, atomNames);

    const completions = [...atomNameCompletions, ...annotationCompletions];
    return completions;
  }
}
