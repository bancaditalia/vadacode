// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Implements binding checks. It's a client-side module that interacts with the Evaluator
 *       to test bindings for atoms in the Datalog+/- program.
 */

import { window } from 'vscode';
import { integer } from 'vscode-languageclient';
import { Evaluator, Datalogpm } from '../evaluator';

import * as fs from 'fs';
import { AsyncBuffer, ConvertedType, parquetMetadataAsync, parquetSchema, ParquetType, SchemaTree } from 'hyparquet';

import Papa from 'papaparse';
import * as path from 'path';
import { asyncBufferFromFile } from './hyparquet-patch';
import { inferArrayType } from './type-inference';

// WARNING: This interface is duplicated in the server/src/datalogpm/common.ts file.
// Maybe it should be moved to a shared location like isomorphic.ts.
export interface DatalogpmBinding {
  input: boolean;
  inputToken: any; // should be IDatalogpmToken as it is in server/src/datalogpm/common.ts;
  token: any; // should be IDatalogpmToken as it is in server/src/datalogpm/common.ts;
  atomName: string;
  dataSource: string;
  outermostContainer: string;
  innermostContainer: string;
}

/**
 * Binding inference result.
 */
export interface BindingInferenceResult {
  resultSet: any[];
  columnNames: string[];
  types: string[];
}

/**
 * Read a CSV file and return its content as an array of objects.
 * @param filePath File path to the CSV file.
 * @param limit Maximum number of rows to read.
 * @returns An array of objects representing the CSV data.
 */
async function readCSV(filePath: string, limit: integer = 1000): Promise<{
  data: any[],
	errors: any
	meta: any
}> {
  return new Promise((resolve, reject) => {
    const rows: string[][] = [];
    Papa.parse(fs.createReadStream(filePath), {
      header: true,
      preview: limit,
      // Let's keep strings, we will infer types later
      dynamicTyping: false,
      worker: true,
      complete: (results) => {
        resolve(results);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Create Vadoc snippets from a CSV file.
 * @param filePath CSV file path.
 * @returns Generated Vadoc snippet.
 */
async function makeSnippetsFromCSV(filePath: string): Promise<string> {
  const atomName = path.basename(filePath).replace(/[^a-zA-Z0-9]/g, '');
  const directory = path.dirname(filePath);
  const fileName = path.basename(filePath);

  const results = await readCSV(filePath);
  const data = results?.data || [];
  const fields = results?.meta?.fields || [];
  const dataColumns: DataColumn[] = [];
  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];
    dataColumns.push({
      name: field,
      data: data.map(row => row[field]),
      inferredType: inferArrayType(data.map(row => row[field]))
    } as DataColumn);
  }
  
  // Prepare vadoc snipped
  return makeSnippet(dataColumns, atomName, directory, fileName, "csv useHeaders=true");
}

/**
 * Create Vadoc snippets from a Parquet file.
 * @param parquetPath Parquet file path.
 * @returns Generated Vadoc snippet.
 */
async function makeSnippetsFromParquet(parquetPath: string): Promise<string> {
  const atomName = path.basename(parquetPath).replace(/[^a-zA-Z0-9]/g, '');
  const directory = path.dirname(parquetPath);
  const fileName = path.basename(parquetPath);

  // Ensure filePath points to a directory
  if (!fs.existsSync(parquetPath)) {
    throw new Error (`"${parquetPath}" does not exist.`);
  }

  // Assume parquetPath is a file
  let parquetFilePath = parquetPath;
  // If it's a directory, get the first .parquet file in it
  if (fs.lstatSync(parquetPath).isDirectory()) {
    // Get fist file in parquetPath directory
    const files = await fs.promises.readdir(parquetPath);
    const parquetFiles = files.filter(file => file.endsWith('.parquet'));
    if (parquetFiles.length === 0) {
      throw new Error(`"${parquetPath}" contains no files.`);
    }

    parquetFilePath = path.resolve(path.join(parquetPath, parquetFiles[0]));
  }

  // Read the Parquet file
  const file: AsyncBuffer = await asyncBufferFromFile(parquetFilePath);
  const metadata = await parquetMetadataAsync(file);

  // Get total number of rows (convert bigint to number)
  const numRows = Number(metadata.num_rows);
  // Get nested table schema
  const schema = parquetSchema(metadata);
  // Get top-level column header names
  const columnNames = schema.children.map(e => e.element.name);

  const dataColumns = schema.children.map((column: SchemaTree, index) => {
    const name = `${column.element.name}`;
    return {
      name,
      inferredType: makeTypeFromParquetType(column.element.converted_type, column.element.type)
    } as DataColumn;
  });
  
  // Prepare vadoc snipped
  return makeSnippet(dataColumns, atomName, directory, fileName, "parquet");
}

/**
 * Binding inference class. Runs Datalog+/- programs to infer bindings.
 */
export class BindingInference {
  _evaluator: Evaluator = new Evaluator();

  async infer(binding: DatalogpmBinding, fieldsToInfer: integer, limit: integer = 1): Promise<BindingInferenceResult> {

    // Generate the predicate terms string according to the fieldsToInfer number
    // (e.g. fieldsToInfer = 3 generates "Term1, Term2, Term3").
    const terms = Array.from({ length: fieldsToInfer }, (_, i) => `Term${i + 1}`).join(', ');

    const outputAtomName = `o${binding.atomName}`;
    const program = `
@input("${binding.atomName}").
@bind("${binding.atomName}", "${binding.dataSource}", "${binding.outermostContainer}", "${binding.innermostContainer}").
o${binding.atomName}(${terms}) :- ${binding.atomName}(${terms}).
@output("o${binding.atomName}").    
@post("o${binding.atomName}", "limit(${limit})").
`;

    const results = await this._evaluator.evaluateProgram(program);
    const bindingInferenceResult =  {
      inputToken: binding.inputToken,
      resultSet: results.resultSet[outputAtomName],
      columnNames: results.columnNames[outputAtomName],
      types: results.types[outputAtomName]
    } as BindingInferenceResult;
    return bindingInferenceResult;
  }

  /**
   * Test a binding by evaluating a mocked Datalog+/- program that includes the binding.
   * @param binding The binding to test.
   * @returns A promise that resolves with an error if the evaluation fails, or undefined if it succeeds.
   */
  async test(binding: DatalogpmBinding): Promise<Datalogpm> {
    const program = `
@input("${binding.atomName}").
@bind("${binding.atomName}", "${binding.dataSource}", "${binding.outermostContainer}", "${binding.innermostContainer}").
o${binding.atomName} :- ${binding.atomName}.
@output("o${binding.atomName}").    
`;

    return this._evaluator.evaluateProgram(program);

  }

  /**
   * Infer schema from a data file and generate Datalog+/- @input/@bind/@term/@mapping snippets.
   * @param filePath Data file path from which to infer schema.
   * @returns A promise that resolves with the generated Datalog+/- snippet.
   */
  async generate(filePath: string): Promise<string> {
    // Extract file extension
    const fileExtension = filePath.split('.').pop()?.toLowerCase();

    let snippet = "";

    if (fileExtension === 'csv') {
      snippet += await makeSnippetsFromCSV(filePath);
    } else if (fileExtension === 'parquet') {
      snippet += await makeSnippetsFromParquet(filePath);
    } else {
      // Show unsupported file type message
      window.showErrorMessage(`Unsupported file type: ${fileExtension}. Only CSV files are supported for binding inference.`);
    }

    return snippet;
  }
}

/**
 * Data column used for snippet generation.
 */
type DataColumn = {
  name: string,
  data?: string[], 
  inferredType: string
};

/**
 * Generate Datalog+/- snippet from data columns.
 * @param dataColumns Data column metadata.
 * @param atomName Atom name for the Datalog+/- snippet.
 * @param directory Directory containing the data file.
 * @param fileName Data file name.
 * @param type Data source type (i.e., "csv", "parquet").
 * @returns Generated Datalog+/- snippet.
 */
function makeSnippet(dataColumns: DataColumn[], atomName: string, directory: string, fileName: string, type: string): string {
  let vadocSnippet = `\n%% Description.\n%% The types below are inferred from Vadacode.\n`;
  for (const [index, dataColumn] of dataColumns.entries()) {
    vadocSnippet += `%% @term {${dataColumn.inferredType}} ${dataColumn.name} <Description of ${dataColumn.name}>.\n`;
  }

  const inputSnippet = `@input("${atomName}").\n`;
  const bindSnippet = `@bind("${atomName}", "${type}", "${directory}", "${fileName}").\n`;

  let mappingSnippet = "";
  for (const [index, dataColumn] of dataColumns.entries()) {
    mappingSnippet += `@mapping("${atomName}",${index},"${dataColumn.name}","${dataColumn.inferredType}").\n`;
  }

  return `${vadocSnippet}${inputSnippet}${bindSnippet}${mappingSnippet}`;
}

/**
 * Associate Parquet converted type and physical type to Datalog+/- type.
 * @param converted_type 
 * @param parquet_type 
 * @returns 
 */
function makeTypeFromParquetType(converted_type: ConvertedType, parquet_type: ParquetType) {
  switch (converted_type) {
    case 'UTF8':
      return 'string';
    case 'MAP':
      return 'string';
    case 'MAP_KEY_VALUE':
      return 'string';
    case 'LIST':
      return 'string';
    case 'ENUM':
      return 'string';
    case 'DECIMAL':
      return 'string';
    case 'DATE':
      return 'date';
    case 'TIME_MILLIS':
      return 'double';
    case 'TIME_MICROS':
      return 'double';
    case 'TIMESTAMP_MILLIS':
      return 'date';
    case 'TIMESTAMP_MICROS':
      return 'date';
    case 'UINT_8':
      return 'int';
    case 'UINT_16':
      return 'int';
    case 'UINT_32':
      return 'int';
    case 'UINT_64':
      return 'int';
    case 'INT_8':
      return 'int';
    case 'INT_16':
      return 'int';
    case 'INT_32':
      return 'int';
    case 'INT_64':
      return 'int';
    case 'JSON':
      return 'string';
    case 'BSON':
      return 'string';
    case 'INTERVAL':
      return 'string';
  }

  switch (parquet_type) {
    case 'BOOLEAN':
      return 'boolean';
    case 'INT32':
      return 'int';
    case 'INT64':
      return 'int';
    case 'INT96':
      return 'int';
    case 'FLOAT':
      return 'double';
    case 'DOUBLE':
      return 'double';
    case 'BYTE_ARRAY':
      return 'string';
    case 'FIXED_LEN_BYTE_ARRAY':
      return 'string';
  }

  // If we don't know the type, return string
  return 'string';
}
