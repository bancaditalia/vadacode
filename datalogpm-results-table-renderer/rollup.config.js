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
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import path from 'path';
import postcss from 'rollup-plugin-postcss';
import autoprefixer from 'autoprefixer';
import replace from '@rollup/plugin-replace';

const input = ["src/index.ts"];
const outputFilename = 'index.js';
export default [
  // ESM and CJS
  {
    input,
		plugins: [
			nodeResolve({
				jsnext: true,
				extensions: ['.ts']
			}),
			commonjs(),
			babel({
				babelHelpers: "bundled",
			}),
			postcss({
				plugins: [autoprefixer()],
				sourceMap: true,
				extract: false,
				minimize: true
			}),
			terser(),
			typescript({ 
				tsconfig: './tsconfig.json',
				compilerOptions: {
					module: 'esnext'
				}
			}),
			// Copy Shoelace assets to dist/shoelace
			copy({
				copyOnce: true,
				targets: [
					{
						src: path.resolve(__dirname, 'node_modules/@shoelace-style/shoelace/dist/assets'),
						dest: path.resolve(__dirname, 'out/shoelace')
					}
				]
			}),
			replace({
				preventAssignment: true,
				__rollup_relative_entrypoint_to_root__: JSON.stringify(
					path.posix.relative(path.posix.dirname('/index.js'), '/'),
				),
				__buildDate__: () => JSON.stringify(new Date()),
				__buildVersion: 15
			})	
		],
    output: {
			dir: "out",
			format: "esm",
			exports: "named",
			sourcemap: true,
		},
		watch: {
			include: ['src/**', 'grammar/**']
		}	
  },
];
