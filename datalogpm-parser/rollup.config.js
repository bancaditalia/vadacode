// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Rollup configuration file.
 */

import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import babel from "@rollup/plugin-babel";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";

const input = ["src/index.ts"];
export default [
  // ESM and CJS
  {
    input,
    plugins: [
      nodeResolve({
        jsnext: true,
        extensions: [".ts"],
        exportConditions: ["node"],
      }),
      commonjs(),
      babel({
        babelHelpers: "bundled",
      }),
      terser(),
      typescript({
        tsconfig: "./tsconfig.json",
        compilerOptions: {
          module: "esnext",
        },
      }),
    ],
    output: {
      dir: "out",
      format: "cjs",
      exports: "named",
      sourcemap: true,
    },
    watch: {
      include: ["src/**", "grammar/**"],
    },
  },
];
