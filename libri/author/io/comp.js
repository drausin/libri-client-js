'use strict';

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
 * @param {String} mediaType
 * @returns {String}
 * @public
 */
function getCompressionCodec(mediaType) {
  if (mediaType === '') {
    return defaultCodec
  }
  const parsedType = contentType.parse(mediaType).type;
  if (parsedType in mediaToCompressionCodec) {
    return mediaToCompressionCodec[parsedType]
  }
  return defaultCodec
}

/**
 * Compress some data all at once (as opposed to streaming).
 *
 * @param {Uint8Array} uncompressed - data to be compressed
 * @param {String} codec - compression codec to use
 * @returns {Uint8Array} compressed data
 * @public
 */
function compress(uncompressed, codec) {
  if (codec === noneCodec) {
    return uncompressed
  }
  if (codec === gzipCodec) {
    return pako.gzip(uncompressed)
  }
  throw new TypeError('unknown compression codec')
}

/**
 * Decompress some compressed data all at once (as opposed to streaming).
 *
 * @param {Uint8Array} compressed - data to be decompressed
 * @param {String} codec - (de)compression codec to use
 * @returns {Uint8Array} decompressed data
 * @public
 */
function decompress(compressed, codec) {
  if (codec === noneCodec) {
    return compressed
  }
  if (codec === gzipCodec) {
    return pako.inflate(compressed)
  }
  throw new TypeError('unknown compression codec')
}

export {
  defaultCodec,
  noneCodec,
  gzipCodec,
  getCompressionCodec,
  compress,
  decompress,
};
