// @flow

const enc = require('./enc');
import {EEK} from './keys';
import {Page} from '../../librarian/api/documents_pb';
const webcrypto = window.crypto.subtle;

// defaultSize is the default maximum number of bytes in a page.
export const defaultSize = 2 * 1024 * 1024;  // 2 MB

/**
 * Split & encrypt compressed bytes into pageDocKeys.
 *
 * @param {Uint8Array} compressed - compressed bytes to split into pageDocKeys
 * @param {EEK} eekKeys - entryDocKey encryption keys
 * @param {Uint8Array} authorPub - author public key
 * @param {int} pageSize - (max) number of bytes in each page
 * @return {Promise.<Page[]>} array of pageDocKeys
 * @public
 */
export function paginate(compressed: Uint8Array,
    eekKeys: EEK,
    authorPub: Uint8Array,
    pageSize: number): Promise<Page[]> {
  let nPages = Math.floor(compressed.length / pageSize) + 1;
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
      end = compressed.length;
    }
    const compressedPage = compressed.slice(start, end);

    // encryptPage & MAC
    const pageCiphertext = enc.encryptPage(
        eekKeys.aesKey,
        eekKeys.pageIVSeed,
        compressedPage.buffer,
        i,
    );

    const pageCiphertextMAC = pageCiphertext.then((value) => {
      return enc.hmac(eekKeys.hmacKey, value);
    });

    // create page and append to pageDocKeys list
    pagePromises[i] = Promise.all(
        [pageCiphertext, pageCiphertextMAC],
    ).then((args) => {
      let page = new Page();
      page.setAuthorPublicKey(authorPub);
      page.setIndex(i);
      page.setCiphertext(new Uint8Array(args[0]));
      page.setCiphertextMac(new Uint8Array(args[1]));
      return page;
    });
  }

  return Promise.all(pagePromises).then((pages) => {
    return pages;
  });
}

/**
 *
 * @param {Page[]} pages - pageDocKeys to decrypt and concatenate together
 * @param {EEK} eekKeys - entryDocKey encryption keys
 * @return {Promise.<Uint8Array>} - compressed bytes assembled from pageDocKeys
 * @public
 */
export function unpaginate(pages: Page[],
    eekKeys: EEK): Promise<Uint8Array> {
  let compressedPages = [];
  for (let i = 0; i < pages.length; i++) {
    // TODO (drausin) validate page

    if (pages[i].getIndex() !== i) {
      throw new Error('received out of order page index ' +
          pages[i].getIndex() + ', expecting ' + i);
    }

    const verifiedPage = webcrypto.verify(
        {name: 'HMAC'},
        eekKeys.hmacKey,
        pages[i].getCiphertextMac(),
        pages[i].getCiphertext(),
    ).then((isValid) => {
      if (!isValid) {
        throw new Error('unexpected page ciphertext MAC');
      }
    });
    compressedPages[i] = verifiedPage.then(() => {
      return enc.decryptPage(
          eekKeys.aesKey,
          eekKeys.pageIVSeed,
          pages[i].getCiphertext(),
          i,
      );
    });
  }

  // concatenate all pageDocKeys together
  return Promise.all(compressedPages).then((compressedPages2) => {
    let compressedLength = 0;
    for (let i = 0; i < compressedPages2.length; i++) {
      compressedLength += compressedPages2[i].byteLength;
    }
    const compressed = new Uint8Array(compressedLength);
    let offset = 0;
    for (let i = 0; i < compressedPages2.length; i++) {
      compressed.set(new Uint8Array(compressedPages2[i]), offset);
      offset += compressedPages2[i].byteLength;
    }
    return compressed;
  });
}

