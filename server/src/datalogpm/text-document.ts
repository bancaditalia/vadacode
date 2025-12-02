// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Internal representation of a text document.
 */

/**
 * Internal representation of a text document.
 */
export interface TextDocument {
  contents: string;
  /**
   * The associated URI for this document. Most documents have the __file__-scheme, indicating that they
   * represent files on disk. However, some documents may have other schemes indicating that they are not
   * available on disk.
   *
   * @readonly
   */
  uri: string;
  /**
   * The identifier of the language associated with this document.
   *
   * @readonly
   */
  languageId: string;
}
