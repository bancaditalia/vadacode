// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Smoke test for Extensions View.
 */

import {
  ActivityBar,
  ExtensionsViewItem,
  ExtensionsViewSection,
} from "vscode-extension-tester";

import * as assert from "assert";

import pjson from "../../package.json";

// Look for Vadacode extension
describe("Vadacode extension view tests", () => {
  let vadacodeExtension: ExtensionsViewItem;

  before(async function () {
    this.timeout(15_000);
    // open the extensions view
    const view = await (
      await new ActivityBar().getViewControl("Extensions")
    )?.openView();
    await view?.getDriver().wait(async function () {
      return (await view.getContent().getSections()).length > 0;
    });

    // We want to find the extension
    // First we need a view section, best place to get started is the 'Installed' section
    const extensions = (await view
      ?.getContent()
      .getSection("Installed")) as ExtensionsViewSection;

    // Search for the extension, you can use any syntax vscode supports for the search field
    // It is best to prepend @installed to the extension name if you don't want to see the results from marketplace
    // also, getting the name directly from package.json seem like a good idea
    await extensions.getDriver().wait(async function () {
      vadacodeExtension = (await extensions.findItem(
        `@installed ${pjson.name}`
      )) as ExtensionsViewItem;
      return vadacodeExtension !== undefined;
    });
  });

  it("Check that the extension info is the one declared in package.json", async () => {
    // now we have the extension item, we can check it shows all the fields we want
    const author = await vadacodeExtension.getAuthor();
    const desc = await vadacodeExtension.getDescription();
    const version = await vadacodeExtension.getVersion();

    // in this case we are comparing the results against the values in package.json
    assert.equal(author, pjson.publisher);
    assert.equal(desc, pjson.description);
    assert.equal(version, pjson.version);
  });

  it("Check that the extension is enabled", async () => {
    assert.ok(vadacodeExtension.isEnabled);
  });
});
