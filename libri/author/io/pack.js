import * as docs from '../../librarian/api/documents_pb';
import * as docslib from '../../librarian/api/documents';
import * as comp from './comp';
import * as enc from './enc';
import * as page from './page';
import * as keys from './keys';

/**
 * A document + its (plaintext) metadata.
 */
class DocumentMetadata {
  document: docs.Document;
  metadata: docs.EntryMetadata;

  /**
   * @param {docs.Document} document
   * @param {docs.EntryMetadata} metadata
   */
  constructor(document: docs.Document, metadata: docs.EntryMetadata) {
    this.document = document;
    this.metadata = metadata;
  }
}

/**
 * Pack content into a document.
 *
 * @param {Uint8Array} content - content to pack into a document
 * @param {string} mediaType - content media type
 * @param {keys.EEK} keys - EEK for entry
 * @param {Uint8Array} authorPub - author public key
 * @return {Promise.<docs.Document>} - entry document from content
 * @public
 */
export function pack(content: Uint8Array, mediaType: string, keys: keys.EEK,
    authorPub: Uint8Array): DocumentMetadata {
  const codec = comp.getCompressionCodec(mediaType);
  const compressed = comp.compress(content, codec);
  const pagesP = page.paginate(compressed, keys, authorPub, page.defaultSize);
  const uncompressedMacP = enc.hmac(keys.hmacKey, content);
  const ciphertextP = Promise.all([pagesP]).then((args) => {
    return getFullCiphertext(args[0]);
  });
  const ciphertextMacP = ciphertextP.then((ciphertext) => {
    return enc.hmac(keys.hmacKey, ciphertext);
  });
  const ciphertextSizeP = ciphertextP.then((ciphertext) => {
    return ciphertext.length;
  });

  const metadataP = Promise.all([
    ciphertextSizeP, ciphertextMacP, uncompressedMacP,
  ]).then((args) => {
    let metadata = new docs.EntryMetadata();
    metadata.setMediaType(mediaType);
    metadata.setCompressionCodec(codec);
    metadata.setCiphertextSize(args[0]);
    metadata.setCiphertextMac(new Uint8Array(args[1]));
    metadata.setUncompressedSize(content.length);
    metadata.setUncompressedMac(new Uint8Array(args[2]));
    return metadata;
  });

  const encMetadataP = metadataP.then((metadata) => {
    return enc.encryptMetadata(metadata, keys);
  });

  return Promise.all([pagesP, encMetadataP, metadataP]).then((args) => {
    return new DocumentMetadata(newEntryDoc(args[0], args[1], authorPub),
        args[2]);
  });
}

/**
 * Construct full ciphertext by concatenating those of individual pages.
 *
 * @param {doc.Page[]} pages - pages whose ciphertexts to concatenate
 * @return {Uint8Array} - concatenated ciphertext
 */
function getFullCiphertext(pages: docs.Page[]): Uint8Array {
  let ciphertextLength = 0;
  for (let i = 0; i < pages.length; i++) {
    ciphertextLength += pages[i].getCiphertext().byteLength;
  }
  const ciphertext = new Uint8Array(ciphertextLength);
  let offset = 0;
  for (let i = 0; i < pages.length; i++) {
    ciphertext.set(new Uint8Array(pages[i].getCiphertext()), offset);
    offset += pages[i].getCiphertext().byteLength;
  }
  return ciphertext;
}

/**
 * Generate a new entry document.
 *
 * @param {docs.Page[]} pages - page(s) to extract keys from
 * @param {enc.EncryptedMetadata} encMetadata - encrypted plaintext metadata
 * @param {Uint8Array} authorPub - author public key
 * @return {docs.Document} - generated document
 */
function newEntryDoc(pages: docs.Page[], encMetadata: enc.EncryptedMetadata,
    authorPub: Uint8Array): docs.Document {
  let doc = new docs.Document();
  if (pages.length === 1) {
    doc.setEntry(newSinglePageEntry(pages[0], encMetadata, authorPub));
  } else {
    doc.setEntry(newMultiPageEntry(pages, encMetadata, authorPub));
  }
  return doc;
}

/**
 * Generate a new single-page entry.
 *
 * @param {docs.Page} page - page to wrap in entry
 * @param {enc.EncryptedMetadata} encMetadata - encrypted plaintext metadata
 * @param {Uint8Array} authorPub - author public key
 * @return {docs.Entry} - single-page entry
 */
function newSinglePageEntry(page: docs.Page,
    encMetadata: enc.EncryptedMetadata, authorPub: Uint8Array): docs.Entry {
  let entry = new docs.Entry();
  entry.setAuthorPublicKey(authorPub);
  entry.setPage(page);
  entry.setCreatedTime(Date.now() / 1000);  // ms -> sec
  entry.setMetadataCiphertext(new Uint8Array(encMetadata.ciphertext));
  entry.setMetadataCiphertextMac(new Uint8Array(encMetadata.ciphertextMAC));
  return entry;
}

/**
 * Generate a new multi-page entry from a list of pages.
 *
 * @param {docs.Page[]} pages - pages to extract page keys from
 * @param {enc.EncryptedMetadata} encMetadata - encrypted plaintext metadata
 * @param {Uint8Array} authorPub - author public key
 * @return {docs.Entry} - multi-page entry
 */
function newMultiPageEntry(pages: docs.Page[],
    encMetadata: enc.EncryptedMetadata, authorPub: Uint8Array): docs.Entry {
  let pageKeys = [];
  for (let i = 0; i < pages.length; i++) {
    console.log(pages[i].toObject());
    pageKeys[i] = docslib.getKey(pages[i]).bytes;
  }
  let entry = new docs.Entry();
  entry.setAuthorPublicKey(authorPub);
  entry.setPageKeys(pageKeys);
  entry.setCreatedTime(Date.now() / 1000);  // ms -> sec
  entry.setMetadataCiphertext(encMetadata.ciphertext);
  entry.setMetadataCiphertextMac(encMetadata.ciphertextMAC);
  return entry;
}

// - unpack
