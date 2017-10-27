// @flow

import * as docslib from '../librarian/api/documents';
import * as id from '../common/id';
import * as ecid from '../common/ecid';
import * as keys from './io/keys';
import * as keychain from './keychain';
import * as pack from './io/pack';
import * as sign from '../librarian/client/sign';
import * as balancer from '../librarian/client/balancer';
import * as ship from './io/ship';
import * as publish from './io/publish';
import * as authorconfig from './config';

/**
 * Libri network client.
 */
export class Author {
  config: authorconfig.Config;
  authorKeys: keychain.Keychain;
  selfReaderKeys: keychain.Keychain;
  shipper: ship.Shipper;
  receiver: ship.Receiver;

  /**
   * @param {authorconfig.Config} config - config for author
   * @param {keychain.Keychain} authorKeys - author keychain
   * @param {keychain.Keychain} selfReaderKeys - self reader keychain
   * @param {ship.Shipper} shipper - publishes documents to libri
   * @param {ship.Receiver} receiver - acquires documents from libri
   */
  constructor(config: authorconfig.Config, authorKeys: keychain.Keychain,
      selfReaderKeys: keychain.Keychain, shipper: ship.Shipper,
      receiver: ship.Receiver) {
    this.config = config;
    this.authorKeys = authorKeys;
    this.selfReaderKeys = selfReaderKeys;
    this.shipper = shipper;
    this.receiver = receiver;
  }

  /**
   * Compress, encrypt, and split the content into pages and then store them in
   * the libri network.
   *
   * @param {Uint8Array} content - content to upload
   * @param {string} mediaType - media type of content
   * @return {Promise.<docslib.DocumentKey>} - uploaded envelope and key
   */
  upload(content: Uint8Array, mediaType: string): Promise<docslib.DocumentKey> {
    const envKeysP = this._sampleEnvKeys();
    const packedEntryP = envKeysP.then((envKeys) => {
      return pack.pack(content, mediaType, envKeys.eek, envKeys.authorPubKey,
        this.config.pageSize);
    }).then((packedEntry) => {
      return packedEntry;
    });
    return Promise.all([packedEntryP, envKeysP]).then((args) => {
      return this.shipper.shipEntry(args[0], args[1].authorPubKey,
          args[1].selfReaderPubKey, args[1].kek, args[1].eek);
    });
  }

  /**
   * Retrieve content from libri network, joining, decrypting, and
   * decompressing as necessary.
   *
   * @param {id.ID} envKey - key of content envelope
   * @return {Promise.<Uint8Array>} - content
   */
  download(envKey: id.ID): Promise<Uint8Array> {
    const entryDocEekP = this.receiver.receiveEntry(envKey);
    const unpackedContentP = entryDocEekP.then((entryDocEek) => {
      return pack.unpack(entryDocEek.entryDoc.document, entryDocEek.pageDocKeys,
          entryDocEek.eek);
    });
    return unpackedContentP.then((unpackedContent) => {
      return unpackedContent.content;
    });
  }

  /**
   * Sample envelope author and reader keys from keychains.
   *
   * @return {Promise.<EnvelopeKey>} - sampled keys
   * @private
   */
  _sampleEnvKeys(): Promise<EnvelopeKeys> {
    const authorKey = this.authorKeys.sample();
    const selfReaderKey = this.selfReaderKeys.sample();
    const kekP = keys.newKEK(authorKey.key, selfReaderKey.pubKeyBytes);
    const eekP = keys.newEEK();
    return Promise.all([kekP, eekP]).then((args) => {
      return new EnvelopeKeys(authorKey.pubKeyBytes, selfReaderKey.pubKeyBytes,
          args[0], args[1]);
    });
  }
}

/**
 * Create a new {Author} object.
 *
 * @param {authorconfig.Config} config - config for author
 * @param {ecid.ID} clientID - author client ID
 * @param {keychain.Keychain} authorKeys - author keychain
 * @param {keychain.Keychain} selfReaderKeys - self reader keychain
 * @return {Author}
 */
export function newAuthor(config: authorconfig.Config, clientID: ecid.ID,
    authorKeys: keychain.Keychain, selfReaderKeys: keychain.Keychain): Author {
  const allKeys = keychain.newUnion([authorKeys, selfReaderKeys]);
  const signer = new sign.Signer(clientID.key);
  const librarians = new balancer.UniformBalancer(config.librarianAddrs);
  const publisher = new publish.Publisher(clientID, signer, config.publish);
  const acquirer = new publish.Acquirer(clientID, signer, config.publish);
  const shipper = new ship.Shipper(librarians, publisher);
  const receiver = new ship.Receiver(librarians, acquirer, allKeys);
  return new Author(config, authorKeys, selfReaderKeys, shipper, receiver);
}

/**
 * Container of keys for envelope.
 */
class EnvelopeKeys {
  authorPubKey: Uint8Array;
  selfReaderPubKey: Uint8Array;
  kek: keys.KEK;
  eek: keys.EEK;

  /**
   * @param {Uint8Array} authorPubKey - author public key bytes
   * @param {Uint8Array} selfReaderPubKey - self reader public key bytes
   * @param {keys.KEK} kek - envelope KEK
   * @param {keys.EEK} eek - envelope EEK
   */
  constructor(authorPubKey: Uint8Array, selfReaderPubKey: Uint8Array,
      kek: keys.KEK, eek: keys.EEK) {
    this.authorPubKey = authorPubKey;
    this.selfReaderPubKey = selfReaderPubKey;
    this.kek = kek;
    this.eek = eek;
  }
}
