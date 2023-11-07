#!/bin/bash
./node_modules/.bin/tsc --project tsconfig.server.json --incremental \
&& \
TS_NODE_BASEURL=./dist node -r tsconfig-paths/register ./dist/src/server/internal/listen.js
