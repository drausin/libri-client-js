
import 'seedrandom';
import * as docs from './documents_pb';

const seedrandom = Math.seedrandom;

/**
 * Generate a new docs.Documnet, suitable for testing.
 * @param {seedrandom} rng - random number generator
 * @return {docs.Document} - random docs.Document
 */
export function newDocument(rng: seedrandom): docs.Document {
  let doc = new docs.Document();
  doc.setEntry(newSinglePageEntry(rng));
  return doc;
}

/**
 * Generate a random docs.Entry of a single page, suitable for usage in testing.
 *
 * @param {seedrandom} rng - random number generator
 * @return {docs.Entry} - random docs.Entry
 */
export function newSinglePageEntry(rng: seedrandom): docs.Entry {
  const page = newPage(rng);
  let entry = new docs.Entry();
  entry.setAuthorPublicKey(page.getAuthorPublicKey());
  entry.setCreatedTime(1);
  entry.setMetadataCiphertext(randBytes(rng, 64));
  entry.setMetadataCiphertextMac(randBytes(rng, 32));
  entry.setPage(page);
  return entry;
}

/**
 * Generate a random docs.Entry of multiple pages, suitable for usage in
 * testing.
 *
 * @param {seedrandom} rng - random number generator
 * @return {docs.Entry} - random docs.Entry
 */
export function newMultiPageEntry(rng: seedrandom): docs.Entry {
  const pageKeys = new docs.PageKeys();
  pageKeys.setKeysList([
    randBytes(rng, 32),
    randBytes(rng, 32),
  ]);
  let entry = new docs.Entry();
  entry.setAuthorPublicKey(randBytes(rng, 65));
  entry.setCreatedTime(1);
  entry.setMetadataCiphertext(randBytes(rng, 64));
  entry.setMetadataCiphertextMac(randBytes(rng, 32));
  entry.setPageKeys(pageKeys);
  return entry;
}

/**
 * Generate a random docs.Page, suitable for usage in testing.
 *
 * @param {seedrandom} rng - random number generator
 * @return {docs.page} - random docs.Page
 */
export function newPage(rng: seedrandom): docs.Page {
  let page = new docs.Page();
  page.setAuthorPublicKey(randBytes(rng, 65));
  page.setCiphertext(randBytes(rng, 64));
  page.setCiphertextMac(randBytes(rng, 32));
  return page;
}

/**
 * Generate a pseudo-random byte sequence.
 *
 * @param {seedrandom} rng - random number generator
 * @param {integer} length - length of byte array
 * @return {Uint8Array} - pseudo-randomly generated byte array
 */
export function randBytes(rng: seedrandom, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = rng() * 256;
  }
  return bytes;
}
