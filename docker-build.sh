#!/bin/sh
docker build -t iamkryfor/ptransit:latest .
docker service create --name ptransit --update-delay 10s --replicas $1 -p 3000:3000 iamkryfor/ptransit:latest