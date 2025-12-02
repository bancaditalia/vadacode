# SPDX-License-Identifier: SSPL-1.0
# Copyright (c) 2023-present Banca d'Italia# 
#  _   __        __                 __
# | | / /__ ____/ /__ ________  ___/ /__
# | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
# |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
# 
# @file Download ANTLR jar with checksum verification.

#!/usr/bin/env bash
set -euo pipefail

JAR_NAME="antlr-4.13.1-complete.jar"
URL="https://www.antlr.org/download/${JAR_NAME}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_PATH="$SCRIPT_DIR/$JAR_NAME"

FORCE=false
EXPECTED_SHA=""

usage() {
	cat <<EOF
Usage: $(basename "$0") [--force|-f] [--sha256|-s <hex>]

Download ${JAR_NAME} into the script's directory (${SCRIPT_DIR}) and optionally verify SHA256.

Options:
	-f, --force        Overwrite existing file if present
	-s, --sha256 <hex> Expected SHA256 checksum (hex). If omitted, the script will look for a
										 local file named ${JAR_NAME}.sha256 in the same directory.
	-h, --help         Show this help message
EOF
}

while [[ ${#} -gt 0 ]]; do
	case "$1" in
		-f|--force)
			FORCE=true
			shift
			;;
		-s|--sha256)
			if [[ -z "${2-}" ]]; then
				echo "Missing value for --sha256" >&2
				exit 2
			fi
			EXPECTED_SHA="$2"
			shift 2
			;;
		-h|--help)
			usage
			exit 0
			;;
		*)
			echo "Unknown argument: $1" >&2
			usage
			exit 2
			;;
	esac
done

if [[ -f "$TARGET_PATH" && "$FORCE" != true ]]; then
	echo "${JAR_NAME} already exists at ${TARGET_PATH}. Use --force to re-download."
	exit 0
fi

echo "Downloading ${JAR_NAME} to ${TARGET_PATH}..."

download_with_curl() {
	curl -fSL --retry 3 --retry-delay 2 -o "$TARGET_PATH" "$URL"
}

download_with_wget() {
	wget -q -O "$TARGET_PATH" "$URL"
}

if command -v curl >/dev/null 2>&1; then
	download_with_curl
elif command -v wget >/dev/null 2>&1; then
	download_with_wget
else
	echo "Error: neither curl nor wget is available to download files." >&2
	exit 3
fi

echo "Download finished: ${TARGET_PATH}"

# Determine expected checksum: priority CLI > env ANTlr_SHA256 > local .sha256 file
if [[ -z "$EXPECTED_SHA" && -n "${ANTLR_SHA256-}" ]]; then
	EXPECTED_SHA="$ANTLR_SHA256"
fi

LOCAL_SHA_FILE="$SCRIPT_DIR/${JAR_NAME}.sha256"
if [[ -z "$EXPECTED_SHA" && -f "$LOCAL_SHA_FILE" ]]; then
	EXPECTED_SHA="$(cut -d ' ' -f1 < "$LOCAL_SHA_FILE" | tr -d '\r\n' )"
fi

# If still empty, attempt to download remote .sha256 (best-effort)
if [[ -z "$EXPECTED_SHA" ]]; then
	for suffix in ".sha256" ".sha256.txt"; do
		REMOTE_SHA_URL="$URL$suffix"
		TMP_SHA_FILE="$(mktemp)"
		if command -v curl >/dev/null 2>&1; then
			if curl -fsSL --retry 2 --retry-delay 1 -o "$TMP_SHA_FILE" "$REMOTE_SHA_URL"; then
				EXPECTED_SHA="$(cut -d ' ' -f1 < "$TMP_SHA_FILE" | tr -d '\r\n')"
				rm -f "$TMP_SHA_FILE"
				break
			fi
		elif command -v wget >/dev/null 2>&1; then
			if wget -q -O "$TMP_SHA_FILE" "$REMOTE_SHA_URL"; then
				EXPECTED_SHA="$(cut -d ' ' -f1 < "$TMP_SHA_FILE" | tr -d '\r\n')"
				rm -f "$TMP_SHA_FILE"
				break
			fi
		fi
		rm -f "$TMP_SHA_FILE" || true
	done
fi

compute_sha256() {
	local file="$1"
	if command -v sha256sum >/dev/null 2>&1; then
		sha256sum "$file" | awk '{print $1}'
	elif command -v shasum >/dev/null 2>&1; then
		shasum -a 256 "$file" | awk '{print $1}'
	elif command -v openssl >/dev/null 2>&1; then
		openssl dgst -sha256 "$file" | awk '{print $2}'
	else
		echo ""
	fi
}

if [[ -n "$EXPECTED_SHA" ]]; then
	echo "Verifying SHA256 checksum..."
	ACTUAL_SHA="$(compute_sha256 "$TARGET_PATH")"
	if [[ -z "$ACTUAL_SHA" ]]; then
		echo "Warning: no checksum tool found (sha256sum/shasum/openssl). Skipping verification." >&2
	else
		# normalize
		ACTUAL_SHA_LOWER="$(echo "$ACTUAL_SHA" | tr '[:upper:]' '[:lower:]')"
		EXPECTED_SHA_LOWER="$(echo "$EXPECTED_SHA" | tr '[:upper:]' '[:lower:]')"
		if [[ "$ACTUAL_SHA_LOWER" != "$EXPECTED_SHA_LOWER" ]]; then
			echo "ERROR: checksum mismatch!" >&2
			echo "Expected: $EXPECTED_SHA_LOWER" >&2
			echo "Actual:   $ACTUAL_SHA_LOWER" >&2
			rm -f "$TARGET_PATH" || true
			exit 4
		else
			echo "Checksum OK: $ACTUAL_SHA_LOWER"
		fi
	fi
else
	echo "No expected checksum provided or discovered; skipping verification."
	echo "To enable verification, provide --sha256 <hex> or a file named ${JAR_NAME}.sha256 in ${SCRIPT_DIR}."
fi

echo "Done."

exit 0
