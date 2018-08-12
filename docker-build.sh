#!/bin/sh
docker build -t iamkryfor/ptransit:latest .
for arg in "$@"; do
    docker run -d --name ptransit-$arg -p 3000 iamkryfor/ptransit:latest
done