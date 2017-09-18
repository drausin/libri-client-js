
// @flow

import * as elliptic from 'elliptic';
import * as jspb from 'google-protobuf';
import * as base64url from 'base64url';

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
   * @param {jspb.Message} msg - message to sign
   * @return {Promise.<string>} - signed JWT
   */
  sign(msg: jspb.Message): Promise<string> {
    const bytes = msg.serializeBinary();
    const hashP = window.crypto.subtle.digest({name: 'SHA-256'}, bytes);
    const header = {'alg': 'ES256', 'typ': 'JWT'};
    const claimsP = hashP.then((hash) => {
      const encodedHash = base64url.toBase64(base64url.encode(hash));
      return {'hash': encodedHash};
    });
    return claimsP.then((claims) => {
      const signingString = base64url.encode(JSON.stringify(header)) + '.' +
              base64url.encode(JSON.stringify(claims));
      const sig = this.key.sign(signingString);
      // serialize outputs R & S to big-endian byte arrays and concatenate
      const sigBytes = new Uint8Array(64);
      sigBytes.set(sig.r.toArrayLike(Uint8Array, 'be'), 0);
      sigBytes.set(sig.s.toArrayLike(Uint8Array, 'be'), 32);
      const encodedSig = base64url.encode(sigBytes.buffer);
      return signingString + '.' + encodedSig;
    });
  }
}
