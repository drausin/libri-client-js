
// polyfill webcrypto for tests
const WebCrypto = require('node-webcrypto-ossl');
window.crypto = new WebCrypto();

import {newRandom as newRandomECID} from '../../common/ecid';
import {newRandom as newRandomID} from '../../common/id';
import {newGetRequest, newPutRequest} from './requests';
import * as doctest from '../api/testing';

test('newGetRequest returns request with populated fields', () => {
  const ecid = newRandomECID();
  const key = newRandomID();
  const r = newGetRequest(ecid, key);
  expect(r.getMetadata()).toBeTruthy();
  expect(r.getKey()).toEqual(key.bytes);
});


test('newPutRequest returns request with populated fields', () => {
  const rng = new Math.seedrandom(0);  // eslint-disable-line new-cap
  const ecid = newRandomECID();
  const key = newRandomID();
  const value = doctest.newDocument(rng);
  const r = newPutRequest(ecid, key, value);
  expect(r.getMetadata()).toBeTruthy();
  expect(r.getKey()).toEqual(key.bytes);
  expect(r.getValue()).toEqual(value);
});
