// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Service to produce Hover objects.
 */

import { Service } from "typedi";

import { Hover, MarkupContent, MarkupKind } from "vscode-languageserver/node";
import {
  AtomSignatureHelp,
  IDatalogpmAtomToken,
  IDatalogpmToken,
  IDatalogpmVariableToken,
  DatalogpmSignatureHelp,
  DatalogpmSignatureSource,
  DatalogpmSignatureTermHelp,
  VariableMetadata,
} from "./datalogpm/common";

/**
 * Factory service to produce Hover objects.
 */
@Service()
export class HoverFactoryService {
  /**
   * Make a hover object for an atom.
   * @param signatureHelp Signature help for the atom.
   * @returns Hover object.
   */
  makeAtomHover(signatureHelp: AtomSignatureHelp, atomToken: IDatalogpmAtomToken): Hover {
    let source = "";
    if (signatureHelp.source === DatalogpmSignatureSource.FACT) {
      source = " (inferred from fact)";
    } else if (signatureHelp.source === DatalogpmSignatureSource.INPUT) {
      source = " (inferred from input)";
    } else if (signatureHelp.source === DatalogpmSignatureSource.USAGE) {
      source = " (inferred from usage)";
    }

    const markdown = [
        "```datalogpm",
        `(atom) ${signatureHelp.name}(${signatureHelp.terms
          .map((term: DatalogpmSignatureTermHelp) => term.label)
          .join(", ")}).`,
        "```",
        signatureHelp.documentation ? signatureHelp.documentation + `\n` : "",
        `Terms${source}:\n`,
        signatureHelp.terms
          .map((term: DatalogpmSignatureTermHelp) =>
            term.documentation
              ? `* \`${term.label}\`: ${term.documentation}`
              : `* \`${term.label}\``
          )
          .join("\n"),
        atomToken.isEDB ? "\nAtom is extensional (comes either from inline facts or @input binding)." : "",
        atomToken.isIDB ? "\nAtom is intensional (it's defined by logic implication)." : "",
        atomToken.guard ? "\nAtom is a Guard." : "",
        atomToken.weakGuard ? "\nAtom is a Weak Guard." : "",
        atomToken.frontierGuard ? "\nAtom is a Frontier Guard." : "",
        atomToken.weakFrontierGuard ? "\nAtom is a Weak Frontier Guard." : "",
      ].join("\n");

    // Escape HTML tags in the markdown content
    const escapedMarkdown = markdown.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const content: MarkupContent = {
      kind: MarkupKind.Markdown,
      value: escapedMarkdown,
    };

    return {
      contents: content,
    } as Hover;
  }

  /**
   * Make a hover object for an annotation.
   * @param signatureHelp Signature help for the annotation.
   * @returns Hover object.
   */
  makeAnnotationHover(signatureHelp: DatalogpmSignatureHelp): Hover {
    const anyTerms = signatureHelp.terms && signatureHelp.terms.length > 0;
    const markdown = [
        `\`\`\`datalogpm
(annotation) ${signatureHelp.name}${anyTerms ? '(' + signatureHelp.terms
  .map((term: DatalogpmSignatureTermHelp) => term.label)
  .join(", ") + ')' : ""}. 
\`\`\``,
        signatureHelp.documentation,
        anyTerms ? "Terms:" : "",
        anyTerms ? signatureHelp.terms
          .map(
            (term: DatalogpmSignatureTermHelp) =>
              `* \`${term.label}\`: ${term.documentation}`
          )
          .join("\n") : "",
      ]
      .filter((s: string) => !!s)
      .join("\n\n");

    // Escape HTML tags in the markdown content
    const escapedMarkdown = markdown.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const content: MarkupContent = {
      kind: MarkupKind.Markdown,
      value: escapedMarkdown,
    };

    return {
      contents: content,
    } as Hover;
  }

  /**
   * Make a hover object for a variable.
   * @param signatureHelp Signature help for the variable.
   * @returns Hover object.
   */
  makeVariableHover(variableMetadata: VariableMetadata, token: IDatalogpmVariableToken): Hover {
    const markdown = [
        "```datalogpm\n"+
        `(variable) ${variableMetadata.name}\n`+
        "```",
        token.existential
          ? `∃-variable (${variableMetadata.name} is existentially quantified because it appears in the head but it's not bound in the body)`
          : "",
        variableMetadata.markedNull
          ? `Variable is in a position which contains marked nulls.`
          : "",
        token.harmful
          ? `${variableMetadata.name} is harmful, because it appears in an atom position which may contain nulls.`
          : "",
        token.dangerous
          ? `${variableMetadata.name} is dangerous, because it's harmful and appears in the head of the rule.`
          : "",
        token.protected_
          ? `${variableMetadata.name} is protected, because it appears in a position which contains no marked nulls.`
          : "",
        token.attackedBy && token.attackedBy.length > 0
          ? `${variableMetadata.name} is attacked by variable${token.attackedBy.length > 1 ? "s" : ""} ${token.attackedBy.map((invader: IDatalogpmToken) => `\`${invader.text}\` at (${invader.line + 1}, ${invader.column + 1})`).join(", ")}.`
          : "",
      ].filter((value: string) => !!value).join("\n\n");

    // Escape HTML tags in the markdown content
    const escapedMarkdown = markdown.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const content: MarkupContent = {
      kind: MarkupKind.Markdown,
      value: escapedMarkdown,
    };

    return {
      contents: content,
    } as Hover;
  }
}
