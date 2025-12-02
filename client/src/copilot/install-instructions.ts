// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Implements the command to install Copilot instructions and prompt files.
 */

import { posix as pathPosix } from 'path';
import { commands, ConfigurationTarget, MessageOptions, Uri, window, workspace } from 'vscode';
import { readInstructions } from './prompt-builder';

const INSTALL_FILES = [{
  source: 'gitignore.instructions',
  target: '.vadacode/instructions/.gitignore'
}, {
  source: 'vadalog.instructions.md',
  target: '.vadacode/instructions/vada.instructions.md',
  prefix: `---
applyTo: "**/*.vada"
---
`}, {
  source: 'vadalog.instructions.md',
  target: '.vadacode/instructions/vadanb.instructions.md',
  prefix: `---
applyTo: "**/*.vadanb"
---
`}, {
  source: 'explain.instructions.md',
  target: '.vadacode/instructions/vada-explain.instructions.md',
  prefix: `---
applyTo: "**/*.vada"
description: "Explain Datalog+/- rules."
---
`}, {
  source: 'explain.instructions.md',
  target: '.vadacode/instructions/vadanb-explain.instructions.md',
  prefix: `---
applyTo: "**/*.vadanb"
description: "Explain Datalog+/- rules."
---
`}, {
  source: 'gitignore.prompts',
  target: '.vadacode/prompts/.gitignore'
}, {
  source: 'vadoc.prompt.md',
  target: '.vadacode/prompts/vadoc.prompt.md'
}];

/**
 * Registers the command to add Copilot instructions and prompt files to the workspace.
 * @param command The command identifier.
 */
export function registerAddDatalogpmCopilotInstructions(command: string) {
  // Command to scaffold instruction files.
  const cmd = commands.registerCommand(command, async () => {
    try {
      const root = await ensureWorkspace();
      const { changesText } = await gatherPlannedChanges(root);

      // Ask for consent with a modal dialog and detailed "detail" text.
      const options: MessageOptions = { modal: true, detail: changesText }; 
      const choice = await window.showInformationMessage(
        'Add Copilot instruction and prompt files and update workspace settings?',
        options,
        'Proceed',
        'Cancel'
      );

      if (choice !== 'Proceed') {
        window.showInformationMessage('No changes were made.');
        return;
      }

      await applyChanges(root);
      window.showInformationMessage('Copilot instructions installed and settings updated.');
    } catch (err: any) {
      window.showErrorMessage(`Failed to add instructions: ${err.message ?? String(err)}`);
    }
  });
}

/**
 * Ensures that a workspace folder is open.
 * @returns The URI of the workspace folder.
 */
async function ensureWorkspace(): Promise<Uri> {
  const folders = workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    throw new Error('Open a folder/workspace first.');
  }
  return folders[0].uri;
}

/**
 * Reads the content of a file if it exists. 
 * @param uri The URI of the file to read.
 * @returns The content of the file, or undefined if it does not exist.
 */
async function readIfExists(uri: Uri): Promise<string | undefined> {
  try {
    const bytes = await workspace.fs.readFile(uri);
    return new TextDecoder().decode(bytes);
  } catch {
    return undefined;
  }
}

/**
 * Writes UTF-8 content to a file.
 * @param uri The URI of the file to write.
 * @param content The content to write to the file.
 */
async function writeUtf8(uri: Uri, content: string) {
  await workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
}

/**
 * Stringifies a value for display.
 * @param val The value to stringify.
 * @returns The stringified value.
 */
function stringify(val: unknown): string {
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val, null, 2); } catch { return String(val); }
}

/**
 * Gathers the planned changes to be made.
 * @param root The root URI of the workspace.
 * @returns A summary of the planned changes.
 */
async function gatherPlannedChanges(root: Uri) {
  const cfg = workspace.getConfiguration();

  const desired: Record<string, any> = {
    'chat.promptFiles': true,
    'github.copilot.chat.codeGeneration.useInstructionFiles': true,
    'chat.promptFilesLocations': { '.vadacode/prompts': true },
    'chat.instructionsFilesLocations': { '.vadacode/instructions': true },
  };

  const current: Record<string, any> = {
    'chat.promptFiles': cfg.get('chat.promptFiles'),
    'github.copilot.chat.codeGeneration.useInstructionFiles': cfg.get('github.copilot.chat.codeGeneration.useInstructionFiles'),
    'chat.promptFilesLocations': cfg.get('chat.promptFilesLocations'),
    'chat.instructionsFilesLocations': cfg.get('chat.instructionsFilesLocations'),
  };

  const workSpaceChanges: string[] = [];
  for (const key of Object.keys(desired)) {
    const before = stringify(current[key]);
    let after = stringify(desired[key]);
    // If merging locations, show merged result
    if (key.endsWith('Locations') && typeof current[key] === 'object' && current[key]) {
      after = stringify({ ...(current[key] as any), ...(desired[key] as any) });
    }
    if (before === after) {
      // Don't notify unchanged things
    } else {
      workSpaceChanges.push(`• ${key}:`);
      workSpaceChanges.push(`    before: ${before}`);
      workSpaceChanges.push(`    after:  ${after}`);
    }
  }

  const instructions: { [file: string]: string | undefined } = {};
  for (const { source, target } of INSTALL_FILES) {
    const uri = Uri.joinPath(root, target);
    const instruction = await readIfExists(uri);
    instructions[source] = instruction;
  }

  const changes: string[] = [];
  changes.push(`Files:`);
  for (const { source, target } of INSTALL_FILES) {
    const relPath = target;
    const instruction = instructions[source];
    if (instruction) {
      changes.push(`• ${relPath} — overwrite`);
    } else {
      changes.push(`• ${relPath} — create`);
    }
  }

  if (workSpaceChanges.length > 0) {
    changes.push('');
    changes.push('Settings (Workspace):');
    changes.push(...workSpaceChanges);
  } else {
    changes.push('');
    changes.push('Settings (Workspace): No changes needed');
  }
  return { changesText: changes.join('\n') };
}

/**
 * Ensures that the directory for a given relative path exists in root.
 * @param relPath The relative path for which to ensure the directory exists.
 * @param root The root URI of the workspace.
 */
async function ensureDirFor(relPath: string, root: Uri) {
  const dirRel = pathPosix.dirname(relPath);
  const dirUri = Uri.joinPath(root, dirRel);
  await workspace.fs.createDirectory(dirUri);
}

/**
 * Applies the planned changes to the workspace.
 * @param root The root URI of the workspace.
 */
async function applyChanges(root: Uri) {
  // Write instruction files
  for (const { source, target, prefix } of INSTALL_FILES) {
    await ensureDirFor(target, root);
    let contents = "";
    if (prefix) {
      contents = prefix;
    }
    contents += readInstructions(source);
    await writeUtf8(Uri.joinPath(root, target), contents);
  }

  // Update workspace settings
  const cfg = workspace.getConfiguration();
  await cfg.update('chat.promptFiles', true, ConfigurationTarget.Workspace);
  await cfg.update('github.copilot.chat.codeGeneration.useInstructionFiles', true, ConfigurationTarget.Workspace);

  const promptsLoc = cfg.get<Record<string, boolean>>('chat.promptFilesLocations') ?? {};
  promptsLoc['.vadacode/prompts'] = true;
  await cfg.update('chat.promptFilesLocations', promptsLoc, ConfigurationTarget.Workspace);

  const instrLoc = cfg.get<Record<string, boolean>>('chat.instructionsFilesLocations') ?? {};
  instrLoc['.vadacode/instructions'] = true;
  await cfg.update('chat.instructionsFilesLocations', instrLoc, ConfigurationTarget.Workspace);
}
