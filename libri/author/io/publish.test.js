
// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

const ecid = require('../../common/ecid');
const sign = require('../../librarian/client/sign');
const doctest = require('../../librarian/api/testing');
const lib = require('../../librarian/api/librarian_pb');
const doclib = require('../../librarian/api/documents');
const publish = require('./publish');

test('publish calls lc.put() and returns doc key as expected', () => {
  const rng = new Math.seedrandom(0); // eslint-disable-line new-cap
  const clientID = ecid.newRandom();
  const signer = new sign.Signer(clientID.key);
  const params = publish.newDefaultParameters();
  const publisher = new publish.Publisher(clientID, signer, params);
  const doc = doctest.newDocument(rng);
  const expectedKeyP = doclib.getKey(doc);
  const authorPub = doclib.getAuthorPub(doc);

  let lc = new function() {};
  lc.put = jest.fn((rq, metadata, cb) => {
    const rp = new lib.PutResponse();
    const rpMetadata = new lib.ResponseMetadata();
    rpMetadata.setRequestId(rq.getMetadata().getRequestId());
    rp.setMetadata(rpMetadata);
    cb(null, rp);
  });
  const actualKeyP = publisher.publish(doc, authorPub, lc);

  expect.assertions(1);
  return Promise.all([expectedKeyP, actualKeyP]).then((args) => {
    return expect(args[1]).toEqual(args[0]);
  });
});
