#!/bin/bash
set -e # Any subsequent(*) commands which fail will cause the shell script to exit immediately

./scripts/pkg.sh
npm publish ./release --access public