#!/usr/bin/env bash
set -euo pipefail

direnv allow
corepack install
yarn install
