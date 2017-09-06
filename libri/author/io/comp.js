// @flow

import pako from 'pako';
import * as contentType from 'content-type';

const noneCodec = 'none';
const gzipCodec = 'gzip';
const defaultCodec = gzipCodec;

const mediaToCompressionCodec = {
  // don't compress again since it's already compressed
  'application/x-gzip': noneCodec,
  'application/x-compressed': noneCodec,
  'application/x-zip-compressed': noneCodec,
  'application/zip': noneCodec,
};

/**
 * Get the compression codec to use for a given media type.
 *
 * @param {string} mediaType
 * @return {string}
 * @public
 */
function getCompressionCodec(mediaType: string): string {
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
function compress(uncompressed: Uint8Array, codec: string): Uint8Array {
  if (codec === noneCodec) {
    return uncompressed;
  }
  if (codec === gzipCodec) {
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
function decompress(compressed: Uint8Array, codec: string): Uint8Array {
  if (codec === noneCodec) {
    return compressed;
  }
  if (codec === gzipCodec) {
    return pako.inflate(compressed);
  }
  throw new TypeError('unknown compression codec');
}

export {
  defaultCodec,
  noneCodec,
  gzipCodec,
  getCompressionCodec,
  compress,
  decompress,
};
