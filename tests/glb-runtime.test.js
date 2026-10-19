import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { parseGlb, repackImages } from '../scripts/glb-runtime.mjs';

const align4 = n => Math.ceil(n / 4) * 4;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7D8AAAAASUVORK5CYII=', 'base64');
function makeGlb(json, bin) {
  const bytes = Buffer.from(JSON.stringify(json)), jsonLength = align4(bytes.length), binLength = align4(bin.length);
  const out = Buffer.alloc(28 + jsonLength + binLength);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(jsonLength, 12); out.writeUInt32LE(0x4e4f534a, 16);
  out.fill(0x20, 20, 20 + jsonLength); bytes.copy(out, 20);
  const offset = 20 + jsonLength;
  out.writeUInt32LE(binLength, offset); out.writeUInt32LE(0x004e4942, offset + 4); bin.copy(out, offset + 8);
  return out;
}
function fixture() {
  const bin = Buffer.alloc(72 + PNG.length, 0);
  // Real component-aligned POSITION/NORMAL/UV/index data, with an image after two padding bytes.
  for (let i = 0; i < 16; i++) bin.writeFloatLE(i * .125, i * 4);
  bin.writeUInt16LE(0, 64); bin.writeUInt16LE(1, 66); bin.writeUInt16LE(0, 68); PNG.copy(bin, 72);
  const json = {
    asset: { version: '2.0', generator: 'fixture', copyright: 'Fixture owner', extras: { source: 'keep me' } },
    buffers: [{ byteLength: bin.length, name: 'embedded', extras: { provenance: 17 } }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 24, target: 34962, name: 'position' },
      { buffer: 0, byteOffset: 24, byteLength: 24, target: 34962, name: 'normal' },
      { buffer: 0, byteOffset: 48, byteLength: 16, target: 34962, name: 'uv' },
      { buffer: 0, byteOffset: 64, byteLength: 6, target: 34963, name: 'indices', extras: { keep: true } },
      { buffer: 0, byteOffset: 72, byteLength: PNG.length, name: 'image' }
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 2, type: 'VEC3', min: [0, .125, .25], max: [.375, .5, .625] },
      { bufferView: 1, componentType: 5126, count: 2, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count: 2, type: 'VEC2' },
      { bufferView: 3, componentType: 5123, count: 3, type: 'SCALAR' }
    ],
    images: [{ bufferView: 4, mimeType: 'image/png', name: 'albedo', extras: { license: 'unchanged' } }],
    textures: [{ source: 0, sampler: 0 }], samplers: [{ magFilter: 9729, wrapS: 10497 }],
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: .2 }, doubleSided: true }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
    nodes: [{ mesh: 0, translation: [1, 2, 3], rotation: [0, 0, 0, 1], name: 'Original model' }],
    scenes: [{ nodes: [0] }], scene: 0, extras: { nested: { extensions: { customReceipt: { original: true } } } }
  };
  return { json, bin, source: makeGlb(json, bin) };
}
function sliceView(parsed, index) {
  const view = parsed.json.bufferViews[index];
  return parsed.bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
}

test('image-only repacking preserves geometry SHA, accessor data and scene/material/provenance metadata', () => {
  const { source } = fixture(), before = parseGlb(source), originalSHA = digest(source);
  // A longer encoded payload checks image range changes without requiring an image codec in Node.
  const replacement = Buffer.concat([PNG, Buffer.alloc(13, 7)]);
  const output = repackImages(source, new Map([[0, { bytes: replacement, mimeType: 'image/png' }]]));
  const after = parseGlb(output);
  assert.equal(digest(source), originalSHA, 'input Buffer is never changed');
  for (let i = 0; i < 4; i++) assert.equal(digest(sliceView(after, i)), digest(sliceView(before, i)));
  for (const key of ['asset', 'accessors', 'textures', 'samplers', 'materials', 'meshes', 'nodes', 'scenes', 'scene', 'extras']) assert.deepEqual(after.json[key], before.json[key]);
  assert.deepEqual(sliceView(after, 4), replacement);
  assert.equal(after.json.images[0].mimeType, 'image/png');
  assert.deepEqual(after.json.images[0].extras, before.json.images[0].extras);
  assert.equal(after.json.buffers[0].name, before.json.buffers[0].name);
  assert.deepEqual(after.json.buffers[0].extras, before.json.buffers[0].extras);
  for (const view of after.json.bufferViews) assert.equal(view.byteOffset % 4, 0);
  assert.equal(after.json.buffers[0].byteLength, after.bin.length);
  assert.equal(output.length % 4, 0);
  const jsonLength = output.readUInt32LE(12), jsonText = Buffer.from(JSON.stringify(after.json));
  assert.ok(output.subarray(20 + jsonText.length, 20 + jsonLength).every(byte => byte === 0x20));
  assert.ok(output.subarray(28 + jsonLength + after.bin.length).every(byte => byte === 0));
});

test('identity repacking copies every referenced byte and JPEG replacement switches only image mimeType', () => {
  const { source } = fixture(), before = parseGlb(source), same = parseGlb(repackImages(source, new Map()));
  for (let i = 0; i < before.json.bufferViews.length; i++) assert.equal(digest(sliceView(before, i)), digest(sliceView(same, i)));
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x42, 0xff, 0xd9]);
  const after = parseGlb(repackImages(source, new Map([[0, { bytes: jpeg, mimeType: 'image/jpeg' }]])));
  assert.deepEqual(after.json.images[0], { ...before.json.images[0], mimeType: 'image/jpeg' });
  assert.deepEqual(sliceView(after, 4), jpeg);
  assert.deepEqual(after.json.accessors, before.json.accessors);
});

test('same image view aliases require matching complete replacements', () => {
  const { json, bin } = fixture(); json.images.push({ ...json.images[0], name: 'alias' });
  const source = makeGlb(json, bin), item = { bytes: PNG, mimeType: 'image/png' };
  assert.throws(() => repackImages(source, new Map([[0, item]])), /every image alias/);
  assert.throws(() => repackImages(source, new Map([[0, item], [1, { ...item, bytes: Buffer.from('conflict') }]])), /conflicting replacements/);
  assert.throws(() => repackImages(source, new Map([[0, item], [1, { ...item, mimeType: 'image/jpeg' }]])), /conflicting replacements/);
  const after = parseGlb(repackImages(source, new Map([[0, item], [1, { ...item, bytes: Buffer.from(PNG) }]])));
  assert.equal(after.json.images[0].bufferView, after.json.images[1].bufferView);
  assert.deepEqual(sliceView(after, 4), PNG);
});

test('repacking rejects image views used by accessors, sparse data or overlapping geometry bytes', () => {
  const replacement = new Map([[0, { bytes: PNG, mimeType: 'image/png' }]]);
  {
    const { json, bin } = fixture(); json.accessors.push({ bufferView: 4, componentType: 5121, count: 1, type: 'SCALAR' });
    assert.throws(() => repackImages(makeGlb(json, bin), replacement), /also used by an accessor/);
  }
  for (const key of ['indices', 'values']) {
    const { json, bin } = fixture();
    json.accessors.push({ componentType: 5121, count: 1, type: 'SCALAR', sparse: { count: 1, indices: { bufferView: key === 'indices' ? 4 : 3, componentType: 5121 }, values: { bufferView: key === 'values' ? 4 : 3 } } });
    assert.throws(() => repackImages(makeGlb(json, bin), replacement), /also used by an accessor/);
  }
  {
    const { json, bin } = fixture(); json.bufferViews.push({ buffer: 0, byteOffset: 76, byteLength: 4 });
    json.accessors.push({ bufferView: 5, componentType: 5121, count: 4, type: 'SCALAR' });
    assert.throws(() => repackImages(makeGlb(json, bin), replacement), /overlaps non-image/);
    // Adding a second image alias must not disguise that this overlapping view is also geometry.
    json.images.push({ bufferView: 5, mimeType: 'image/png' });
    assert.throws(() => repackImages(makeGlb(json, bin), replacement), /overlaps non-image/);
  }
});

test('parser rejects malformed container headers, unknown chunks, UTF-8 and padding', () => {
  for (const [offset, value, pattern] of [[0, 0, /magic/], [4, 1, /version/], [8, 12, /length/], [12, 3, /alignment/], [16, 0x12345678, /JSON and BIN/]]) {
    const bytes = Buffer.from(fixture().source); bytes.writeUInt32LE(value, offset);
    assert.throws(() => parseGlb(bytes), pattern);
  }
  const truncated = fixture().source.subarray(0, 23); assert.throws(() => parseGlb(truncated), /truncated/);
  {
    const source = fixture().source, extra = Buffer.alloc(source.length + 8); source.copy(extra);
    extra.writeUInt32LE(extra.length, 8); extra.writeUInt32LE(0x12345678, source.length + 4);
    assert.throws(() => parseGlb(extra), /JSON and BIN/);
  }
  {
    const bytes = Buffer.from(fixture().source); bytes[20] = 0xff;
    assert.throws(() => parseGlb(bytes), /UTF-8 JSON/);
  }
  {
    const { json, bin } = fixture(); json.buffers[0].byteLength = bin.length - 1;
    const bytes = makeGlb(json, bin); bytes[bytes.length - 1] = 9;
    assert.throws(() => parseGlb(bytes), /padding/);
  }
});

test('parser rejects out-of-bounds and external data, unsafe formats and extensions', () => {
  const changes = [
    [json => { json.buffers[0].uri = 'external.bin'; }, /embedded buffer/],
    [json => { json.buffers.push({ byteLength: 4 }); }, /one embedded buffer/],
    [json => { json.buffers[0].byteLength += 4; }, /BIN range/],
    [json => { json.bufferViews[0].byteOffset = -1; }, /invalid range/],
    [json => { json.bufferViews[0].byteLength = 9999; }, /exceeds.*range/],
    [json => { json.bufferViews[0].buffer = 1; }, /invalid range or buffer/],
    [json => { json.accessors[0].count = 3; }, /exceeds.*range/],
    [json => { json.accessors[0].bufferView = 20; }, /invalid bufferView/],
    [json => { json.accessors[0].byteOffset = 1; }, /range|unaligned/],
    [json => { json.images[0].bufferView = 20; }, /invalid bufferView/],
    [json => { json.images[0].uri = 'texture.png'; }, /embedded PNG or JPEG/],
    [json => { json.images[0].mimeType = 'image/ktx2'; }, /embedded PNG or JPEG/],
    [json => { json.extensionsRequired = ['KHR_draco_mesh_compression']; }, /unsupported required/],
    [json => { json.extensionsUsed = ['EXT_meshopt_compression']; }, /optional extensions/],
    [json => { json.bufferViews[0].extensions = { EXT_meshopt_compression: { buffer: 0, byteOffset: 0 } }; }, /extension-bearing/],
    [json => { json.asset.minVersion = '2.1'; }, /version 2.0/]
  ];
  for (const [change, pattern] of changes) { const { json, bin } = fixture(); change(json); assert.throws(() => parseGlb(makeGlb(json, bin)), pattern); }
  const { source } = fixture();
  assert.throws(() => repackImages(source, {}), /must be a Map/);
  assert.throws(() => repackImages(source, new Map([[1, { bytes: PNG, mimeType: 'image/png' }]])), /invalid image index/);
  assert.throws(() => repackImages(source, new Map([[0, { bytes: Buffer.alloc(0), mimeType: 'image/png' }]])), /nonempty Buffer/);
  assert.throws(() => repackImages(source, new Map([[0, { bytes: PNG, mimeType: 'image/webp' }]])), /PNG\/JPEG/);
});

test('original twelve and added ironshot and shard Meshy assets parse safely without changing their bytes', () => {
  const root = new URL('../public/models/', import.meta.url), names = fs.readdirSync(root).filter(name => name.endsWith('.glb'));
  assert.equal(names.length, 14);
  assert.ok(names.includes('projectile-ironshot.glb'));assert.ok(names.includes('impact-shard.glb'));
  for (const name of names) {
    const source = fs.readFileSync(new URL(name, root)), hash = digest(source), parsed = parseGlb(source);
    assert.equal(parsed.json.buffers.length, 1, name);
    assert.equal(parsed.json.images.length, 3, name);
    assert.equal(parsed.json.bufferViews.length, 7, name);
    assert.equal(parsed.bin.length, parsed.json.buffers[0].byteLength, name);
    assert.equal(digest(source), hash, name);
  }
});
