'use strict';

const enc = require('./enc');
const keys = require('./keys');
const docs = require('../../librarian/api/documents_pb');

const webcrypto = window.crypto.subtle;

/**
 * Split & encrypt compressed bytes into pages.
 *
 * @param {Uint8Array} compressed - compressed bytes to split into pages
 * @param {EEK} eekKeys - entry encryption keys
 * @param {Uint8Array} authorPub - author public key
 * @param {int} pageSize - (max) number of bytes in each page
 * @returns {Promise.<docs.Page[]>} array of pages
 */
function paginate(compressed, eekKeys, authorPub, pageSize) {
  let nPages = compressed.length / pageSize + 1;
  if (compressed.length % pageSize === 0) {
    nPages = compressed.length / pageSize;
  }

  // for each page
  const pagePromises = [];
  for (let i = 0; i < nPages; i++) {

    // get page byte bounds [start, end)
    const start = i * pageSize;
    let end = (i + 1) * pageSize;
    if (end > compressed.length) {
      end = compressed.length
    }
    const compressedPage = compressed.slice(start, end);

    // encrypt & MAC
    const pageCiphertext = enc.encrypt(
        eekKeys.aesKey,
        eekKeys.pageIVSeed,
        compressedPage.buffer,
        i,
    );

    const pageCiphertextMAC = pageCiphertext.then((value) => {
      return enc.hmac(eekKeys.hmacKey, value);
    });

    // create page and append to pages list
    pagePromises[i] = Promise.all(
        [pageCiphertext, pageCiphertextMAC],
    ).then(args => {
      let page = new docs.Page();
      page.setAuthorPublicKey(authorPub);
      page.setIndex(i);
      page.setCiphertext(args[0]);
      page.setCiphertextMac(args[1]);
      return page
      // return new docs.Page({
      //   'authorPublicKey': authorPub,
      //   'index': i,
      //   'ciphertext': args[0],
      //   'ciphertextMac': args[1],
      // });
    });
  }

  return Promise.all(pagePromises).then((pages) => {
    return pages
  });
}

/**
 *
 * @param {docs.Page[]} pages - pages to decrypt and concatenate together
 * @param {EEK} eekKeys - entry encryption keys
 * @returns {Promise.<Uint8Array>} - compressed bytes assembled from pages
 */
function unpaginate(pages, eekKeys) {
  let compressedPages = [];
  for (let i = 0; i < pages.length; i++) {
    // TODO (drausin) validate page

    if (pages[i].getIndex() !== i) {
      throw new Error('received out of order page index ' +
          pages[i].getIndex() + ', expecting ' + i)
    }

    const verifiedPage = webcrypto.verify(
        {name: "HMAC"},
        eekKeys.hmacKey,
        pages[i].getCiphertextMac(),
        pages[i].getCiphertext(),
    ).then(isValid => {
      if (!isValid) {
        throw new Error('unexpected page ciphertext MAC')
      }
    });
    compressedPages[i] = verifiedPage.then(() => {
      return enc.decrypt(
          eekKeys.aesKey,
          eekKeys.pageIVSeed,
          pages[i].getCiphertext(),
          i,
      )
    });
  }

  // concatenate all pages together
  return Promise.all(compressedPages).then(compressedPages2 => {
    let compressedLength = 0;
    for (let i = 0; i < compressedPages2.length; i++) {
      compressedLength += compressedPages2[i].byteLength
    }
    const compressed = new Uint8Array(compressedLength);
    let offset = 0;
    for (let i = 0; i < compressedPages2.length; i++) {
      compressed.set(new Uint8Array(compressedPages2[i]), offset);
      offset += compressedPages2[i].byteLength
    }
    return compressed
  })
}

export {
  paginate,
  unpaginate,
}