#!/bin/sh
docker network rm ptransit
docker stop ptransit
docker rm ptransit
docker stop redis
docker rm redis
docker build -t iamkryfor/ptransit:latest .
docker network create -d overlay --attachable ptransit
docker container create --name redis --network ptransit redis
docker container create --name ptransit --network ptransit -p 3000:3000 iamkryfor/ptransit:latest