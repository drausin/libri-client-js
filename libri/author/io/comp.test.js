const comp = require('./comp');

test('getCompressionCodec parses ok media types correctly', () => {
  expect(comp.getCompressionCodec('')).toBe(comp.defaultCodec);
  expect(comp.getCompressionCodec('application/x-gzip')).toBe(comp.noneCodec);
  expect(comp.getCompressionCodec('application/pdf')).toBe(comp.defaultCodec);
});

test('compress -> decompress = original with ok codec', () => {
  const original = new Uint8Array([0, 1, 2, 3, 4, 5]);
  const codecs = [comp.noneCodec, comp.gzipCodec];
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
 comp.compress(original, 'bad codec');
}
  ).toThrowError(
      'unknown compression codec',
  );
});

test('decompress throws error with bad codec', () => {
  const original = new Uint8Array([0, 1, 2, 3, 4, 5]);
  expect(
      () => {
 comp.decompress(original, 'bad codec');
}
  ).toThrowError(
      'unknown compression codec',
  );
});
