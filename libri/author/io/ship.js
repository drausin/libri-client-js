// @flow

import * as docslib from '../../librarian/api/documents';
import * as balancer from '../../librarian/client/balancer';
import * as keys from './keys';
import * as pack from './pack';
import * as publish from './publish';
import * as id from '../../common/id';

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
