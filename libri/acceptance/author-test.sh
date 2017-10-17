#!/usr/bin/env bash

set -eou pipefail
#set -x  # useful for debugging

# local and filesystem constants
LOCAL_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOCAL_TEST_DATA_DIR="${LOCAL_DIR}/data"

# get test data if it doesn't exist
if [[ ! -d "${LOCAL_TEST_DATA_DIR}" ]]; then
    ${LOCAL_DIR}/get-test-data.sh
fi

# container command contants
VERSION="snapshot" # "0.1.0"
IMAGE="daedalus2718/libri:${VERSION}"
KEYCHAIN_DIR="/keychains"  # inside container
CONTAINER_TEST_DATA_DIR="/test-data"
LIBRI_PASSPHRASE="test passphrase"  # bypass command-line entry
N_LIBRARIANS=3

# clean up any existing libri containers
echo "cleaning up existing containers..."
docker ps | grep 'libri' | awk '{print $1}' | xargs -I {} docker stop {} || true
docker ps -a | grep 'libri' | awk '{print $1}' | xargs -I {} docker rm {} || true
docker network list | grep 'libri' | awk '{print $2}' | xargs -I {} docker network rm {} || true

echo
echo "creating libri docker network..."
docker network create libri

echo
echo "starting librarian peers..."
librarian_addrs=""
librarian_containers=""
for c in $(seq 0 $((${N_LIBRARIANS} - 1))); do
    port=$((20100+c))
    metricsPort=$((20200+c))
    name="librarian-${c}"
    docker run --name "${name}" --net=libri -d -p ${port}:${port} ${IMAGE} \
        librarian start \
        --logLevel debug \
        --nSubscriptions 0 \
        --publicPort ${port} \
        --publicHost ${name} \
        --localPort ${port} \
        --localMetricsPort ${metricsPort} \
        --bootstraps "librarian-0:20100"
    librarian_addrs="${name}:${port},${librarian_addrs}"
    librarian_containers="${name} ${librarian_containers}"
done
librarian_addrs=${librarian_addrs::-1}  # remove trailing space
sleep 5

echo
echo "testing librarians health..."
docker run --rm --net=libri ${IMAGE} test health -a "${librarian_addrs}"

# TODO (drausin) add jest acceptance test

#echo
#echo "cleaning up..."
#rm -f ${LOCAL_TEST_DATA_DIR}/downloaded.*
#docker ps | grep 'libri' | awk '{print $1}' | xargs -I {} docker stop {} || true
#docker ps -a | grep 'libri' | awk '{print $1}' | xargs -I {} docker rm {} || true
#docker network list | grep 'libri' | awk '{print $2}' | xargs -I {} docker network rm {} || true
