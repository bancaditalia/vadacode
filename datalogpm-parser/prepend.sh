#!/bin/bash

# SPDX-License-Identifier: SSPL-1.0
# Copyright (c) 2023-present Banca d'Italia
#  _   __        __                 __
# | | / /__ ____/ /__ ________  ___/ /__
# | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
# |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
# 
# @file Prepends a given string to a specified file.
#       Used to add typescript linting directives to 
#       auto-generated parser files.

# Check if the correct number of arguments is provided
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 'string_to_prepend' filename"
    exit 1
fi

# Assign arguments to variables
string_to_prepend=$1
filename=$2

# Prepend the string to the file
echo -e "$string_to_prepend\n$(cat "$filename")" > "$filename"
