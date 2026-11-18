export interface PointCloud {
  pos: Float32Array;
  count: number;
}

let cachedCloud: PointCloud | null = null;
let cachedPromise: Promise<PointCloud> | null = null;

export async function loadCloud(
  url = `${import.meta.env.BASE_URL || '/'}models/scene.bin`.replace(/\/\//g, '/')
): Promise<PointCloud> {
  if (cachedCloud) {
    return cachedCloud;
  }
  if (cachedPromise) {
    return cachedPromise;
  }

  cachedPromise = (async () => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load point cloud: ${res.status} ${res.statusText}`);
    }
    const buffer = await res.arrayBuffer();
    const src = new Float32Array(buffer);
    const count = Math.floor(src.length / 6);
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const srcIdx = i * 6;
      const dstIdx = i * 3;
      pos[dstIdx] = src[srcIdx];
      pos[dstIdx + 1] = src[srcIdx + 1];
      pos[dstIdx + 2] = src[srcIdx + 2];
    }

    cachedCloud = { pos, count };
    return cachedCloud;
  })().catch((err) => {
    cachedPromise = null;
    throw err;
  });

  return cachedPromise;
}

