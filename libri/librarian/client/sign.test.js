
// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

import * as ecid from '../../common/ecid';
import * as sign from './sign';
import * as id from '../../common/id';
import * as requests from './requests';

test('Signer.sign returns a valid JWT', () => {
  const clientID = ecid.newRandom();
  const signer = new sign.Signer(clientID.key);
  const key = id.newRandom();
  const rq = requests.newGetRequest(clientID, key);
  const jwtP = signer.sign(rq);
  expect.assertions(3);
  return jwtP.then((jwt) => {
    const segments = jwt.split('.'); // header.claims.signature
    // expected output from client.Signer in https://github.com/drausin/libri
    expect(segments[0]).toEqual('eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(segments[1].length).toEqual(74);
    expect(segments[2].length).toEqual(86);
  });
});
