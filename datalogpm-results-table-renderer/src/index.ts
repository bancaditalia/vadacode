// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Vadacode results table renderer entry point.
 */

import type { ActivationFunction } from 'vscode-notebook-renderer';
import { TableRenderer } from './table-renderer';

import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/color-picker/color-picker.js';
import '@shoelace-style/shoelace/dist/components/details/details.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';
import '@shoelace-style/shoelace/dist/components/format-date/format-date.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/rating/rating.js';
import '@shoelace-style/shoelace/dist/themes/dark.css';
import '@shoelace-style/shoelace/dist/themes/light.css';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
import { ResponseErrorRenderer } from './response-error-renderer';

import './styles.css';

// Fix the public path so that any async import()'s work as expected.
// eslint-disable-next-line @typescript-eslint/naming-convention
declare const __rollup_relative_entrypoint_to_root__: string;
const scriptUrl = import.meta.url;

const __dirname = new URL(scriptUrl.replace(/[^/]+$/, '') + __rollup_relative_entrypoint_to_root__).toString();

// Set the base path to the folder you copied Shoelace's assets to
setBasePath(__dirname + `shoelace`);

export const activate: ActivationFunction = context => ({
  renderOutputItem(data, element: HTMLElement) {
		document.body.classList.remove('sl-theme-light', 'sl-theme-dark');
		if (document.body.classList.contains('vscode-dark')) {
			document.body.classList.add("sl-theme-dark");
		} else if (document.body.classList.contains('vscode-light')) {
			document.body.classList.add("sl-theme-light");
		}

		const renderData = data.json();

		switch(renderData.type) {
			case 'results': {
				const tableRenderer = new TableRenderer(element);
				tableRenderer.render(renderData.results);
				break;
			}
			case 'response-error': {
				const errorRenderer = new ResponseErrorRenderer(element);
				errorRenderer.render(renderData);
				break;
			}
		}
  }
});
