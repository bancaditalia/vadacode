// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Vadacode settings.
 */

import { Fragment } from '../isomorphic';

/**
 * Extension settings
 */
export interface VadacodeSettings {
  /** Default endpoint of the reasoner. */
  reasonerEndpoint: string;
}

/**
 * Default extension settings.
 */
export const DEFAULT_SETTINGS: VadacodeSettings = {
  reasonerEndpoint: "http://127.0.0.1:8080"
};
