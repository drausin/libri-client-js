#!/usr/bin/env bash

set -eou pipefail
#set -x  # useful for debugging

# local and filesystem constants
LOCAL_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_DIR="$(cd ${LOCAL_DIR}/../.. && pwd)"

# container command contants
VERSION="snapshot" # TODO (drausin) replace with >= 0.2.0 when available
IMAGE="daedalus2718/libri:${VERSION}"
CI_IMAGE="circleci/node:4"
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
librarian_docker_addrs=""
librarian_localhost_addrs=""
for c in $(seq 0 $((${N_LIBRARIANS} - 1))); do
    port=$((20100+c))
    name="librarian-${c}"
    docker run --name "${name}" --net=libri -d -p ${port}:${port} ${IMAGE} \
        librarian start \
        --logLevel debug \
        --nSubscriptions 0 \
        --publicPort ${port} \
        --publicHost ${name} \
        --localPort ${port} \
        --bootstraps "librarian-0:20100"
    librarian_docker_addrs="${name}:${port},${librarian_docker_addrs}"
    librarian_localhost_addrs="localhost:${port},${librarian_localhost_addrs}"
done

# remove trailing spaces
librarian_docker_addrs=${librarian_docker_addrs::-1}
librarian_localhost_addrs=${librarian_localhost_addrs::-1}
sleep 5

echo
echo "testing librarians health..."
docker run --rm --net=libri ${IMAGE} test health -a "${librarian_docker_addrs}"

if [[ "${CIRCLECI:-false}" = "true" ]]; then
  # if CircleCI, run tests from inside a container so they can talk to the libri nodes; compiled artifacts should be
  # fine to copy b/t the CI container and the test-runner container b/c they share the same image
  docker run --name "test-runner" \
    --rm -d \
    --net=libri \
    -w=${REPO_DIR} \
    -e="librarian_addrs=${librarian_docker_addrs}" \
    --entrypoint=tail \
     ${CI_IMAGE} \
     -f /dev/null
  docker cp ${REPO_DIR} test-runner:${REPO_DIR}/..
  docker exec test-runner ./node_modules/jest-cli/bin/jest.js --testPathPattern 'libri/acceptance/.+.test.js'
else
  # assuming running locally, where mapped docker ports are forwarded to localhost, so tests run on local machine
  # can talk with libri containers
  librarian_addrs=${librarian_localhost_addrs}
  export librarian_addrs
  ./node_modules/jest-cli/bin/jest.js --testPathPattern 'libri/acceptance/.+.test.js'
fi

echo
echo "cleaning up..."
docker ps | grep 'libri' | awk '{print $1}' | xargs -I {} docker stop {} || true
docker ps -a | grep 'libri' | awk '{print $1}' | xargs -I {} docker rm {} || true
docker network list | grep 'libri' | awk '{print $2}' | xargs -I {} docker network rm {} || true
