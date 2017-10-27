// @flow

import {ID as ECID} from '../../common/ecid';
import {ID, newRandom as newRandomID} from '../../common/id';
import {RequestMetadata, GetRequest, PutRequest} from '../api/librarian_pb';
import {Document} from '../api/documents_pb';

/**
 * Generate a new GetRequest for the given document key.
 *
 * @param {ECID} clientId - ID of client generating the request
 * @param {ID} key - key of document to get
 * @return {GetRequest}
 */
export function newGetRequest(clientId: ECID, key: ID): GetRequest {
  let r = new GetRequest();
  r.setMetadata(newRequestMetadata(clientId));
  r.setKey(key.bytes);
  return r;
}

/**
 * Generate a new PutRequest for the given document key + value.
 *
 * @param {ECID} clientId - ID of client generating the request
 * @param {ID} key - document key to put
 * @param {Document} value - document value to put
 * @return {PutRequest}
 */
export function newPutRequest(clientId: ECID, key: ID,
    value: Document): PutRequest {
  let r = new PutRequest();
  r.setMetadata(newRequestMetadata(clientId));
  r.setKey(key.bytes);
  r.setValue(value);
  return r;
}

/**
 * Generate metadata for a request.
 *
 * @param {ECID} clientID - ID of client generating the request
 * @return {RequestMetadata}
 */
function newRequestMetadata(clientID: ECID): RequestMetadata {
  let m = new RequestMetadata();
  m.setRequestId(newRandomID().bytes);
  m.setPubKey(clientID.pubKeyBytes);
  return m;
}
