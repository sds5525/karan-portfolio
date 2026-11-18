interface OverlayParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  dl: number;
}

function discTargets(n: number): number[] {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const s = Math.min(W * 0.5, H * 0.62);
  const D: [number, number, number, number][] = [];
  for (let d = 0; d < 3; d++) {
    const r = (s * (1 - Math.min(d, 2.4) * 0.13)) / 2;
    D.push([W / 2 + d * W * 0.36, H * 0.46 - d * H * 0.13, r, r * r]);
  }
  const tot = D.reduce((a, b) => a + b[3], 0);
  const out: number[] = [];
  for (let j = 0; j < n; j++) {
    let q = Math.random() * tot;
    let k = 0;
    while (k < 2 && q > D[k][3]) {
      q -= D[k][3];
      k++;
    }
    const [x, y, r] = D[k];
    const rim = Math.random() < 0.22;
    const rr = rim
      ? r * (0.97 + Math.random() * 0.03)
      : r * (0.22 + Math.sqrt(Math.random()) * 0.78);
    const t = Math.random() * 6.283;
    out.push(x + Math.cos(t) * rr, y + Math.sin(t) * rr);
  }
  return out;
}

export class DiscEntranceEffect {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onComplete?: () => void;
  private OP: OverlayParticle[] = [];
  private oT = 0;
  private running = false;
  private rafId = 0;

  constructor(canvas: HTMLCanvasElement, onComplete?: () => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onComplete = onComplete;
  }

  public start(): void {
    if (this.running) return;

    const still = matchMedia('(prefers-reduced-motion:reduce)').matches;
    if (still) {
      this.onComplete?.();
      return;
    }

    this.running = true;

    const W = window.innerWidth;
    const H = window.innerHeight;
    const r = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = W * r;
    this.canvas.height = H * r;
    this.ctx.setTransform(r, 0, 0, r, 0, 0);

    const n = W < 700 ? 5000 : 9500;
    const T = discTargets(n);
    this.OP = [];
    for (let j = 0; j < n; j++) {
      this.OP.push({
        x: Math.random() * W,
        y: -10 - Math.random() * H * 0.5,
        vx: (Math.random() - 0.5) * 2,
        vy: 3 + Math.random() * 10,
        tx: T[j * 2],
        ty: T[j * 2 + 1],
        dl: Math.random() * 600,
      });
    }

    this.oT = performance.now();
    this.rafId = requestAnimationFrame(() => this.oLoop());
  }

  private oLoop(): void {
    if (!this.running) return;
    const t = performance.now() - this.oT;
    const W = window.innerWidth;
    const H = window.innerHeight;
    this.ctx.clearRect(0, 0, W, H);

    const tv = 236;
    const v = Math.round(255 + (tv - 255) * Math.min(1, t / 900));
    this.ctx.fillStyle = `rgb(${v},${v},${v})`;
    this.ctx.globalAlpha = Math.max(0, Math.min(1, 1 - (t - 1250) / 650));

    for (const p of this.OP) {
      if (t > p.dl) {
        p.vx = (p.vx + (p.tx - p.x) * 0.014) * 0.92;
        p.vy = (p.vy + (p.ty - p.y) * 0.014) * 0.92;
        p.x += p.vx;
        p.y += p.vy;
      }
      this.ctx.fillRect(p.x, p.y, 1.6, 1.6);
    }

    this.ctx.globalAlpha = 1;

    if (t > 1950) {
      this.running = false;
      this.onComplete?.();
      return;
    }

    this.rafId = requestAnimationFrame(() => this.oLoop());
  }

  public stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }
}

