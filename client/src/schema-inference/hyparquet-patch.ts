// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Patch to add missing AsyncBuffer.fromFile function to hyparquet package.
 */

import { createReadStream, promises as fs } from 'fs';
import { AsyncBuffer } from 'hyparquet/types';

/**
 * Construct an AsyncBuffer for a local file using node fs package.
 * Note: this function is copied from hyparquet package since it does not appear to be exported.
 *
 * @param {string} filename
 * @returns {Promise<AsyncBuffer>}
 */
export async function asyncBufferFromFile(filename): Promise<AsyncBuffer> {
  const { size } = await fs.stat(filename);
  return {
    byteLength: size,
    slice(start, end) {
      // read file slice
      const reader = createReadStream(filename, { start, end });
      return new Promise((resolve, reject) => {
        const chunks = [];
        reader.on('data', chunk => chunks.push(chunk));
        reader.on('error', reject);
        reader.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
        });
      });
    },
  };
}
