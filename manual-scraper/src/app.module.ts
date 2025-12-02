// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Main application module.
 */

import { Module } from '@nestjs/common';
import { ScrapeCommand } from './scrape.command';
import { TurndownService } from './turndown.service';

@Module({
  imports: [],
  providers: [ScrapeCommand, TurndownService],
})
export class AppModule {}
