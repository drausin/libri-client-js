// @flow

import * as jspb from 'google-protobuf';
import * as id from '../../common/id.js';
import * as docs from './documents_pb';

const webcrypto = window.crypto.subtle;

/**
 * A document and its key.
 */
export class DocumentKey {
  document: docs.Document;
  key: id.ID;

  /**
   * @param {docs.Document} document
   * @param {id.ID} key
   */
  constructor(document: docs.Document, key: id.ID) {
    this.document = document;
    this.key = key;
  }
}

/**
 * Get the key for a protobuf message.
 *
 * @param {jspb.Message} value - protobuf message to hash for key
 * @return {Promise.<id.ID>} - key
 * @public
 */
export function getKey(value: jspb.Message): Promise<id.ID> {
  const bytes = value.serializeBinary();
  return webcrypto.digest({name: 'SHA-256'}, bytes).then((hash) => {
    return new id.ID(new Uint8Array(hash));
  });
}

/**
 * Get the document and key that wrap a given page.
 *
 * @param {docs.Page} page - page to wrap in the document
 * @return {Promise.<DocumentKey>}
 * @public
 */
export function getPageDocumentKey(page: docs.Page): Promise<DocumentKey> {
  let doc = new docs.Document();
  doc.setPage(page);
  return getKey(doc).then((key) => {
    return new DocumentKey(doc, key);
  });
}
