#!/bin/bash
set -e # Any subsequent(*) commands which fail will cause the shell script to exit immediately

psql -c 'CREATE database "interval";'

psql -d 'interval' -f './prisma/init.sql'

DATABASE_URL=postgresql://alex:@localhost/interval yarn prisma db push