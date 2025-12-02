// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Vadacode results table renderer.
 */

export class TableRenderer {
	element: HTMLElement;
	constructor(element: HTMLElement) {
		this.element = element;
	}
	render(reasonerData: any) {
		let innerHTML = `
<sl-alert variant="success" open>
	<sl-icon slot="icon" name="check2-circle"></sl-icon>
	<strong>Execution successful.</strong><br />
</sl-alert>		
<div class="output-cards">`;
		
		for (const relation of Object.keys(reasonerData.resultSet)) {

			if (
				!(relation in reasonerData.columnNames) ||
				!(relation in reasonerData.types) ||
				!(relation in reasonerData.resultSet)
			) {
				continue;
			}
			
			const columnNames = reasonerData.columnNames[relation].map((d: any) => `<th>${d}</th>`);
			const columnTypes = reasonerData.types[relation].map((d: any) => `<th>${d}</th>`);

			const rows = [];
			const results = reasonerData.resultSet[relation];
			for (let rowIndex = 0; rowIndex < results.length; rowIndex++) {
				const rowData = results[rowIndex];
				const columns = rowData.map((d: any) => `<td>${d}</td>`);
				const rowText = `<tr>${columns.join('')}</tr>`;
				rows.push(rowText);
			}

			innerHTML +=`
<sl-card class="card-header">
	<div slot="header">
		${relation}
		<!--sl-icon-button name="gear" label="Settings"></sl-icon-button-->
	</div>

	<table>
		<thead>
		<tr>
			${columnNames.join('')}
		</tr>
		<tr>
			${columnTypes.join('')}
		</tr>
</thead>				
		<tbody>
			${rows.join('')}
		</tbody>
	</table>

</sl-card>
`;
		}

		innerHTML += `</div>`;		
		this.element.innerHTML = innerHTML;

  }
}
