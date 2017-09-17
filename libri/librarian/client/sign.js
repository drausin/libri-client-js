
// @flow

import * as elliptic from 'elliptic';
import * as jspb from 'google-protobuf';
import * as base64url from 'base64url';

class Signer {
  key: elliptic.ec.KeyPair;

  constructor(key: elliptic.ec.KeyPair) {
    this.key = key;
  }

  sign(msg: jspb.Message) {
    const bytes = msg.serializeBinary();
    const hashP = window.crypto.subtle.digest({name: 'SHA-256'}, bytes);
    const header = JSON.stringify({'typ': 'JWT', 'alg': 'ES256'});
    const claimsP = hashP.then((hash) => {
      return JSON.stringify({'hash': base64url.base64url.encode(hash)});
    });
    return claimsP.then((claims) => {
      const signedString = header + '.' + claims;
      const sig = base64url.base64url.encode(this.key.sign(signedString));
      return signedString + '.' + sig;
    });
  }
}
