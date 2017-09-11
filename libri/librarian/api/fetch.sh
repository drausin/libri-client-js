#! /bin/bash 

set -eou pipefail

LIBRI_URL='https://raw.githubusercontent.com/drausin/libri'
LIBRI_REF='083424125624e0095befbf176cac26574015a047'

DIR='libri/librarian/api'
FILES=('documents.proto' 'librarian.proto')

for file in "${FILES[@]}"; do
    curl -sL "${LIBRI_URL}/${LIBRI_REF}/${DIR}/${file}" > ${file}
done
