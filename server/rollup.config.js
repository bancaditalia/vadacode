// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file RollupJS Vadacode language server build configuration.
 */

import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import babel from "@rollup/plugin-babel";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import alias from "@rollup/plugin-alias";

import * as path from 'path';

import silenceWarnings from "./rollup.silence";

const input = ["src/server.ts"];
export default [
  // ESM and CJS
  {
    input,
    plugins: [
      alias({
        entries: [
          { find: "@vadalang", replacement: "../datalogpm-parser/out/index.js" }
        ],
      }),
      babel({
        babelHelpers: "bundled",
      }),
      nodeResolve({
        jsnext: true,
        preferBuiltins: true,
        exportConditions: ['node', 'import', 'default']
      }),
      commonjs(),
      terser(),
      typescript({
        tsconfig: "./tsconfig.json",
        compilerOptions: {
          module: "esnext",
        },
        outputToFilesystem: true,
      }),
      silenceWarnings(),
    ],
    output: {
      dir: "out",
      format: "cjs",
      exports: "named",
      sourcemap: true,
    },
    watch: {
      include: ["src/**"],
    },
  },
];
