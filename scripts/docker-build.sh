#!/bin/bash
set -e # Any subsequent(*) commands which fail will cause the shell script to exit immediately

# Build the docker image + pushes it to registry
docker buildx build --output=type=registry --platform=linux/amd64,linux/arm64 -t alexarena/interval-server .