#!/usr/bin/env bash

# SPDX-License-Identifier: SSPL-1.0
# Copyright (c) 2023-present Banca d'Italia

#  _   __        __                 __
# | | / /__ ____/ /__ ________  ___/ /__
# | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
# |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
# 
# @file End-to-end tests runner script.

# Exit whenever any command within the script fails
set -e

export CODE_TESTS_PATH="$(pwd)/client/out/test"
export CODE_TESTS_WORKSPACE="$(pwd)/client/testFixture"

node "$(pwd)/client/out/test/runTest"