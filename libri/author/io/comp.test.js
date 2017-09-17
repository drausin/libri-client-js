const comp = require('./comp');
const docs = require('../../librarian/api/documents_pb');

test('getCompressionCodec parses ok media types correctly', () => {
  expect(comp.getCompressionCodec('')).toBe(docs.CompressionCodec.GZIP);
  expect(comp.getCompressionCodec('application/x-gzip')).toBe(
      docs.CompressionCodec.NONE);
  expect(comp.getCompressionCodec('application/pdf')).toBe(
      docs.CompressionCodec.GZIP);
});

test('compress -> decompress = original with ok codec', () => {
  const original = new Uint8Array([0, 1, 2, 3, 4, 5]);
  const codecs = [docs.CompressionCodec.NONE, docs.CompressionCodec.GZIP];
  codecs.forEach((codec) => {
    const compDecomp = comp.decompress(
        comp.compress(original, codec),
        codec,
    );
    expect(compDecomp).toEqual(original);
  });
});

test('compress throws error with bad codec', () => {
  const original = new Uint8Array([0, 1, 2, 3, 4, 5]);
  expect(
      () => {
        comp.compress(original, 3);
      }
  ).toThrowError(
      'unknown compression codec',
  );
});

test('decompress throws error with bad codec', () => {
  const original = new Uint8Array([0, 1, 2, 3, 4, 5]);
  expect(
      () => {
        comp.decompress(original, 3);
      }
  ).toThrowError(
      'unknown compression codec',
  );
});
