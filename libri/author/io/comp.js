// @flow

import pako from 'pako';
import * as contentType from 'content-type';
import * as docs from '../../librarian/api/documents_pb';

const defaultCodec = docs.CompressionCodec.GZIP;

const mediaToCompressionCodec = {
  // don't compress again since it's already compressed
  'application/x-gzip': docs.CompressionCodec.NONE,
  'application/x-compressed': docs.CompressionCodec.NONE,
  'application/x-zip-compressed': docs.CompressionCodec.NONE,
  'application/zip': docs.CompressionCodec.NONE,
};

/**
 * Get the compression codec to use for a given media type.
 *
 * @param {string} mediaType
 * @return {docs.CompressionCodec}
 * @public
 */
function getCompressionCodec(mediaType: string): docs.CompressionCodec {
  if (mediaType === '') {
    return defaultCodec;
  }
  const parsedType = contentType.parse(mediaType).type;
  if (parsedType in mediaToCompressionCodec) {
    return mediaToCompressionCodec[parsedType];
  }
  return defaultCodec;
}

/**
 * Compress some data all at once (as opposed to streaming).
 *
 * @param {Uint8Array} uncompressed - data to be compressed
 * @param {string} codec - compression codec to use
 * @return {Uint8Array} compressed data
 * @public
 */
function compress(uncompressed: Uint8Array,
    codec: docs.CompressionCodec): Uint8Array {
  if (codec === docs.CompressionCodec.NONE) {
    return uncompressed;
  }
  if (codec === docs.CompressionCodec.GZIP) {
    return pako.gzip(uncompressed);
  }
  throw new TypeError('unknown compression codec');
}

/**
 * Decompress some compressed data all at once (as opposed to streaming).
 *
 * @param {Uint8Array} compressed - data to be decompressed
 * @param {string} codec - (de)compression codec to use
 * @return {Uint8Array} decompressed data
 * @public
 */
function decompress(compressed: Uint8Array,
    codec: docs.CompressionCodec): Uint8Array {
  if (codec === docs.CompressionCodec.NONE) {
    return compressed;
  }
  if (codec === docs.CompressionCodec.GZIP) {
    return pako.inflate(compressed);
  }
  throw new TypeError('unknown compression codec');
}

export {
  defaultCodec,
  getCompressionCodec,
  compress,
  decompress,
};
