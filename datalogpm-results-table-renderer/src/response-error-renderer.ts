// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Vadacode results table response error renderer.
 */

// https://stackoverflow.com/questions/6234773/can-i-escape-html-special-chars-in-javascript
function escapeHtml(unsafe: string) {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

export class ResponseErrorRenderer {
	element: HTMLElement;
	constructor(element: HTMLElement) {
		this.element = element;
	}
	render(error: {
		status: number,
		headers: { [key: string]: string },
		data: {
			error: string,
			message: string,
			path: string,
			status: number,
			timestamp: string
		}
	}) {
		this.element.innerHTML = `
	<sl-alert variant="danger" open>
		<sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
		<strong>${error.data.error} (${error.data.status})</strong><br />
		Message: <pre>${escapeHtml(error.data.message)}</pre>

		<sl-divider style="--spacing: 2rem;"></sl-divider>

		<sl-details summary="Response headers" class="custom-icons">
			<sl-icon name="plus-square" slot="expand-icon"></sl-icon>
			<sl-icon name="dash-square" slot="collapse-icon"></sl-icon>
			<pre><code>${JSON.stringify(error.headers, null, 2)}</code></pre>
			</sl-details>
		
		<style>
			sl-details.custom-icons::part(summary-icon) {
				/* Disable the expand/collapse animation */
				rotate: none;
			}
		</style>
	
	
	</sl-alert>
`;

  }
}
