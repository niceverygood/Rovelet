// A deliberately narrow GLB 2 writer for our embedded Meshy assets. No source files are written.
// Format: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#glb-file-format-specification
const MAGIC = 0x46546c67, JSON_CHUNK = 0x4e4f534a, BIN_CHUNK = 0x004e4942;
const COMPONENT_BYTES = new Map([[5120, 1], [5121, 1], [5122, 2], [5123, 2], [5125, 4], [5126, 4]]);
const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const MIME_TYPES = new Set(['image/png', 'image/jpeg']);
const align4 = n => Math.ceil(n / 4) * 4;
const fail = message => { throw new Error(`Unsafe GLB: ${message}`); };
const integer = (n, min = 0) => Number.isSafeInteger(n) && n >= min;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function array(json, name) {
  const value = json[name] ?? [];
  if (!Array.isArray(value)) fail(`${name} must be an array`);
  return value;
}

function viewAt(views, index, label) {
  if (!integer(index) || index >= views.length) fail(`${label} references an invalid bufferView`);
  return views[index];
}

function checkRange(view, offset, count, elementBytes, stride, label) {
  if (!integer(offset) || !integer(count, 1) || !integer(stride, elementBytes)) fail(`${label} has an invalid byte range`);
  const end = offset + (count - 1) * stride + elementBytes;
  if (!integer(end) || end > view.byteLength) fail(`${label} exceeds its bufferView range`);
}

function validate(json, bin) {
  if (!object(json) || json.asset?.version !== '2.0' || (json.asset.minVersion !== undefined && json.asset.minVersion !== '2.0')) fail('only glTF asset version 2.0 is supported');
  const required = array(json, 'extensionsRequired');
  if (required.length) fail(`unsupported required extensions: ${required.join(', ')}`);
  // Unknown optional extensions may contain absolute byte offsets. This is a writer, not a loader:
  // rejecting them is safer than silently dropping or relocating extension-owned binary data.
  const checkExtensions = value => {
    if (!value || typeof value !== 'object') return;
    if (!Array.isArray(value) && value.extensions && Object.keys(value.extensions).length) fail('extension-bearing assets are outside this embedded repacker');
    for (const [key, child] of Object.entries(value)) if (key !== 'extras') checkExtensions(child);
  };
  checkExtensions(json);
  if (array(json, 'extensionsUsed').length) fail('optional extensions are outside this embedded repacker');
  const buffers = array(json, 'buffers');
  if (buffers.length !== 1 || !object(buffers[0]) || buffers[0].uri !== undefined) fail('exactly one embedded buffer without uri is required');
  const size = buffers[0].byteLength;
  if (!integer(size, 1) || size > bin.length || bin.length - size > 3) fail('embedded buffer byteLength does not match BIN range');
  if (bin.subarray(size).some(byte => byte !== 0)) fail('BIN padding must contain zeros');
  const views = array(json, 'bufferViews');
  views.forEach((view, index) => {
    if (!object(view) || view.buffer !== 0 || !integer(view.byteOffset ?? 0) || !integer(view.byteLength, 1)) fail(`bufferView ${index} has an invalid range or buffer`);
    const end = (view.byteOffset ?? 0) + view.byteLength;
    if (!integer(end) || end > size) fail(`bufferView ${index} exceeds the embedded buffer range`);
    if (view.byteStride !== undefined && (!integer(view.byteStride, 4) || view.byteStride > 252 || view.byteStride % 4)) fail(`bufferView ${index} has invalid byteStride`);
  });
  array(json, 'accessors').forEach((accessor, index) => {
    if (!object(accessor)) fail(`accessor ${index} must be an object`);
    const componentBytes = COMPONENT_BYTES.get(accessor.componentType), components = COMPONENTS[accessor.type];
    if (!componentBytes || !components || !integer(accessor.count, 1)) fail(`accessor ${index} has an unsupported format`);
    const columns = accessor.type.startsWith('MAT') ? Number(accessor.type.slice(3)) : 0;
    const bytes = columns ? align4(columns * componentBytes) * columns : components * componentBytes;
    if (accessor.bufferView !== undefined) {
      const view = viewAt(views, accessor.bufferView, `accessor ${index}`), offset = accessor.byteOffset ?? 0;
      checkRange(view, offset, accessor.count, bytes, view.byteStride ?? bytes, `accessor ${index}`);
      if (offset % componentBytes || ((view.byteOffset ?? 0) + offset) % componentBytes) fail(`accessor ${index} has unaligned component data`);
    } else if ((accessor.byteOffset ?? 0) !== 0) fail(`accessor ${index} without bufferView has a byteOffset`);
    if (accessor.sparse !== undefined) {
      const sparse = accessor.sparse;
      if (!object(sparse) || !integer(sparse.count, 1) || sparse.count > accessor.count) fail(`accessor ${index} has an invalid sparse count`);
      const indexBytes = COMPONENT_BYTES.get(sparse.indices?.componentType);
      if (![5121, 5123, 5125].includes(sparse.indices?.componentType)) fail(`accessor ${index} has invalid sparse indices`);
      for (const [key, elementBytes] of [['indices', indexBytes], ['values', bytes]]) {
        const part = sparse[key], view = viewAt(views, part?.bufferView, `accessor ${index} sparse ${key}`);
        if (view.byteStride !== undefined) fail(`accessor ${index} sparse ${key} cannot use byteStride`);
        const offset = part.byteOffset ?? 0, alignment = key === 'indices' ? indexBytes : componentBytes;
        checkRange(view, offset, sparse.count, elementBytes, elementBytes, `accessor ${index} sparse ${key}`);
        if (offset % alignment || ((view.byteOffset ?? 0) + offset) % alignment) fail(`accessor ${index} sparse ${key} is unaligned`);
      }
    }
  });
  array(json, 'images').forEach((image, index) => {
    if (!object(image) || image.uri !== undefined || !MIME_TYPES.has(image.mimeType)) fail(`image ${index} must be an embedded PNG or JPEG`);
    viewAt(views, image.bufferView, `image ${index}`);
  });
  return size;
}

/** Parse supported embedded GLB 2 assets. bin excludes the container's trailing BIN padding. */
export function parseGlb(sourceBuffer) {
  if (!Buffer.isBuffer(sourceBuffer) || sourceBuffer.length < 28) fail('truncated GLB header/chunks');
  if (sourceBuffer.readUInt32LE(0) !== MAGIC || sourceBuffer.readUInt32LE(4) !== 2) fail('invalid GLB magic or version');
  if (sourceBuffer.readUInt32LE(8) !== sourceBuffer.length || sourceBuffer.length % 4) fail('GLB length or alignment mismatch');
  const chunks = [];
  for (let offset = 12; offset < sourceBuffer.length;) {
    if (offset + 8 > sourceBuffer.length) fail('truncated chunk header');
    const length = sourceBuffer.readUInt32LE(offset), type = sourceBuffer.readUInt32LE(offset + 4), start = offset + 8, end = start + length;
    if (length % 4 || end > sourceBuffer.length) fail('chunk range or alignment mismatch');
    chunks.push({ type, bytes: sourceBuffer.subarray(start, end) });
    offset = end;
  }
  if (chunks.length !== 2 || chunks[0].type !== JSON_CHUNK || chunks[1].type !== BIN_CHUNK) fail('only ordered JSON and BIN chunks are supported');
  let json;
  try { json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(chunks[0].bytes)); }
  catch { fail('invalid UTF-8 JSON chunk'); }
  const size = validate(json, chunks[1].bytes);
  return { json, bin: chunks[1].bytes.subarray(0, size) };
}

/** Repack image bytes only; geometry/accessor/scene metadata and every non-image view stay intact. */
export function repackImages(sourceBuffer, replacements) {
  const { json, bin } = parseGlb(sourceBuffer), views = array(json, 'bufferViews'), images = array(json, 'images');
  if (!(replacements instanceof Map)) fail('replacements must be a Map keyed by image index');
  const byView = new Map(), imageViews = new Set(images.map(image => image.bufferView));
  for (const [index, replacement] of replacements) {
    if (!integer(index) || index >= images.length) fail('replacement references an invalid image index');
    if (!replacement || !Buffer.isBuffer(replacement.bytes) || !replacement.bytes.length || !MIME_TYPES.has(replacement.mimeType)) fail(`image ${index} replacement requires nonempty Buffer bytes and PNG/JPEG mimeType`);
    const viewIndex = images[index].bufferView, previous = byView.get(viewIndex);
    if (previous && (previous.mimeType !== replacement.mimeType || !previous.bytes.equals(replacement.bytes))) fail(`conflicting replacements share image bufferView ${viewIndex}`);
    byView.set(viewIndex, replacement);
  }
  for (const [index, image] of images.entries()) {
    if (byView.has(image.bufferView) && !replacements.has(index)) fail(`shared image bufferView ${image.bufferView} requires replacements for every image alias`);
  }
  const geometryViews = new Set();
  for (const accessor of array(json, 'accessors')) {
    if (accessor.bufferView !== undefined) geometryViews.add(accessor.bufferView);
    if (accessor.sparse) { geometryViews.add(accessor.sparse.indices.bufferView); geometryViews.add(accessor.sparse.values.bufferView); }
  }
  for (const viewIndex of byView.keys()) {
    if (geometryViews.has(viewIndex)) fail(`image bufferView ${viewIndex} is also used by an accessor or sparse data`);
    const view = views[viewIndex], start = view.byteOffset ?? 0, end = start + view.byteLength;
    for (const [otherIndex, other] of views.entries()) {
      if (imageViews.has(otherIndex) && !geometryViews.has(otherIndex)) continue;
      const otherStart = other.byteOffset ?? 0;
      if (start < otherStart + other.byteLength && otherStart < end) fail(`image bufferView ${viewIndex} overlaps non-image bufferView ${otherIndex}`);
    }
  }
  const parts = [];
  let length = 0;
  for (const [index, view] of views.entries()) {
    const bytes = byView.get(index)?.bytes ?? bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    const aligned = align4(length);
    if (aligned > length) parts.push(Buffer.alloc(aligned - length));
    view.byteOffset = aligned;
    view.byteLength = bytes.length;
    parts.push(bytes);
    length = aligned + bytes.length;
  }
  for (const image of images) if (byView.has(image.bufferView)) image.mimeType = byView.get(image.bufferView).mimeType;
  json.buffers[0].byteLength = length;
  const jsonBytes = Buffer.from(JSON.stringify(json)), jsonLength = align4(jsonBytes.length), binLength = align4(length);
  const total = 12 + 8 + jsonLength + 8 + binLength;
  if (total > 0xffffffff) fail('repacked GLB exceeds uint32 container size');
  const output = Buffer.alloc(total);
  output.writeUInt32LE(MAGIC, 0); output.writeUInt32LE(2, 4); output.writeUInt32LE(total, 8);
  output.writeUInt32LE(jsonLength, 12); output.writeUInt32LE(JSON_CHUNK, 16);
  output.fill(0x20, 20, 20 + jsonLength); jsonBytes.copy(output, 20);
  const binHeader = 20 + jsonLength;
  output.writeUInt32LE(binLength, binHeader); output.writeUInt32LE(BIN_CHUNK, binHeader + 4);
  Buffer.concat(parts, length).copy(output, binHeader + 8);
  // Re-validate our own range/padding output before the caller can publish it.
  parseGlb(output);
  return output;
}
