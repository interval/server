#!/bin/bash
set -e # Any subsequent(*) commands which fail will cause the shell script to exit immediately

yarn build

rm -rf release
mkdir release

cp -r dist release/dist
cp package.json release/package.json

mkdir release/prisma
cp prisma/schema.prisma release/prisma/schema.prisma
cp prisma/clean-vite-cache-generator.js release/prisma/clean-vite-cache-generator.js

cp -r email-templates release/email-templates
cp -r LICENSE release/license

tar -czf release.tar.gz release