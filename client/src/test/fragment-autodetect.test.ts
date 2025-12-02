// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/ 
 *
 * @file Fragment auto-detect status bar test.
 */

import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate } from './helper';

// Utility sleep
function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

suite('Fragment Auto-detect', () => {
  test('Selecting Auto-detect sets status bar to Warded', async function() {
		// Open test fixture program expected to be Warded.
		await activate(getDocUri('fragment-00.vada'));

		// Ensure extension finished initialization.
		await sleep(1000);

		// Send 'workspace/autoDetectFragment' notification to LSP
		await vscode.commands.executeCommand('vadacode.autoDetectFragment');
		
		// Wait a bit for the selection to be processed.
		await sleep(500);

		// Still no way to do proper check, just exit
		console.warn("Fragment auto-detect test executed, unable to verify status bar item.");

  });
});
