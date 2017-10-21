// @flow

import * as elliptic from 'elliptic';
import * as jspb from 'google-protobuf';
import * as base64url from 'base64url';
import * as UTF8 from 'utf-8';

const webcrypto = window.crypto.subtle;

/**
 * Signs Protobuf messages.
 */
export class Signer {
  key: elliptic.ec.KeyPair;

  /**
   * @param {elliptic.ec.keyPair} key - ECDSA key to use for signing
   */
  constructor(key: elliptic.ec.KeyPair) {
    this.key = key;
  }

  /**
   * Sign a Protobuf message, returning a JWT with a single claim giving the
   * SHA-256 hash of the binary-encoded message.
   *
   * @param {jspb.Message} rq - request message to sign
   * @return {Promise.<string>} - signed JWT
   */
  sign(rq: jspb.Message): Promise<string> {
    const bytes = rq.serializeBinary();
    const header = {'alg': 'ES256', 'typ': 'JWT'};
    const claimsP = hash(bytes).then((hash) => {
      // pad encoding with '=' since base64url strips pads (for some reason)
      const encodedHash = base64url.encode(hash) + '=';
      return {'hash': encodedHash};
    });
    return claimsP.then((claims) => {
      const encodedHeader = base64url.encode(JSON.stringify(header));
      const encodedClaims = base64url.encode(JSON.stringify(claims));
      const signingString = encodedHeader + '.' + encodedClaims;
      const signingBytes = new Uint8Array(
          UTF8.setBytesFromString(signingString));
      return hash(signingBytes).then((signingBytesHash) => {
        const sig = this.key.sign(new Uint8Array(signingBytesHash));
        // serialize outputs R & S to big-endian byte arrays and concatenate
        const sigBytes = new Uint8Array(64);
        sigBytes.set(sig.r.toArrayLike(Uint8Array, 'be'), 0);
        sigBytes.set(sig.s.toArrayLike(Uint8Array, 'be'), 32);
        const encodedSig = base64url.encode(sigBytes.buffer);
        return signingString + '.' + encodedSig;
      });
    });
  }
}

/**
 * SHA-256 hash a value (consistent with the ES256 signing algorithm).
 * @param {Uint8Array} value
 * @return {Promise<ArrayBuffer>}
 * @private
 */
function hash(value: Uint8Array): Promise<ArrayBuffer> {
  return webcrypto.digest({name: 'SHA-256'}, value.buffer);
}
