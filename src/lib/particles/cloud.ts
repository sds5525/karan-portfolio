let cachedPositions: Float32Array | null = null;
let cachedPromise: Promise<Float32Array> | null = null;

export async function loadSceneHi(
  url = `${import.meta.env.BASE_URL || '/'}models/scene-hi.bin`.replace(/\/\//g, '/')
): Promise<Float32Array> {
  if (cachedPositions) {
    return cachedPositions;
  }
  if (cachedPromise) {
    return cachedPromise;
  }

  cachedPromise = (async () => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load scene-hi.bin: ${res.status} ${res.statusText}`);
    }
    const buffer = await res.arrayBuffer();
    const u16 = new Uint16Array(buffer);
    const count = 600000;
    const pos = new Float32Array(count * 3);

    const minX = -3.9088;
    const minY = -0.5724;
    const minZ = -4.0321;
    const maxX = 3.3338;
    const maxY = 2.0179;
    const maxZ = 3.9194;
    const scaleX = (maxX - minX) / 65535;
    const scaleY = (maxY - minY) / 65535;
    const scaleZ = (maxZ - minZ) / 65535;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      pos[idx] = u16[idx] * scaleX + minX;
      pos[idx + 1] = u16[idx + 1] * scaleY + minY;
      pos[idx + 2] = u16[idx + 2] * scaleZ + minZ;
    }

    cachedPositions = pos;
    return pos;
  })().catch((err) => {
    cachedPromise = null;
    throw err;
  });

  return cachedPromise;
}
