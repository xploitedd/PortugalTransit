#!/bin/sh
docker build -t iamkryfor/ptransit:latest .
docker stop ptransit
docker rm ptransit
docker container create --name ptransit --network ptransit -p 3000:3000 iamkryfor/ptransit:latest