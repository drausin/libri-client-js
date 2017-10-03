// @flow

import {
  Document,
  Envelope,
  Entry,
  EntryMetadata,
  Page,
  PageKeys,
} from '../../librarian/api/documents_pb';
import {
  DocumentKey,
  getKey,
  getPageDocumentKey,
} from '../../librarian/api/documents';
import * as docs from '../../librarian/api/documents_pb';
import * as id from '../../common/id';
import * as comp from './comp';
import * as enc from './enc';
import * as page from './page';
import {EEK} from './keys';

/**
 * A packed entry, possible pages, and its plaintext metadata.
 */
export class PackedEntry {
  entryDocKey: DocumentKey;
  pageDocKeys: DocumentKey[];
  metadata: EntryMetadata;

  /**
   * @param {DocumentKey} entryDocKey
   * @param {DocumentKey[]} pageDocKeys
   * @param {docs.EntryMetadata} metadata
   */
  constructor(entryDocKey: DocumentKey,
      pageDocKeys: DocumentKey[],
      metadata: EntryMetadata) {
    this.entryDocKey = entryDocKey;
    this.pageDocKeys = pageDocKeys;
    this.metadata = metadata;
  }
}

/**
 * Pack content into a entryDocKey.
 *
 * @param {Uint8Array} content - content to pack into a entryDocKey
 * @param {string} mediaType - content media type
 * @param {EEK} keys - EEK for entryDoc
 * @param {Uint8Array} authorPub - author public key
 * @param {number} pageSize - max bytes per page
 * @return {Promise.<PackedEntry>} - entryDoc & page documents +
 * metadata
 * @public
 */
export function pack(content: Uint8Array, mediaType: string, keys: EEK,
    authorPub: Uint8Array,
    pageSize: number = page.defaultSize): Promise<PackedEntry> {
  // get pages
  const codec = comp.getCompressionCodec(mediaType);
  const compressed = comp.compress(content, codec);
  const pagesP = page.paginate(compressed, keys, authorPub, pageSize);

  // get and encrypt metadata
  const uncompressedMacP = enc.hmac(keys.hmacKey, content.buffer);
  const ciphertextP = pagesP.then((pages) => {
    return getFullCiphertext(pages);
  });
  const ciphertextMacP = ciphertextP.then((ciphertext) => {
    return enc.hmac(keys.hmacKey, ciphertext.buffer);
  });
  const ciphertextSizeP = ciphertextP.then((ciphertext) => {
    return ciphertext.length;
  });
  const metadataP = Promise.all([
    ciphertextSizeP, ciphertextMacP, uncompressedMacP,
  ]).then((args) => {
    let metadata = new EntryMetadata();
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

  // get page docs and keys
  const pageDocKeysP = pagesP.then((pages) => {
    let pageDocKeyPs = [];
    for (let i = 0; i < pages.length; i++) {
      pageDocKeyPs[i] = getPageDocumentKey(pages[i]);
    }
    return Promise.all(pageDocKeyPs).then((pageDocKeys) => {
      return pageDocKeys;
    });
  });

  // assemble pages into entry document, key, and metadata
  return Promise.all([pageDocKeysP, encMetadataP, metadataP]).then((args) => {
    return newEntryDocKey(args[0], args[1], authorPub).then((entryDocKey) => {
      return new PackedEntry(entryDocKey, args[0], args[2]);
    });
  });
}

/**
 * Entry content + its plaintext metadata.
 */
class UnpackedContent {
  content: Uint8Array;
  metadata: EntryMetadata;

  /**
   * @param {Uint8Array} content
   * @param {docs.EntryMetadata} metadata
   */
  constructor(content: Uint8Array, metadata: EntryMetadata) {
    this.content = content;
    this.metadata = metadata;
  }
}

/**
 * Unpack an entry and pages into a content array.
 *
 * @param {docs.Document} entryDoc - entry document to unpack
 * @param {DocumentKey[]} pageDocKeys - list of ordered pages with
 * keys, empty when entry is single-page
 * @param {EEK} keys - EEK for entryDoc
 * @return {Promise.<UnpackedContent>}
 * @public
 */
export function unpack(entryDoc: Document, pageDocKeys: DocumentKey[],
    keys: EEK): Promise<UnpackedContent> {
  const encMetadata = new enc.EncryptedMetadata(
      entryDoc.getEntry().getMetadataCiphertext(),
      entryDoc.getEntry().getMetadataCiphertextMac(),
  );
  const metadataP = enc.decryptMetadata(encMetadata, keys);

  let pages = [];
  const entry = entryDoc.getEntry();
  if (entry.getPage() !== undefined) {
    pages = [entry.getPage()];
  } else {
    const pageKeys = entry.getPageKeys().getKeysList();
    if (pageKeys.length !== pageDocKeys.length) {
      throw new Error('pageDocKeys has unexpected length (' +
          pageDocKeys.length + '), expected ' + pageKeys.length);
    }
    for (let i = 0; i < pageKeys.length; i++) {
      const pageID = new id.ID(pageKeys[i]);
      if (pageDocKeys[i].key.compare(pageID) !== 0) {
        throw new Error('page has unexpected key');
      }
      pages[i] = pageDocKeys[i].document.getPage();
    }
  }

  const compressedP = page.unpaginate(pages, keys);
  const codecP = metadataP.then((metadata) => {
    return metadata.getCompressionCodec();
  });
  const contentP = Promise.all([compressedP, codecP]).then((args) => {
    return comp.decompress(args[0], args[1]);
  });
  return Promise.all([contentP, metadataP]).then((args) => {
    return new UnpackedContent(args[0], args[1]);
  });
}

/**
 * Create a new entry document.
 *
 * @param {DocumentKey[]} pageDocKeys - page(s) to extract keys from
 * @param {EncryptedMetadata} encMetadata - encrypted plaintext metadata
 * @param {Uint8Array} authorPub - author public key
 * @return {Promise.<DocumentKey>} - generated entry doc and key
 */
function newEntryDocKey(pageDocKeys: DocumentKey[],
    encMetadata: enc.EncryptedMetadata,
    authorPub: Uint8Array): Promise<DocumentKey> {
  let entry = new Entry();
  entry.setAuthorPublicKey(authorPub);
  entry.setCreatedTime(Math.floor(Date.now() / 1000)); // ms -> sec
  entry.setMetadataCiphertext(new Uint8Array(encMetadata.ciphertext));
  entry.setMetadataCiphertextMac(new Uint8Array(encMetadata.ciphertextMAC));

  // set page or page keys
  if (pageDocKeys.length === 1) {
    entry.setPage(pageDocKeys[0].document.getPage());
  } else {
    let pageKeys = [];
    for (let i = 0; i < pageDocKeys.length; i++) {
      pageKeys[i] = pageDocKeys[i].key.bytes;
    }
    const pageKeysObj = new PageKeys();
    pageKeysObj.setKeysList(pageKeys);
    entry.setPageKeys(pageKeysObj);
  }

  // return document and key
  let doc = new Document();
  doc.setEntry(entry);
  return getKey(doc).then((key) => {
    return new DocumentKey(doc, key);
  });
}

/**
 * Create a new envelope document.
 *
 * @param {id.ID} entryKey - entry ID
 * @param {Uint8Array} authorPub - author public key
 * @param {Uint8Array} readerPub - reader public key
 * @param {Uint8Array} eekCiphertext - EEK ciphertext
 * @param {Uint8Array} eekCiphertextMAC - EEK ciphertext MAC
 * @return {Promise.<DocumentKey>}
 */
export function newEnvelopeDoc(entryKey: id.ID, authorPub: Uint8Array,
    readerPub: Uint8Array, eekCiphertext: Uint8Array,
    eekCiphertextMAC: Uint8Array): Promise<docs.Document> {
  let envelope = new Envelope();
  envelope.setEntryKey(entryKey.bytes);
  envelope.setAuthorPublicKey(authorPub);
  envelope.setReaderPublicKey(readerPub);
  envelope.setEekCiphertext(eekCiphertext);
  envelope.setEekCiphertextMac(eekCiphertextMAC);

  // construct doc and key
  let doc = new Document();
  doc.setEnvelope(envelope);
  return doc;
}

/**
 * Construct full ciphertext by concatenating those of individual pageDocKeys.
 *
 * @param {doc.Page[]} pages - pageDocKeys whose ciphertexts to concatenate
 * @return {Uint8Array} - concatenated ciphertext
 */
function getFullCiphertext(pages: Page[]): Uint8Array {
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
