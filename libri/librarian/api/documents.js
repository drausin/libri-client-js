import * as jspb from 'google-protobuf';
import * as id from '../../common/id.js';

const webcrypto = window.crypto.subtle;

/**
 * Get the key for a protobuf message.
 *
 * @param {jspb.Message} value - protobuf message to hash for key
 * @return {id.ID} - key
 * @public
 */
export function getKey(value: jspb.Message): id.ID {
  const bytes = value.serializeBinary();
  return webcrypto.digest({name: 'SHA-256'}, bytes).then((hash) => {
    return new id.ID(new Uint8Array(hash));
  });
}
