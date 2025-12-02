// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file File watcher implementation, monitors a file and outputs its 
 * content to an output channel; supports both file-system notifications and
 * periodic polling.
 *
 */

import { FileHandle, open } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { Disposable, FileStat, FileSystemWatcher, OutputChannel, RelativePattern, Uri, window, workspace } from 'vscode';

export async function getFileStats(filename: string): Promise<FileStat | null> {
  try {
    return await workspace
      .fs
      .stat(Uri.file(filename));
  } catch (err) {
    return null;
  }
}

export class FileWatcher {
  // Log output channel.
  logOutputChannel: OutputChannel;
  disposables?: Disposable[];
  position = 0;
  watcher: FileSystemWatcher;
 
  /**
   * Constructor.
   * 
   * @param filename Filename to watch.
   * @param name Name of the output channel.
   */
  constructor(private filename: string, private interval: number, private name: string) {

    this.logOutputChannel = window.createOutputChannel(name, "ecslog");
    this.logOutputChannel.appendLine(`[Vadacode]: Creating file system watcher for file '${this.filename}'.`);

    this._readFileToPosition().then(() => {
      this._createFileSystemWatcher();
    });

  }
  
  /**
   * Disposes the resources used by the watcher.
   */
  dispose() {
    if (this.logOutputChannel) {
      this.logOutputChannel.dispose();
    }
  }
    
  async _createFileSystemWatcher() {
    const pattern = new RelativePattern(dirname(this.filename), basename(this.filename));
    this.watcher = workspace.createFileSystemWatcher(pattern, false, false, false);

    this.watcher.onDidCreate(() => {
      this.position = 0;
      this.logOutputChannel.appendLine(`[Vadacode]: File ${this.filename} has been created.`);
    }, null, this.disposables);

    this.watcher.onDidDelete(() => {
      this.position = 0;
      this.logOutputChannel.appendLine(`[Vadacode]: File ${this.filename} has been deleted.`);
    }, null, this.disposables);

    this.watcher.onDidChange(async () => {
      this.logOutputChannel.appendLine(`[Vadacode]: File ${this.filename} has changed.`);
      await this._readFileToPosition();
    }, null, this.disposables);

    // Since the watcher doesn't work, create a timer to read the file periodically.
    if (this.interval > 0) {
      setInterval(async () => {
        try {
          await this._readFileToPosition();
        } catch (err) {
          const error = err as Error;
          this.logOutputChannel.appendLine(`[Vadacode]: Error reading file '${this.filename}': ${error.message}`);
        }
      }, this.interval * 1000);
    }
      
  }
  
  private async _readFileToPosition() {
    let fd: FileHandle;

    try {
      const stats = await getFileStats(this.filename);
      fd = await open(this.filename, 'r');

      if (stats) {
        const buffer = Buffer.alloc(stats.size - this.position);
        await fd.read(buffer, 0, buffer.length, this.position);
        this.position += buffer.length;

        this.sendBufferToLogOutputChannel(buffer);
      }
    } catch (err) {
      const error = err as Error;
      this.logOutputChannel.appendLine(`[Vadacode]: Failed to read '${this.filename}': ${error.message}`);
    } finally {
      if (fd) {
        await fd.close();
      }
    }
  }

  private sendBufferToLogOutputChannel(buffer: Buffer) {
    const content = buffer.toString('utf8');
    // Split lines and parse JSON objects
    const lines = content.split('\n');
    for (const line of lines) {
      if (!line) { continue; }
        
      try {
        this.logOutputChannel.appendLine(line);
      } catch (err) {
        if (err instanceof SyntaxError) {
          // Do nothing
        } else {
          this.logOutputChannel.appendLine(`[Datalogpm]: Couldn't parse line "${line}" (${err}).`);
        }
      }
    }
  }

}
