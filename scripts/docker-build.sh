#!/bin/bash
set -e # Any subsequent(*) commands which fail will cause the shell script to exit immediately

pkgV=`node -e "console.log(require('./package.json').version.trim())"`
imageName=alexarena/interval-server:$pkgV
# Build the docker image + pushes it to registry
docker buildx build --output=type=registry --platform=linux/amd64,linux/arm64 -t $imageName .