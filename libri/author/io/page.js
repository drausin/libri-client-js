'use strict';

const enc = require('./enc');

function paginate(compressed, keys, authorPub, pageSize) {
  let nPages = length(compressed) / pageSize + 1;
  if (length(compressed) % pageSize === 0) {
    nPages = length(compressed) / pageSize;
  }

  // for each page
  for (let i = 0; i < nPages; i++) {

    // get page byte bounds [start, end)
    const start = i * pageSize;
    let end = (i + 1) * pageSize;
    if (end > length(compressed)) {
      end = length(compressed)
    }

    const compressedPage = compressed.slice(start, end);

    // encrypt
    const pageCiphertext = enc.encrypt(
        keys.aesKey,
        keys.ivSeed,
        compressedPage,
        i,
    );

    const pageMAC = enc.hmac(keys.hmacKey, pageCiphertext);

    // create page
  }
}

function unpaginate(pages, decompressor, decrypter, keys) {

}