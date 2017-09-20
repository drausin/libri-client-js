// @flow

import * as id from '../../common/id';
import * as ecid from '../../common/ecid';
import * as sign from '../../librarian/client/sign';
import * as requests from '../../librarian/client/requests';
import * as context from '../../librarian/client/context';
import * as docs from '../../librarian/api/documents_pb';
import * as docslib from '../../librarian/api/documents';
import * as libgrpc from '../../librarian/api/librarian_grpc_pb';

export const defaultPutTimeoutSecs = 5;
export const defaultGetTimeoutSecs = 5;

/**
 * Parameters define the configuration of publishers & acquirers.
 */
export class Parameters {
  putTimeout: number;
  getTimeout: number;

  /**
   * @param {number} putTimeoutSecs - put call timeout seconds
   * @param {number} getTimeoutSecs - get call timeout seconds
   */
  constructor(putTimeoutSecs: number, getTimeoutSecs: number) {
    this.putTimeout = putTimeoutSecs;
    this.getTimeout = getTimeoutSecs;
  }
}

/**
 * Creates default publish parameters.
 *
 * @return {Parameters}
 */
export function newDefaultParameters(): Parameters {
  return new Parameters(defaultPutTimeoutSecs, defaultGetTimeoutSecs);
}

/**
 * Puts a document into the libri network.
 */
export class Publisher {
  clientID: ecid.ID;
  signer: sign.Signer;
  params: Parameters;

  /**
   * @param {ecid.ID} clientID - client ID to use for generating requests
   * @param {sign.Signer} signer - signer to use to sign requests
   * @param {Parameters} params - publish parameters
   */
  constructor(clientID: ecid.ID, signer: sign.Signer, params: Parameters) {
    this.clientID = clientID;
    this.signer = signer;
    this.params = params;
  }

  /**
   * Puts a document using a librarian client and returns the ID of the
   * document.
   *
   * @param {docs.Document} doc - document to put
   * @param {Uint8Array} authorPub - author public key
   * @param {libgrpc.LibrarianClient} lc - librarian client to use for put
   * @return {Promise.<id.ID>} - ID of the document put
   */
  publish(doc: docs.Document, authorPub: Uint8Array,
      lc: libgrpc.LibrarianClient): Promise<id.ID> {
    // TODO (drausin) check author pub consistent
    const keyP = docslib.getKey(doc);
    const rqP = keyP.then((key) => {
      return requests.newPutRequest(this.clientID, key, doc);
    });
    const metadataP = rqP.then((rq) => {
      return context.newSignedMetadata(this.signer, rq);
    });
    const rpP = Promise.all([rqP, metadataP]).then((args) => {
      return new Promise((resolve, reject) => {
        // TODO (drausin) add CallOptions w/ deadline after metadata
        lc.put(args[0], args[1], (err, rp) => {
          if (err !== null) {
            return reject(err);
          }
          resolve(rp);
        });
      });
    });
    return Promise.all([rqP, rpP, keyP]).then((args) => {
      if (args[0].getMetadata().getRequestId()
          !== args[1].getMetadata().getRequestId()) {
        throw new Error('unexpected requestID');
      }
      return args[2];
    });
  }
}
