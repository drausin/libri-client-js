// @flow

import * as docs from '../../librarian/api/documents_pb';
import * as docslib from '../../librarian/api/documents';
import * as balancer from '../../librarian/client/balancer';
import * as keys from './keys';
import * as pack from './pack';
import * as publish from './publish';
import * as id from '../../common/id';
import * as keychain from '../keychain';

const errUnexpectedDocumentType = new Error('unexpected document type');
const errUnexpectedMissingKey = new Error('unexpected missing key');

/**
 * Publishes documents to libri.
 */
export class Shipper {
  librarians: balancer.UniformBalancer;
  publisher: publish.Publisher;

  /**
   * @param {balancer.UniformBalancer} librarians
   * @param {publish.Publisher} publisher
   */
  constructor(librarians: balancer.UniformBalancer,
      publisher: publish.Publisher) {
    this.librarians = librarians;
    this.publisher = publisher;
  }

  /**
   * Publish entry and pages (if more than one).
   *
   * @param {pack.PackedEntry} packedEntry - entry (and pages) to ship
   * @param {Uint8Array} authorPub - author public key bytes
   * @param {Uint8Array} readerPub - reader public key bytes
   * @param {keys.KEK} kek - KEK to use for encrypting EEK
   * @param {keys.EEK} eek - EEK to store in envelope
   * @return {Promise.<docslib.DocumentKey>}
   */
  shipEntry(packedEntry: pack.PackedEntry, authorPub: Uint8Array,
      readerPub: Uint8Array, kek: keys.KEK,
      eek: keys.EEK): Promise<docslib.DocumentKey> {
    // publish pages if more than one
    if (packedEntry.pageDocKeys.length > 1) {
      for (let i = 0; i < packedEntry.pageDocKeys.length; i++) {
        const lc = this.librarians.next(); // TODO (drausin) add retry logic
        const pageDoc = packedEntry.pageDocKeys[i].document;
        this.publisher.publish(pageDoc, authorPub, lc);
      }
    }

    // publish entry
    const lc = this.librarians.next(); // TODO (drausin) add retry logic
    this.publisher.publish(packedEntry.entryDocKey.document, authorPub, lc);

    // publish envelope
    return this.shipEnvelope(packedEntry.entryDocKey.key, authorPub, readerPub,
        kek, eek);
  }

  /**
   * Create an publish and envelope with the given fields.
   *
   * @param {id.ID} entryKey - ID of entry for envelope
   * @param {Uint8Array} authorPub - author public key bytes
   * @param {Uint8Array} readerPub - reader public key bytes
   * @param {keys.KEK} kek - KEK to use for encrypting EEK
   * @param {keys.EEK} eek - EEK to store in envelope
   * @return {Promise.<docslib.DocumentKey>}
   */
  shipEnvelope(entryKey: id.ID, authorPub: Uint8Array, readerPub: Uint8Array,
      kek: keys.KEK, eek: keys.EEK): Promise<docslib.DocumentKey> {
    return kek.encrypt(eek).then((encEEK) => {
      return pack.newEnvelopeDoc(entryKey, authorPub, readerPub,
          new Uint8Array(encEEK.ciphertext),
          new Uint8Array(encEEK.ciphertextMAC));
    }).then((envelope) => {
      const lc = this.librarians.next(); // TODO (drausin) add retry logic
      return this.publisher.publish(envelope, authorPub, lc).then((docKey) => {
        return new docslib.DocumentKey(envelope, docKey);
      });
    });
  }
}

/**
 * Container for an entry, its pages, and its EEK.
 */
export class EntryDocumentEEK {
  entryDoc: docs.Document;
  pageDocKeys: docs.DocumentKey[];
  eek: keys.EEK;

  /**
   * @param {docs.Document} entryDoc
   * @param {docslib.DocumentKey[]} pageDocKeys
   * @param {keys.EEK} eek
   */
  constructor(entryDoc: docs.Document, pageDocKeys: docslib.DocumentKey[],
      eek: keys.EEK) {
    this.entryDoc = entryDoc;
    this.pageDocKeys = pageDocKeys;
    this.eek = eek;
  }
}

/**
 * Acquires documents from libri.
 */
export class Receiver {
  librarians: balancer.UniformBalancer;
  acquirer: publish.Acquirer;
  readerKeys: keychain.Keychain;

  /**
   * @param {balancer.UniformBalancer} librarians
   * @param {publish.Acquirer} acquirer
   * @param {keychain.Keychain} readerKeys
   */
  constructor(librarians: balancer.UniformBalancer,
      acquirer: publish.Acquirer, readerKeys: keychain.Keychain) {
    this.librarians = librarians;
    this.acquirer = acquirer;
    this.readerKeys = readerKeys;
  }

  /**
   * Receive the envelope, entry, and pages (if necessary) relevant to a
   * particular envelope key from libri.
   *
   * @param {id.ID} envelopeKey - key of envelope to acquire
   * @return {Promise.<EntryDocumentEEK>}
   */
  receiveEntry(envelopeKey: id.ID): Promise<EntryDocumentEEK> {
    const envP = this.receiveEnvelope(envelopeKey);
    const eekP = envP.then((env) => {
      return this.getEEK(env);
    });
    const entryKeyP = envP.then((env) => {
      return new id.ID(env.getEntryKey());
    });
    const entryDocP = Promise.all([entryKeyP, envP]).then((args) => {
      const lc = this.librarians.next(); // TODO (drausin) add retry logic
      return this.acquirer.acquire(args[0], args[1].getAuthorPublicKey(), lc);
    });
    const pageDocKeysP = entryDocP.then((entryDoc) => {
      return this._getPages(entryDoc.getEntry());
    });
    return Promise.all(
        [entryDocP, entryKeyP, pageDocKeysP, eekP]
    ).then((args) => {
      return new EntryDocumentEEK(new docslib.DocumentKey(args[0], args[1]),
          args[2], args[3]);
    });
  }

  /**
   * Receive an envelope from libri.
   *
   * @param {id.ID} envelopeKey - key of envelope to acquire
   * @return {Promise.<docs.Envelope>}
   */
  receiveEnvelope(envelopeKey: id.ID): Promise<docs.Envelope> {
    const lc = this.librarians.next(); // TODO (drausin) add retry logic
    return this.acquirer.acquire(envelopeKey, null, lc).then((doc) => {
      const env = doc.getEnvelope();
      if (env === null) {
        throw errUnexpectedDocumentType;
      }
      return env;
    });
  }

  /**
   * Get EEK from an envelope (assuming the shipper has the reader private key).
   *
   * @param {docs.Envelope} env - envelope to get author and reader keys from
   * @return {Promise.<keys.EEK>}
   */
  getEEK(env: docs.Envelope): Promise<keys.EEK> {
    const readerPriv = this.readerKeys.get(env.getReaderPublicKey());
    if (readerPriv === null) {
      throw errUnexpectedMissingKey;
    }
    return keys.newKEK(readerPriv.key, env.getAuthorPublicKey()).then((kek) => {
      return kek.decrypt(env.getEekCiphertext(), env.getEekCiphertextMac());
    });
  }

  /**
   * Get (and possibly acquire) the page(s) in an entry.
   *
   * @param {docs.Entry} entry - entry to extract pages from
   * @return {Promise.<docslib.DocumentKey[]>}
   * @private
   */
  _getPages(entry: docs.Entry): Promise<docslib.DocumentKey[]> {
    // multi-page entry
    if (entry.getPageKeys() !== undefined) {
      const authorPub = entry.getAuthorPublicKey();
      let pageDocPs = [];
      let pageKeys = [];
      const pageKeyBytes = entry.getPageKeys().getKeysList();
      for (let i = 0; i < pageKeyBytes.length; i++) {
        pageKeys[i] = new id.ID(pageKeyBytes[i]);
        const lc = this.librarians.next(); // TODO (drausin) add retry logic
        pageDocPs[i] = this.acquirer.acquire(pageKeys[i], authorPub, lc);
      }
      return Promise.all(pageDocPs).then((pageDocs) => {
        let pageDocKeys = [];
        for (let i = 0; i < pageDocs.length; i++) {
          pageDocKeys[i] = new docslib.DocumentKey(pageDocs[i], pageKeys[i]);
        }
        return pageDocKeys;
      });
    }

    // single-page entry
    return docslib.getPageDocumentKey(entry.getPage()).then((pageDocKey) => {
      return [pageDocKey];
    });
  }
}

