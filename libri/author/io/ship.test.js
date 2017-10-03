// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

const id = require('../../common/id');
const ecid = require('../../common/ecid');
const doctest = require('../../librarian/api/testing');
const docslib = require('../../librarian/api/documents');
const docs = require('../../librarian/api/documents_pb');
const keys = require('./keys');
const pack = require('./pack');
const ship = require('./ship');

test('shipEntry publishes single-page entry as expected', () => {
  const rng = new Math.seedrandom(0); // eslint-disable-line new-cap

  // mock publisher to store the published doc
  let publisher = new function() {};
  let publishedDocs = [];
  publisher.publish = jest.fn((doc, _1, _2) => {
    publishedDocs.push(doc);
    return docslib.getKey(doc);
  });

  // mock librarian balancer to return null librarian client, since it won't
  // actually be used
  let librarians = new function() {};
  librarians.next = jest.fn(() => {
    return null;
  });

  // set up more stuff for test
  const shipper = new ship.Shipper(librarians, publisher);
  let entryDoc = new docs.Document();
  const entry = doctest.newSinglePageEntry(rng);
  entryDoc.setEntry(entry);
  const entryKeyP = docslib.getKey(entryDoc);
  let pageDoc = new docs.Document();
  pageDoc.setPage(entry.getPage());
  const pageKeyP = docslib.getKey(pageDoc);
  const packedEntryP = Promise.all([entryKeyP, pageKeyP]).then((args) => {
    return new pack.PackedEntry(
      new docslib.DocumentKey(entryDoc, args[0]),
      [new docslib.DocumentKey(pageDoc, args[1])],
    );
  });
  const authorKey = ecid.newRandom();
  const readerKey = ecid.newRandom();
  const kekP = keys.newKEK(authorKey.key, readerKey.pubKeyBytes);
  const eekP = keys.newEEK();

  // assert
  expect.assertions(5);
  return Promise.all([packedEntryP, kekP, eekP]).then((args) => {
    return shipper.shipEntry(args[0], authorKey.pubKeyBytes,
        readerKey.pubKeyBytes, args[1], args[2]);
  }).then((envDocKey) => {
    expect(envDocKey.document).toBeDefined();
    expect(envDocKey.key).toBeDefined();
    expect(publishedDocs.length).toEqual(2);
    expect(publishedDocs[0]).toEqual(entryDoc);
    expect(publishedDocs[1]).toEqual(envDocKey.document);
    return true;
  });
});

test('shipEntry publishes multi-page entry as expected', () => {
  const rng = new Math.seedrandom(0); // eslint-disable-line new-cap

  // mock publisher to store the published doc
  let publisher = new function() {};
  let publishedDocs = [];
  publisher.publish = jest.fn((doc, _1, _2) => {
    publishedDocs.push(doc);
    if (doc !== null) {
      return docslib.getKey(doc);
    }
    return null;
  });

  // mock librarian balancer to return null librarian client, since it won't
  // actually be used
  let librarians = new function() {};
  librarians.next = jest.fn(() => {
    return null;
  });

  // set up more stuff for test
  const shipper = new ship.Shipper(librarians, publisher);
  let entryDoc = new docs.Document();
  const entry = doctest.newMultiPageEntry(rng);
  entryDoc.setEntry(entry);
  const entryKeyP = docslib.getKey(entryDoc);
  const pageKeys = entry.getPageKeys();
  const packedEntryP = entryKeyP.then((entryKey) => {
    return new pack.PackedEntry(
      new docslib.DocumentKey(entryDoc, entryKey),
      [
        new docslib.DocumentKey(null, pageKeys.getKeysList_asU8()[0]),
        new docslib.DocumentKey(null, pageKeys.getKeysList_asU8()[1]),
      ],
    );
  });
  const authorKey = ecid.newRandom();
  const readerKey = ecid.newRandom();
  const kekP = keys.newKEK(authorKey.key, readerKey.pubKeyBytes);
  const eekP = keys.newEEK();

  // assert
  expect.assertions(5);
  return Promise.all([packedEntryP, kekP, eekP]).then((args) => {
    return shipper.shipEntry(args[0], authorKey.pubKeyBytes,
        readerKey.pubKeyBytes, args[1], args[2]);
  }).then((envDocKey) => {
    expect(envDocKey.document).toBeDefined();
    expect(envDocKey.key).toBeDefined();
    expect(publishedDocs.length).toEqual(4);
    expect(publishedDocs[2]).toEqual(entryDoc);
    expect(publishedDocs[3]).toEqual(envDocKey.document);
    return true;
  });
});

test('shipEnvelope publishes envelope as expected', () => {
  // mock publisher to store the published doc
  let publisher = new function() {};
  let publishedDoc = null;
  publisher.publish = jest.fn((doc, _1, _2) => {
    publishedDoc = doc;
    return docslib.getKey(doc);
  });

  // mock librarian balancer to return null librarian client, since it won't
  // actually be used
  let librarians = new function() {};
  librarians.next = jest.fn(() => {
    return null;
  });

  // set up more stuff for test
  const shipper = new ship.Shipper(librarians, publisher);
  const entryKey = id.newRandom();
  const authorKey = ecid.newRandom();
  const readerKey = ecid.newRandom();
  const kekP = keys.newKEK(authorKey.key, readerKey.pubKeyBytes);
  const eekP = keys.newEEK();

  // assert
  expect.assertions(8);
  return Promise.all([kekP, eekP]).then((args) => {
    return shipper.shipEnvelope(entryKey, authorKey.pubKeyBytes,
        readerKey.pubKeyBytes, args[0], args[1]);
  }).then((envDocKey) => {
    expect(envDocKey.document).toBeDefined();
    expect(envDocKey.key).toBeDefined();
    expect(envDocKey.document).toEqual(publishedDoc);
    const pubEnv = publishedDoc.getEnvelope();
    expect(pubEnv.getEntryKey_asU8()).toEqual(entryKey.bytes);
    expect(pubEnv.getAuthorPublicKey_asU8()).toEqual(authorKey.pubKeyBytes);
    expect(pubEnv.getReaderPublicKey_asU8()).toEqual(readerKey.pubKeyBytes);
    expect(pubEnv.getEekCiphertext()).toBeDefined();
    expect(pubEnv.getEekCiphertextMac()).toBeDefined();
    return true;
  });
});
