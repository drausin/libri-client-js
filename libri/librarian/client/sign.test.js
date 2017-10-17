
// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

import * as ecid from '../../common/ecid';
const sign = require('./sign');
import * as id from '../../common/id';
import * as requests from './requests';
import * as docs from '../api/documents_pb';

test('sign returns a valid JWT', () => {
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

test('serializing entry to bytes has expected value', () => {
  const dummyBytes = new Uint8Array([0, 1, 2]);

  let page = new docs.Page();
  page.setAuthorPublicKey(dummyBytes);
  page.setIndex(0);
  page.setCiphertext(dummyBytes);
  page.setCiphertextMac(dummyBytes);

  const pageBytes = page.serializeBinary();
  expect(id.hex(pageBytes)).toEqual('0a030001021a030001022203000102');

  let entry1 = new docs.Entry();
  entry1.setAuthorPublicKey(dummyBytes);
  entry1.setCreatedTime(1);
  entry1.setMetadataCiphertext(dummyBytes);
  entry1.setMetadataCiphertextMac(dummyBytes);

  const entry1Bytes = entry1.serializeBinary();
  expect(id.hex(entry1Bytes)).toEqual('0a0300010220012a030001023203000102');

  let entry2 = new docs.Entry();
  entry2.setCreatedTime(1);
  entry2.setPage(page);

  const entry2Bytes = entry2.serializeBinary();
  expect(id.hex(entry2Bytes)).toEqual('120f0a030001021a0300010222030001022001');
});
