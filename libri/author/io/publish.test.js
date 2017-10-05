// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

const seedrandom = require('seedrandom');
const ecid = require('../../common/ecid');
const sign = require('../../librarian/client/sign');
const doctest = require('../../librarian/api/testing');
const lib = require('../../librarian/api/librarian_pb');
const doclib = require('../../librarian/api/documents');
const publish = require('./publish');

test('publish calls lc.put() and returns doc key as expected', () => {
  const rng = seedrandom(0);
  const clientID = ecid.newRandom();
  const signer = new sign.Signer(clientID.key);
  const params = publish.newDefaultParameters();
  const publisher = new publish.Publisher(clientID, signer, params);
  const doc = doctest.newDocument(rng);
  const expectedKeyP = doclib.getKey(doc);
  const authorPub = doclib.getAuthorPub(doc);

  // mock the librarian client put() method
  let lc = new function() {};
  lc.put = jest.fn((rq, metadata, cb) => {
    const rp = new lib.PutResponse();
    const rpMetadata = new lib.ResponseMetadata();
    rpMetadata.setRequestId(rq.getMetadata().getRequestId());
    rp.setMetadata(rpMetadata);
    cb(null, rp);
  });

  // test publish
  const actualKeyP = publisher.publish(doc, authorPub, lc);
  expect.assertions(1);
  return Promise.all([expectedKeyP, actualKeyP]).then((args) => {
    return expect(args[1]).toEqual(args[0]);
  });
});

// TODO (drausin) test put error bubbles up

test('publish errors when author pubs differ', () => {
  const rng = new Math.seedrandom(0); // eslint-disable-line new-cap
  const doc = doctest.newDocument(rng);
  const publisher = new publish.Publisher(null, null, null);
  return expect(() => {
    publisher.publish(doc, doctest.randBytes(rng, 65), null);
  }).toThrowError('inconsistent author public key');
});

test('publish errors when request IDs differ', () => {
  const rng = new Math.seedrandom(0); // eslint-disable-line new-cap
  const clientID = ecid.newRandom();
  const signer = new sign.Signer(clientID.key);
  const params = publish.newDefaultParameters();
  const publisher = new publish.Publisher(clientID, signer, params);
  const doc = doctest.newDocument(rng);
  const authorPub = doclib.getAuthorPub(doc);

  // mock the librarian client put() method to return response w/ different
  // request ID
  let lc = new function() {};
  lc.put = jest.fn((rq, metadata, cb) => {
    const rp = new lib.PutResponse();
    const rpMetadata = new lib.ResponseMetadata();
    rpMetadata.setRequestId(doctest.randBytes(rng, 32));
    rp.setMetadata(rpMetadata);
    cb(null, rp);
  });

  // test publish errors
  expect.assertions(1);
  return publisher.publish(doc, authorPub, lc).catch((err) => {
    expect(err).toEqual(publish.errUnexpectedRequestID);
  });
});

test('acquire calls lc.get() and returns doc as expected', () => {
  const rng = new Math.seedrandom(0); // eslint-disable-line new-cap
  const clientID = ecid.newRandom();
  const signer = new sign.Signer(clientID.key);
  const params = publish.newDefaultParameters();
  const acquirer = new publish.Acquirer(clientID, signer, params);
  const expectedDoc = doctest.newDocument(rng);
  const docKeyP = doclib.getKey(expectedDoc);
  const authorPub = doclib.getAuthorPub(expectedDoc);

  // mock the librarian client get() method
  let lc = new function() {};
  lc.get = jest.fn((rq, metadata, cb) => {
    const rp = new lib.GetResponse();
    const rpMetadata = new lib.ResponseMetadata();
    rpMetadata.setRequestId(rq.getMetadata().getRequestId());
    rp.setMetadata(rpMetadata);
    rp.setValue(expectedDoc);
    cb(null, rp);
  });

  // test acquire
  const actualDocP = docKeyP.then((docKey) => {
    return acquirer.acquire(docKey, authorPub, lc);
  });
  expect.assertions(1);
  return expect(actualDocP).resolves.toEqual(expectedDoc);
});

test('acquire errors when author pubs differ', async () => {
  const rng = new Math.seedrandom(0); // eslint-disable-line new-cap
  const clientID = ecid.newRandom();
  const signer = new sign.Signer(clientID.key);
  const params = publish.newDefaultParameters();
  const acquirer = new publish.Acquirer(clientID, signer, params);
  const expectedDoc = doctest.newDocument(rng);
  const docKeyP = doclib.getKey(expectedDoc);

  // mock the librarian client get() method
  let lc = new function() {};
  lc.get = jest.fn((rq, metadata, cb) => {
    const rp = new lib.GetResponse();
    const rpMetadata = new lib.ResponseMetadata();
    rpMetadata.setRequestId(rq.getMetadata().getRequestId());
    rp.setMetadata(rpMetadata);
    rp.setValue(expectedDoc);
    cb(null, rp);
  });

  // test acquire
  const actualDocP = docKeyP.then((docKey) => {
    const diffAuthorPub = doctest.randBytes(rng, 65);
    return acquirer.acquire(docKey, diffAuthorPub, lc);
  });
  expect.assertions(1);
  return actualDocP.catch((err) => {
    expect(err).toEqual(publish.errInconsistentAuthorPub);
  });
});

test('acquire errors when request IDs differ', async () => {
  const rng = new Math.seedrandom(0); // eslint-disable-line new-cap
  const clientID = ecid.newRandom();
  const signer = new sign.Signer(clientID.key);
  const params = publish.newDefaultParameters();
  const acquirer = new publish.Acquirer(clientID, signer, params);
  const expectedDoc = doctest.newDocument(rng);
  const docKeyP = doclib.getKey(expectedDoc);
  const authorPub = doclib.getAuthorPub(expectedDoc);

  // mock the librarian client get() method to return a different request ID
  let lc = new function() {};
  lc.get = jest.fn((rq, metadata, cb) => {
    const rp = new lib.GetResponse();
    const rpMetadata = new lib.ResponseMetadata();
    rpMetadata.setRequestId(doctest.randBytes(rng, 32));
    rp.setMetadata(rpMetadata);
    rp.setValue(expectedDoc);
    cb(null, rp);
  });

  // test acquire error
  const actualDocP = docKeyP.then((docKey) => {
    return acquirer.acquire(docKey, authorPub, lc);
  });
  expect.assertions(1);
  return actualDocP.catch((err) => {
    expect(err).toEqual(publish.errUnexpectedRequestID);
  });
});
