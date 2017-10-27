import * as jspb from 'google-protobuf';
import * as grpc from 'grpc';
import * as sign from '../../librarian/client/sign';

const signatureKey = 'signature';

/**
 * Sign request and return signed JWT in metadata instance.
 *
 * @param {sign.Signer} signer - used to sign requests
 * @param {jspb.Message} request - request to sign
 * @return {grpc.Metadata} - signed metadata
 */
export function newSignedMetadata(signer: sign.Signer,
    request: jspb.Message): grpc.Metadata {
  const jwtP = signer.sign(request);
  return jwtP.then((jwt) => {
    const md = new grpc.Metadata();
    md.set(signatureKey, jwt);
    return md;
  });
}
