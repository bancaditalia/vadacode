#!/bin/bash

# SPDX-License-Identifier: SSPL-1.0
# Copyright (c) 2023-present Banca d'Italia

#  _   __        __                 __
# | | / /__ ____/ /__ ________  ___/ /__
# | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
# |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
# 
# @file Check extension package size to avoid bloated extensions,
#       e.g. due to large dependencies or assets.

# Usage: ./check-size.sh extension.vsix

# Set your size budget in bytes
MAX_SIZE=$((3 * 1024 * 1024))

# Get the filename from the first argument
OUTPUT_FILE="$1"

if [ -z "$OUTPUT_FILE" ]; then
  echo "❌ Error: No filename provided."
  echo "Usage: $0 <output_file.vsix>"
  exit 1
fi

# Check if file was created
if [ ! -f "$OUTPUT_FILE" ]; then
  echo "❌ Error: Package file '$OUTPUT_FILE' not found."
  exit 1
fi

# Detect OS and get file size
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS version of stat
  FILE_SIZE=$(stat -f%z "$OUTPUT_FILE")
else
  # Linux version of stat
  FILE_SIZE=$(stat -c%s "$OUTPUT_FILE")
fi

echo "📦 Package '$OUTPUT_FILE' size: $FILE_SIZE bytes"

# Check against max size
if [ "$FILE_SIZE" -gt "$MAX_SIZE" ]; then
  echo "❌ Error: Extension package exceeds size limit of $MAX_SIZE bytes"
  exit 1
else
  echo "✅ Extension package is within size budget"
fi
