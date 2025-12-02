// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Service to handle messages from VSCode extension to the webview.
 */

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface VscodeMessage {
	type: string,
	payload: any
}

@Injectable({
  providedIn: 'root'
})
export class VscodeMessageService {
	public messages$ = new Subject<VscodeMessage>();

  constructor() {
		// https://code.visualstudio.com/api/extension-guides/webview
    window.addEventListener('message',  (event: {data: any}) => {
			this.messages$.next(event.data);
		});
  }

}
