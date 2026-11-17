import { ARENA, Battlefield } from './battlefield';
import { Mat, RGB, drawFigure, drawOutline, hex, lighten, rgba, teamColor } from './figures';
import { Rect } from './levels';
import { Unit } from './unit';
import { UNIT_TYPES } from './unit-data';

const BG = '#070a14';
const ARENA_FILL = '#0b1122';
const MARGIN = 10;
const TAU = Math.PI * 2;
const SHELL_CORE = hex('#ffd08a');
const SHELL_GLOW: RGB = [255, 179, 71];
const BAD: RGB = hex('#ff5a5a');
const FONT = '600 13px Inter, "Segoe UI", Roboto, Cantarell, Ubuntu, "Noto Sans", sans-serif';

/**
 * Draws a Battlefield onto a 2D canvas. The arena is fitted into a "stage" rect and,
 * when the stage is taller than wide, rotated so the player deploys at the bottom.
 * Static art (background, grid, fallen-unit decals) is cached on an offscreen layer.
 */
export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly layer = document.createElement('canvas');
  private readonly lctx: CanvasRenderingContext2D;
  private readonly sprites = new Map<RGB, HTMLCanvasElement>();
  private dpr = 1;
  private cssW = 1;
  private cssH = 1;
  /** World → CSS pixels. */
  view: Mat = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  /** World → device pixels (view * dpr). */
  private dev: Mat = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  scale = 1;
  portrait = false;
  private layerEpoch = -1;
  private layerCount = 0;
  private layerBf: Battlefield | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.lctx = this.layer.getContext('2d')!;
  }

  resize(cssW: number, cssH: number, dpr: number, stage: Rect): void {
    this.cssW = Math.max(1, cssW);
    this.cssH = Math.max(1, cssH);
    this.dpr = dpr;
    const pw = Math.round(this.cssW * dpr);
    const ph = Math.round(this.cssH * dpr);
    this.canvas.width = pw;
    this.canvas.height = ph;
    this.layer.width = pw;
    this.layer.height = ph;

    const ww = ARENA.w + MARGIN * 2;
    const wh = ARENA.h + MARGIN * 2;
    this.portrait = stage.h > stage.w * 1.1;
    const s = this.portrait ? Math.min(stage.w / wh, stage.h / ww) : Math.min(stage.w / ww, stage.h / wh);
    const cx = stage.x + stage.w / 2;
    const cy = stage.y + stage.h / 2;
    const wcx = ARENA.x + ARENA.w / 2;
    const wcy = ARENA.y + ARENA.h / 2;
    this.scale = s;
    this.view = this.portrait
      ? { a: 0, b: -s, c: s, d: 0, e: cx - s * wcy, f: cy + s * wcx }
      : { a: s, b: 0, c: 0, d: s, e: cx - s * wcx, f: cy - s * wcy };
    this.layerEpoch = -1;
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const v = this.view;
    const s = this.scale;
    return this.portrait ? { x: (v.f - sy) / s, y: (sx - v.e) / s } : { x: (sx - v.e) / s, y: (sy - v.f) / s };
  }

  worldToScreen(x: number, y: number): { x: number; y: number } {
    const v = this.view;
    return { x: v.a * x + v.c * y + v.e, y: v.b * x + v.d * y + v.f };
  }

  /** Stereo pan (-1..1) for a world position, following the on-screen layout. */
  panOf(x: number, y: number): number {
    const p = this.worldToScreen(x, y);
    return Math.max(-1, Math.min(1, (p.x / this.cssW) * 2 - 1));
  }

  // ───────────────────────────── static layer ─────────────────────────────

  private rebuildLayer(bf: Battlefield): void {
    const c = this.lctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = BG;
    c.fillRect(0, 0, this.layer.width, this.layer.height);
    const m = this.dev;
    c.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
    c.beginPath();
    c.roundRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h, 18);
    c.fillStyle = ARENA_FILL;
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.06)';
    c.lineWidth = 1;
    c.stroke();
    c.beginPath();
    for (let x = ARENA.x + 44; x < ARENA.x + ARENA.w; x += 44) {
      c.moveTo(x, ARENA.y + 1);
      c.lineTo(x, ARENA.y + ARENA.h - 1);
    }
    for (let y = ARENA.y + 44; y < ARENA.y + ARENA.h; y += 44) {
      c.moveTo(ARENA.x + 1, y);
      c.lineTo(ARENA.x + ARENA.w - 1, y);
    }
    c.strokeStyle = 'rgba(255,255,255,0.028)';
    c.stroke();
    const mx = ARENA.x + ARENA.w / 2;
    c.beginPath();
    c.setLineDash([10, 10]);
    c.moveTo(mx, ARENA.y + 16);
    c.lineTo(mx, ARENA.y + ARENA.h - 16);
    c.strokeStyle = 'rgba(255,255,255,0.06)';
    c.lineWidth = 2;
    c.stroke();
    c.setLineDash([]);
    this.layerCount = 0;
    this.layerEpoch = bf.decalEpoch;
    this.layerBf = bf;
    this.drawNewDecals(bf);
  }

  private drawNewDecals(bf: Battlefield): void {
    for (let i = this.layerCount; i < bf.decals.length; i++) {
      const d = bf.decals[i];
      drawOutline(this.lctx, this.dev, d.kind, d.x, d.y, d.r, d.rot, rgba(teamColor(d.team), 0.1), 1.5);
    }
    this.layerCount = bf.decals.length;
  }

  private sprite(c: RGB): HTMLCanvasElement {
    let s = this.sprites.get(c);
    if (!s) {
      s = document.createElement('canvas');
      s.width = s.height = 32;
      const g = s.getContext('2d')!;
      g.fillStyle = rgba(c, 1);
      g.beginPath();
      g.arc(16, 16, 15, 0, TAU);
      g.fill();
      this.sprites.set(c, s);
    }
    return s;
  }

  // ───────────────────────────── frame ─────────────────────────────

  render(bf: Battlefield, showGhost: boolean): void {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const sx = bf.shakeX * this.scale;
    const sy = bf.shakeY * this.scale;
    const v = this.view;
    this.dev = { a: v.a * dpr, b: v.b * dpr, c: v.c * dpr, d: v.d * dpr, e: v.e * dpr, f: v.f * dpr };
    if (this.layerEpoch !== bf.decalEpoch || this.layerBf !== bf) {
      this.rebuildLayer(bf);
    } else if (this.layerCount < bf.decals.length) {
      this.drawNewDecals(bf);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    if (sx !== 0 || sy !== 0) {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    ctx.drawImage(this.layer, sx * dpr, sy * dpr);

    const m: Mat = { ...this.dev, e: this.dev.e + sx * dpr, f: this.dev.f + sy * dpr };
    const world = (): void => ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
    world();

    if (bf.deploying) {
      this.drawZones(bf, m);
    }

    for (const p of bf.projectiles) {
      if (p.type === 'shell') {
        const a = 0.12 + 0.3 * p.t;
        ctx.beginPath();
        ctx.arc(p.toX, p.toY, p.splash, 0, TAU);
        ctx.fillStyle = rgba(SHELL_GLOW, a * 0.25);
        ctx.fill();
        ctx.strokeStyle = rgba(SHELL_GLOW, a);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    for (const u of bf.units) {
      if (u.alive) {
        drawFigure(ctx, m, u.kind, u.x, u.y, u.r, u.rot, teamColor(u.team), u.flash * 6);
      }
    }
    world();
    // Health bars sit "above" units on screen, whichever way the arena is rotated.
    for (const u of bf.units) {
      if (u.alive && u.hp < u.maxHp) {
        const w = Math.max(18, u.r * 2.2);
        const k = Math.min(1, Math.max(0, u.hp / u.maxHp));
        const col = rgba(lighten(teamColor(u.team), 0.2));
        if (this.portrait) {
          const bx = u.x + u.r + 7;
          const by = u.y - w / 2;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(bx, by, 3, w);
          ctx.fillStyle = col;
          ctx.fillRect(bx, by, 3, w * k);
        } else {
          const bx = u.x - w / 2;
          const by = u.y - u.r - 10;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(bx, by, w, 3);
          ctx.fillStyle = col;
          ctx.fillRect(bx, by, w * k, 3);
        }
      }
    }

    const white = this.sprite([255, 255, 255]);
    for (const p of bf.projectiles) {
      const col = teamColor(p.team);
      if (p.type === 'bullet') {
        ctx.beginPath();
        ctx.moveTo(p.x - p.dx * 26, p.y - p.dy * 26);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = rgba(col, 0.9);
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.drawImage(white, p.x - 2.2, p.y - 2.2, 4.4, 4.4);
      } else {
        const gx = p.fromX + (p.toX - p.fromX) * p.t;
        const gy = p.fromY + (p.toY - p.fromY) * p.t;
        const h = Math.hypot(p.toX - p.fromX, p.toY - p.fromY) * 0.32 * Math.sin(p.t * Math.PI);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.arc(gx, gy, 4, 0, TAU);
        ctx.fill();
        // Lift the shell towards the top of the screen.
        const hx = this.portrait ? gx + h : gx;
        const hy = this.portrait ? gy : gy - h;
        ctx.fillStyle = rgba(SHELL_GLOW, 0.18);
        ctx.beginPath();
        ctx.arc(hx, hy, 9, 0, TAU);
        ctx.fill();
        ctx.fillStyle = rgba(SHELL_CORE);
        ctx.beginPath();
        ctx.arc(hx, hy, 5, 0, TAU);
        ctx.fill();
      }
    }

    for (const f of bf.fx) {
      const k = f.life / f.maxLife;
      if (f.kind === 0) {
        const r = f.size * (0.4 + 0.6 * k);
        ctx.globalAlpha = k;
        ctx.drawImage(this.sprite(f.color), f.x - r, f.y - r, r * 2, r * 2);
      } else if (f.kind === 1) {
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.a + (f.b - f.a) * (1 - k), 0, TAU);
        ctx.strokeStyle = rgba(f.color, k * 0.8);
        ctx.lineWidth = f.size * k + 0.5;
        ctx.stroke();
      } else {
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(f.a, f.b);
        ctx.strokeStyle = rgba(f.color, k);
        ctx.lineWidth = f.size * k + 0.5;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    if (bf.deploying) {
      if (bf.hover) {
        this.drawHover(bf.hover, m);
      }
      if (showGhost) {
        this.drawGhost(bf, m);
      }
    }
  }

  private drawZones(bf: Battlefield, m: Mat): void {
    const ctx = this.ctx;
    for (let team = 0; team < 2; team++) {
      if (team === 1 && !bf.infinite) {
        continue;
      }
      const col = teamColor(team);
      const active = team === bf.placeTeam;
      ctx.setLineDash([8, 8]);
      ctx.lineWidth = 1.5;
      for (const z of bf.zones[team]) {
        ctx.fillStyle = rgba(col, active ? 0.07 : 0.03);
        ctx.fillRect(z.x, z.y, z.w, z.h);
        ctx.strokeStyle = rgba(col, active ? 0.45 : 0.15);
        ctx.strokeRect(z.x, z.y, z.w, z.h);
      }
      ctx.setLineDash([]);
      const z0 = bf.zones[team][0];
      if (z0) {
        const a = this.toDevice(m, z0.x, z0.y);
        const b = this.toDevice(m, z0.x + z0.w, z0.y + z0.h);
        this.text('DEPLOY ZONE', Math.min(a.x, b.x) + 14 * this.dpr, Math.min(a.y, b.y) + 22 * this.dpr, rgba(col, active ? 0.7 : 0.3), 11);
        ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
      }
    }
  }

  private toDevice(m: Mat, x: number, y: number): { x: number; y: number } {
    return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
  }

  /** Text in device pixels, unrotated. */
  private text(s: string, x: number, y: number, style: string, size: number): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.font = FONT.replace('13px', `${size}px`);
    ctx.fillStyle = style;
    ctx.fillText(s, x / this.dpr, y / this.dpr);
  }

  private rangeRing(m: Mat, x: number, y: number, r: number, col: RGB, fill: number, line: number): void {
    const ctx = this.ctx;
    ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    if (fill > 0) {
      ctx.fillStyle = rgba(col, fill);
      ctx.fill();
    }
    ctx.strokeStyle = rgba(col, line);
    ctx.lineWidth = 1.5 / Math.max(this.scale, 0.5);
    ctx.stroke();
  }

  private drawHover(u: Unit, m: Mat): void {
    const col = teamColor(u.team);
    if (u.reach > 30) {
      this.rangeRing(m, u.x, u.y, u.reach + u.r, col, 0.04, 0.4);
    }
    const p = this.toDevice(m, u.x, u.y);
    const off = (u.r * this.scale + 8) * this.dpr;
    this.text(UNIT_TYPES[u.kind].name, p.x + off, p.y - off + 8 * this.dpr, rgba(col, 0.95), 13);
  }

  private drawGhost(bf: Battlefield, m: Mat): void {
    const mo = bf.mouse;
    const kind = bf.selectedKind;
    if (!mo || bf.paintMode === 2 || bf.eraseTool || !bf.allowed.includes(kind)) {
      return;
    }
    if (mo.x < ARENA.x || mo.y < ARENA.y || mo.x >= ARENA.x + ARENA.w || mo.y >= ARENA.y + ARENA.h) {
      return;
    }
    const r = UNIT_TYPES[kind].r;
    const col = teamColor(bf.placeTeam);
    const rot = bf.placeTeam === 0 ? 0 : Math.PI;
    for (const [x, y] of bf.brushPoints(mo.x, mo.y, kind)) {
      const ok = bf.canPlace(kind, bf.placeTeam, x, y) === '';
      drawFigure(this.ctx, m, kind, x, y, r, rot, ok ? col : BAD, 0, ok ? 0.45 : 0.3, false);
    }
    const preview = new Unit(kind, bf.placeTeam, mo.x, mo.y);
    if (bf.placeTeam === 0) {
      preview.applyMods(bf.upgrades[kind]);
    }
    if (preview.reach > 30) {
      this.rangeRing(m, mo.x, mo.y, preview.reach + r, col, 0, 0.22);
    }
  }
}
