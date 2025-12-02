#!/bin/bash

# SPDX-License-Identifier: SSPL-1.0
# Copyright (c) 2023-present Banca d'Italia

#  _   __        __                 __
# | | / /__ ____/ /__ ________  ___/ /__
# | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
# |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
# 
# @file Version update script.

# Exit on error
set -e

# First argument is the new version
NEW_VERSION=$1

# Check if a new version was provided as an argument
if [ -z "$NEW_VERSION" ]; then
  echo "Usage: $0 <new_version>"
  exit 1
fi

# Check that the new version is semver compliant
# https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
# Here using a simpler regex that should be enough for our use case (semver suggestion doesn't compile in bash)
# https://stackoverflow.com/questions/72900289/regex-for-semver
SEMVER_REGEX='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-(0|[1-9A-Za-z-][0-9A-Za-z-]*)(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$'
if [[ ! "$NEW_VERSION" =~ $SEMVER_REGEX ]]; then
  echo "Version is not in major.minor.patch format."
  exit 1
fi

# 
errors=0

# Update `version` file
versionFile=version
if [ -f "${versionFile}" ]; then
  echo "${NEW_VERSION}" > "${versionFile}"
  echo "[✓] Updated ${versionFile}"
else
  echo "[✗] File $versionFile not found!"
  errors=$((errors + 1))
fi

# Update Nodejs package.json
filesToUpdate=("package.json" "datalogpm-parser/package.json" "client/package.json" "server/package.json" "vadacode-results-webview/package.json" "datalogpm-results-table-renderer/package.json")
for versionFile in "${filesToUpdate[@]}"; do
	if [ -f "${versionFile}" ]; then
		sed -i.bak -E "s/\"version\": \"[v]?[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9]+)?\"/\"version\": \"${NEW_VERSION}\"/g" "${versionFile}"
		echo "[✓] Updated ${versionFile}"
		rm -f "${versionFile}.bak" # Remove backup file created by sed
	else
		echo "[✗] File ${versionFile} not found!"
		errors=$((errors + 1))
	fi
done

# Update Antora's configuration file
versionFile=docs/manual/antora.yml
if [ -f "${versionFile}" ]; then
	sed -i.bak -E "s/version: \"[v]?[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9]+)?\"/version: \"${NEW_VERSION}\"/g" "${versionFile}"
  echo "[✓] Updated ${versionFile}"
	rm -f "${versionFile}.bak" # Remove backup file created by sed
else
  echo "[✗] File ${versionFile} not found!"
  errors=$((errors + 1))
fi

# Final message
if [ "$errors" -eq 0 ]; then
	echo "🚀 Version update completed!"
	echo "Remember to run npm install to update the various package-lock.json."
	exit 0
else
	echo "💣 There were errors during the version update!"
	exit 1
fi
