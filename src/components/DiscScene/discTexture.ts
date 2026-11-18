import { CanvasTexture, Texture, TextureLoader, SRGBColorSpace } from 'three';
import type { Project } from '../../data/projects';

const textureCache = new Map<string, Texture>();

export function getDiscTexture(project: Project): Texture {
  const cached = textureCache.get(project.slug);
  if (cached) return cached;

  // Placeholder generated on a 1024px canvas
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const h = project.hue;
  // Radial gradient matching legacy face design
  const grad = ctx.createRadialGradient(
    1024 * 0.28,
    1024 * 0.24,
    0,
    512,
    512,
    512
  );
  grad.addColorStop(0, `hsl(${h}, 70%, 62%)`);
  grad.addColorStop(0.48, `hsl(${h + 35}, 55%, 22%)`);
  grad.addColorStop(0.8, '#0b0b0c');
  grad.addColorStop(1, '#050505');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle radial sheen overlay
  const sheen = ctx.createRadialGradient(512, 512, 100, 512, 512, 512);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
  sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
  sheen.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle circular grooves
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 1;
  for (let r = 130; r < 460; r += 26) {
    ctx.beginPath();
    ctx.arc(512, 512, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Ring text around edge: role · tools · year repeated twice
  const ringItems = [...project.role, ...project.tools, project.year].join(' · ').toUpperCase();
  const ringText = `${ringItems} · ${ringItems} · `;
  ctx.save();
  ctx.translate(512, 512);
  ctx.font = '500 20px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(217, 215, 210, 0.88)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = ringText.split('');
  const totalAngle = Math.PI * 2;
  const step = totalAngle / chars.length;
  for (let i = 0; i < chars.length; i++) {
    ctx.save();
    ctx.rotate(i * step);
    ctx.translate(0, -446);
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();

  // Rotated title in Instrument Serif
  ctx.save();
  ctx.translate(512, 600);
  ctx.rotate((-7 * Math.PI) / 180);
  ctx.font = '400 90px "Instrument Serif", Georgia, serif';
  ctx.fillStyle = '#f2efe8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;
  ctx.fillText(project.title.toUpperCase(), 0, 0);
  ctx.restore();

  const canvasTexture = new CanvasTexture(canvas);
  canvasTexture.colorSpace = SRGBColorSpace;
  canvasTexture.needsUpdate = true;

  textureCache.set(project.slug, canvasTexture);

  // Attempt to load cover image at public/discs/<slug>.webp
  const imgUrl = `${import.meta.env.BASE_URL || '/'}discs/${project.slug}.webp`.replace(/\/\//g, '/');
  const loader = new TextureLoader();
  loader.load(
    imgUrl,
    (loadedTex) => {
      if (loadedTex.image) {
        ctx.clearRect(0, 0, 1024, 1024);
        ctx.drawImage(loadedTex.image, 0, 0, 1024, 1024);
        canvasTexture.needsUpdate = true;
      }
    },
    undefined,
    () => {
      // File does not exist; keep generated placeholder
    }
  );

  return canvasTexture;
}
