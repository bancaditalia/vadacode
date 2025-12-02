// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Unit tests for VscodeMessageService.
 */

import { TestBed } from '@angular/core/testing';

import { VscodeMessageService } from './vscode-message.service';

describe('VscodeMessageService', () => {
  let service: VscodeMessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VscodeMessageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
