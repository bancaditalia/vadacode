// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Implements the command to scrape a website.
 */

import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from '@nestjs/common';

import puppeteer from 'puppeteer';
import { TurndownService } from './turndown.service';

import * as fs from 'fs';

/**
 * Command options for the scrape command.
 */
interface ScrapeCommandOptions {
  url: string;
  root: string;
  separator?: string;
}

/**
 * Scrape a website.
 */
@Command({ name: 'scrape', description: 'Scrape a website' })
export class ScrapeCommand extends CommandRunner {
  // Scraped items.
  private _scrapedHtml: string[] = [];

  // Scraped urls.
  private _scrapedQueue = new Set<string>();

  // Queue for urls to scrape.
  private _scrapeQueue = new Set<string>();

  // Logger instance
  private readonly logger = new Logger(ScrapeCommand.name);

  // Inject the TurndownService
  constructor(private turndownService: TurndownService) {
    super();
  }

  async run(
    passedParam: string[],
    options?: ScrapeCommandOptions,
  ): Promise<void> {
    // Fill scraped data
    const url = passedParam[0];
    await this._scrapeUrl(url, options);

    // Map the scraped html to markdown
    const manual = this._scrapedHtml.map((html) =>
      this.turndownService.convert(html, {
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        fence: '```',
      }),
    );

    // Save scraped data to a flat file
    const separator = options?.separator || '\n\n[PAGE BOUNDARY]\n\n';
    const vadalogManual = manual.join(separator);
    fs.writeFileSync('vadalog-manual.md', vadalogManual);
  }

  private async _scrapeUrl(
    url: string,
    options: ScrapeCommandOptions | undefined,
  ) {
    this._scrapeQueue.add(url);

    // Scrape data until the queue is empty
    while (this._scrapeQueue.size > 0) {
      const url = Array.from(this._scrapeQueue).shift();
      if (url) {
        this._scrapeQueue.delete(url);
        this._scrapedQueue.add(url);
        const htmlContent = await this.scrapeHtml(url, options);
        if (htmlContent) {
          this._scrapedHtml.push(htmlContent);
        }
      }
    }
  }

  @Option({
    flags: '-r, --root [url]',
    description: 'Url base. Every url scraped must start with this url.',
  })
  parseUrl(val: string): string {
    return val;
  }

  async scrapeHtml(
    url: string,
    options?: ScrapeCommandOptions,
  ): Promise<string | undefined> {
    this.logger.log(`Scraping ${url}...`);
    const rootUrl = options?.root || url;

    // Launch a headless browser
    const browser = await puppeteer.launch();
    // Open a new page in the browser
    const page = await browser.newPage();

    try {
      // Navigate to the specified URL
      await page.goto(url);
      // Wait for the specified selector to appear on the page
      await page.waitForSelector('article', { timeout: 1000 });

      // Extract text content of elements matching the selector
      const articlesHtml = await page.evaluate(() => {
        // Select all elements matching the specified selector
        const articles = document.querySelectorAll('article');

        // Remove navigation elements
        const navigationElements = document.querySelectorAll('nav');
        navigationElements.forEach((el: HTMLElement) =>
          el.parentNode?.removeChild(el),
        );

        const sourceToolboxElements =
          document.querySelectorAll('.source-toolbox');
        sourceToolboxElements.forEach((el: HTMLElement) =>
          el.parentNode?.removeChild(el),
        );

        // Map over the elements and return their text content
        return Array.from(articles).map((element) => element.outerHTML);
      });

      // Get all the hrefs on the page
      const hrefs = await page.$$eval('a', (as) => as.map((a) => a.href));
      // Remove hashes from hrefs to get the urls
      const urls = hrefs.map((href) => href.split('#')[0]);

      // Add the hrefs to the scrape queue, but only if they
      // * haven't been scraped yet
      // * are not already in the queue
      // * are contained in the rootUrl
      urls.forEach((href) => {
        if (
          !this._scrapedQueue.has(href) &&
          !this._scrapeQueue.has(href) &&
          href.startsWith(rootUrl)
        ) {
          this._scrapeQueue.add(href);
        }
      });

      return articlesHtml[0] || undefined;
    } catch (error) {
      console.error('Error scraping dynamic content:', error);
    } finally {
      // Close the browser once scraping is done
      await browser.close();
    }
  }
}
