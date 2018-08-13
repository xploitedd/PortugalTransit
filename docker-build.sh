#!/bin/sh
docker stop ptransit
docker rm ptransit
docker build -t iamkryfor/ptransit:latest .
docker container create --name ptransit --network ptransit -p 3000:3000 iamkryfor/ptransit:latest