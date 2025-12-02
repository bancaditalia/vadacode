// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Turndown service to convert HTML to Markdown.
 */

import { Injectable } from '@nestjs/common';

import * as Turndown from 'turndown';

@Injectable()
export class TurndownService {
  convert(html: string, options: Turndown.Options): string {
    const turndownService = new Turndown(options);
    return turndownService.turndown(html);
  }
}
