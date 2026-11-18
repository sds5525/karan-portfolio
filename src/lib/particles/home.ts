import logoSrc from '../../assets/masala-logo.png';
import { loadCloud, type PointCloud } from './cloud';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  b: number;
  dl: number;
  ld?: number;
  la?: number;
  pi?: number;
}

const SESSION_KEY = 'portfolio_home_intro_played';

let moduleIntroPlayed = false;

export const hasPlayedHomeIntro = (): boolean => {
  if (moduleIntroPlayed) return true;
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  } catch {
    return false;
  }
};

export const markHomeIntroPlayed = (): void => {
  moduleIntroPlayed = true;
  try {
    sessionStorage.setItem(SESSION_KEY, 'true');
  } catch {
    // ignore
  }
};

const LOGOIMG = new Image();
LOGOIMG.src = logoSrc;

const HOLD = 2200;

const createGL = (): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d')!;
  const r = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  r.addColorStop(0, 'rgba(190,215,255,1)');
  r.addColorStop(0.35, 'rgba(130,170,255,.35)');
  r.addColorStop(1, 'rgba(90,130,255,0)');
  x.fillStyle = r;
  x.fillRect(0, 0, 32, 32);
  return c;
};

const GL = createGL();

export class HomeParticles {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onLeaveComplete?: () => void;

  private W = 0;
  private H = 0;
  private PS: Particle[] = [];
  private t0 = 0;
  private running = false;
  private mx = -999;
  private my = -999;
  public intro = true;
  private burst = false;
  private logoC: HTMLCanvasElement | null = null;
  private logoPts: number[] = [];
  private ly = 0;
  private lh = 0;
  private LR = 1;
  private leaving = false;
  private tL = 0;
  private rafId = 0;
  private cloud: PointCloud | null = null;

  constructor(canvas: HTMLCanvasElement, onLeaveComplete?: () => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onLeaveComplete = onLeaveComplete;

    const still = matchMedia('(prefers-reduced-motion:reduce)').matches;
    if (still || hasPlayedHomeIntro()) {
      this.intro = false;
    }

    // Start loading the point cloud; does not block the intro hold
    loadCloud()
      .then((cloud) => {
        this.cloud = cloud;
        if (this.PS.length > 0) {
          this.retarget();
        }
      })
      .catch((err) => {
        console.warn('Point cloud load failed, falling back to silhouette:', err);
      });
  }

  public isIntroActive(): boolean {
    return this.intro && !this.burst;
  }

  public isLeaving(): boolean {
    return this.leaving;
  }

  private size(): void {
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    const r = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.W * r;
    this.canvas.height = this.H * r;
    this.ctx.setTransform(r, 0, 0, r, 0, 0);
  }

  private silhouette(): number[] {
    const o = document.createElement('canvas');
    o.width = this.W;
    o.height = this.H;
    const g = o.getContext('2d')!;
    g.fillStyle = '#fff';
    const s = this.H;
    const x = this.W / 2;
    let q = 7;
    const r = () => (q = (q * 16807) % 2147483647) / 2147483647;
    g.beginPath();
    g.ellipse(x, 0.37 * s, 0.235 * s, 0.27 * s, 0, 0, 7);
    g.fill();
    for (let a = 0; a < 56; a++) {
      const t = Math.PI * (0.85 + (a / 55) * 1.3);
      g.beginPath();
      g.arc(
        x + Math.cos(t) * 0.24 * s,
        0.37 * s + Math.sin(t) * 0.275 * s,
        0.034 * s * (0.6 + r() * 0.9),
        0,
        7
      );
      g.fill();
    }
    g.fillRect(x - 0.125 * s, 0.55 * s, 0.25 * s, 0.2 * s);
    g.beginPath();
    g.moveTo(x - 0.125 * s, 0.68 * s);
    g.quadraticCurveTo(x - 0.2 * s, 0.72 * s, x - 0.35 * s, 0.8 * s);
    g.quadraticCurveTo(x - 0.55 * s, 0.9 * s, x - 0.6 * s, s);
    g.lineTo(x + 0.6 * s, s);
    g.quadraticCurveTo(x + 0.55 * s, 0.9 * s, x + 0.35 * s, 0.8 * s);
    g.quadraticCurveTo(x + 0.2 * s, 0.72 * s, x + 0.125 * s, 0.68 * s);
    g.fill();

    const d = g.getImageData(0, 0, this.W, this.H).data;
    const c: number[] = [];
    for (let y = 0; y < this.H; y += 2) {
      for (let x = 0; x < this.W; x += 2) {
        const k = (y * this.W + x) * 4;
        const w = d[k + 3] / 255;
        if (w > 0.15) c.push(x, y, w);
      }
    }
    return c;
  }

  private updateCloudTargets(elapsed: number, still: boolean): void {
    if (!this.cloud) return;
    const angle = still ? 0 : elapsed * 0.00012;
    const cosY = Math.cos(angle);
    const sinY = Math.sin(angle);
    const tiltX = (22 * Math.PI) / 180;
    const cosX = Math.cos(tiltX);
    const sinX = Math.sin(tiltX);

    const fov = 2.2;
    const scale = Math.min(this.W * 0.62, this.H * 1.1);
    const scaleFov = scale * fov;
    const cx = this.W / 2;
    const cy = this.H * 0.55;
    const pos = this.cloud.pos;

    for (let i = 0; i < this.PS.length; i++) {
      const p = this.PS[i];
      if (p.pi === undefined) continue;

      const idx = p.pi * 3;
      const x0 = pos[idx];
      const y0 = pos[idx + 1];
      const z0 = pos[idx + 2];

      // Rotate around Y by angle
      const x1 = x0 * cosY + z0 * sinY;
      const y1 = y0;
      const z1 = -x0 * sinY + z0 * cosY;

      // Rotate around X by 22° tilt
      const x2 = x1;
      const y2 = y1 * cosX - z1 * sinX;
      const z2 = y1 * sinX + z1 * cosX;

      // Project
      const zp = z2 + fov;
      const invZ = 1 / zp;
      p.tx = cx + x2 * scaleFov * invZ;
      p.ty = cy - y2 * scaleFov * invZ;

      // Depth: 0 at back to 1 at front (closer to camera has smaller z2)
      const depth = Math.max(0, Math.min(1, 0.5 - z2));
      p.b = 0.25 + 0.75 * depth;

      if (still) {
        p.x = p.tx;
        p.y = p.ty;
      }
    }
  }

  private retarget(): void {
    const still = matchMedia('(prefers-reduced-motion:reduce)').matches;

    if (this.cloud) {
      const count = this.cloud.count;
      this.PS.forEach((p) => {
        p.pi = Math.floor(Math.random() * count);
      });
      this.updateCloudTargets(0, still);
      return;
    }

    // Fallback: procedural silhouette
    const c = this.silhouette();
    const m = c.length / 3;
    if (!m) return;
    this.PS.forEach((p) => {
      const k = ((Math.random() * m) | 0) * 3;
      p.tx = c[k] + Math.random() * 2;
      p.ty = c[k + 1] + Math.random() * 2;
      p.b = 0.25 + c[k + 2] * 0.75;
      if (still) {
        p.x = p.tx;
        p.y = p.ty;
      }
    });
  }

  private makeLogo(): void {
    const r = (this.LR = Math.min(window.devicePixelRatio || 1, 2));
    const c = (this.logoC = document.createElement('canvas'));
    c.width = this.W * r;
    c.height = this.H * r;
    const g = c.getContext('2d')!;
    g.scale(r, r);
    const iw = Math.min(this.W * 0.8, 980);
    const ih = (iw * LOGOIMG.height) / LOGOIMG.width;
    this.lh = ih;
    this.ly = this.H / 2 - ih / 2;
    try {
      g.drawImage(LOGOIMG, this.W / 2 - iw / 2, this.ly, iw, ih);
    } catch {
      // ignore
    }
    const d = g.getImageData(0, 0, c.width, c.height).data;
    this.logoPts = [];
    for (let y = 0; y < this.H; y += 2) {
      for (let x = 0; x < this.W; x += 2) {
        if (d[(((y * r) | 0) * c.width + ((x * r) | 0)) * 4 + 3] > 128) {
          this.logoPts.push(x, y);
        }
      }
    }
  }

  private initP(): void {
    this.size();
    this.PS = [];
    const n = window.innerWidth < 700 ? 9000 : 24000;
    const lg = this.intro;
    if (lg) this.makeLogo();
    const m = this.logoPts.length / 2;
    for (let j = 0; j < n; j++) {
      const a = Math.random() * 6.283;
      const v = Math.random() * 14;
      const k = lg ? ((Math.random() * m) | 0) * 2 : 0;
      this.PS.push({
        x: lg ? this.logoPts[k] : this.W / 2,
        y: lg ? this.logoPts[k + 1] : this.H / 2,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        tx: this.W / 2,
        ty: this.H / 2,
        b: 0.5,
        dl: Math.random() * (lg ? 250 : 1000),
      });
    }
    this.retarget();
    this.t0 = performance.now();
    this.burst = false;
  }

  private drawLogo(t: number): void {
    const g2 = this.ctx;
    g2.clearRect(0, 0, this.W, this.H);
    g2.globalAlpha = Math.min(1, t / 350);
    g2.shadowColor = 'rgba(170,200,255,.9)';
    g2.shadowBlur = 22;
    const bh = Math.max(4, this.lh / 9);
    const gl = t % 650 < 130 || t > HOLD - 350;
    if (this.logoC) {
      for (let y = this.ly; y < this.ly + this.lh * 1.2; y += bh) {
        const o = gl && Math.random() < 0.5 ? (Math.random() - 0.5) * this.W * 0.035 : 0;
        g2.drawImage(
          this.logoC,
          0,
          y * this.LR,
          this.W * this.LR,
          bh * this.LR,
          o,
          y,
          this.W,
          bh
        );
      }
    }
    g2.shadowBlur = 0;
    g2.globalAlpha = 1;
  }

  private loop(): void {
    if (!this.running) return;
    let t = performance.now() - this.t0;

    if (this.intro && !this.burst) {
      if (t < HOLD) {
        this.drawLogo(t);
        this.rafId = requestAnimationFrame(() => this.loop());
        return;
      }
      this.burst = true;
      this.intro = false;
      markHomeIntroPlayed();
      this.PS.forEach((p) => {
        const a = Math.atan2(p.y - this.H / 2, p.x - this.W / 2) + (Math.random() - 0.5) * 1.4;
        const v = 6 + Math.random() * 20;
        p.vx = Math.cos(a) * v;
        p.vy = Math.sin(a) * v;
      });
      this.t0 = performance.now();
      t = 0;
    }

    const still = matchMedia('(prefers-reduced-motion:reduce)').matches;

    // Every frame before physics: rotate 3D point cloud & project to moving targets
    if (this.cloud) {
      this.updateCloudTargets(t, still);
    }

    const g2 = this.ctx;
    g2.clearRect(0, 0, this.W, this.H);
    g2.fillStyle = '#fff';

    const nl = performance.now() - this.tL;
    for (const p of this.PS) {
      if (this.leaving && p.ld !== undefined && nl > p.ld) {
        p.vy -= p.la ?? 1;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
      } else if (t > p.dl) {
        p.vx = (p.vx + (p.tx - p.x) * 0.012) * 0.93;
        p.vy = (p.vy + (p.ty - p.y) * 0.012) * 0.93;
        const dx = p.x - this.mx;
        const dy = p.y - this.my;
        const d2 = dx * dx + dy * dy;
        if (d2 < 14000) {
          const d = Math.sqrt(d2) + 0.1;
          const f = (1 - d / 118) * 3.2;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
        p.x += p.vx;
        p.y += p.vy;
      }
    }

    g2.globalCompositeOperation = 'lighter';
    g2.globalAlpha = 0.16;
    const step = this.leaving ? 3 : 1;
    for (let i = 0; i < this.PS.length; i += step) {
      const p = this.PS[i];
      if (p.y > -12) g2.drawImage(GL, p.x - 8, p.y - 8, 16, 16);
    }

    g2.fillStyle = '#fff';
    for (const p of this.PS) {
      if (p.y < -12) continue;
      g2.globalAlpha = 0.45 + p.b * 0.55;
      g2.fillRect(p.x - 0.2, p.y - 0.2, 1.7, 1.7);
    }

    g2.globalCompositeOperation = 'source-over';
    g2.globalAlpha = 1;

    if (this.leaving && (nl > 2800 || (nl > 900 && this.PS.every((p) => p.y < -14)))) {
      this.leaving = false;
      this.onLeaveComplete?.();
      return;
    }

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    const still = matchMedia('(prefers-reduced-motion:reduce)').matches;
    if (still) {
      this.intro = false;
      markHomeIntroPlayed();
    }
    this.leaving = false;

    const go = () => {
      if (!this.running) return;
      this.initP();
      this.rafId = requestAnimationFrame(() => this.loop());
    };

    if (this.intro) {
      if (LOGOIMG.complete) {
        go();
      } else if (LOGOIMG.decode) {
        LOGOIMG.decode().then(go, go);
      } else {
        LOGOIMG.onload = go;
      }
    } else {
      go();
    }
  }

  public stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  public resize(): void {
    if (this.running) {
      this.size();
      if (this.intro && !this.burst && this.logoC) {
        this.makeLogo();
      }
      this.retarget();
    }
  }

  public leave(): void {
    if (!this.running || this.leaving || this.intro || !this.PS.length) return;
    this.leaving = true;
    this.tL = performance.now();
    this.PS.forEach((p) => {
      p.ld = Math.random() * 750;
      p.la = 0.5 + Math.random() * 1.2;
    });
  }

  public setPointer(x: number, y: number): void {
    this.mx = x;
    this.my = y;
  }
}
