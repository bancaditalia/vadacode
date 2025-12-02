#!/bin/bash

# SPDX-License-Identifier: SSPL-1.0
# Copyright (c) 2023-present Banca d'Italia
#  _   __        __                 __
# | | / /__ ____/ /__ ________  ___/ /__
# | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
# |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
# 
# @file Generates the ANTLR parser code from the grammar file.

set -e

echo "Generating ANTLR grammar..."
java -jar ./bin/antlr-4.13.1-complete.jar -o src/ -long-messages -visitor -Dlanguage=TypeScript ./grammar/Datalogpm.g4