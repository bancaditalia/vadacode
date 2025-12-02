// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Main app component.
 */

import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  VscodeMessage,
  VscodeMessageService,
} from './services/vscode-message.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent implements OnDestroy {
  title = 'vadacode-results-webview';

  subscription: Subscription;

  /** Loading state. */
  loading = false;

  /** Raw message, in case we don't know what to display. */
  vscodeMessage?: VscodeMessage;

  /** Reasoner results, in case everything went fine. */
  results?: any;

  /** Error message, incase there were issues with the request. */
  error?: Error;

  constructor(public vscodeMessageService: VscodeMessageService) {
    // Debug view with stub json data
    // this._updateVscodeMessage(json2);

    this.subscription = vscodeMessageService.messages$.subscribe(
      (vscodeMessage: VscodeMessage) => {
        this._updateVscodeMessage(vscodeMessage);
      }
    );
  }

  _updateVscodeMessage(vscodeMessage: VscodeMessage) {
    if (vscodeMessage.type === 'loading') {
      this.loading = true;
      this.results = undefined;
      this.error = undefined;
      this.vscodeMessage = undefined;
    } else {
      this.loading = false;
      if (vscodeMessage.type === 'results') {
        this.results = vscodeMessage.payload;
        this.error = undefined;
        this.vscodeMessage = undefined;
      } else if (vscodeMessage.type === 'error') {
        this.results = undefined;
        this.error = vscodeMessage.payload;
        this.vscodeMessage = undefined;
      } else {
        // We really don't know what happened
        this.results = undefined;
        this.error = undefined;
        this.vscodeMessage = vscodeMessage;
      }
    }
  }

  ngOnDestroy(): void {
    throw new Error('Method not implemented.');
  }
}
