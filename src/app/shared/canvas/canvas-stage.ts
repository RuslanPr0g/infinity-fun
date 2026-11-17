import { NgZone } from '@angular/core';

export interface StageSize {
  /** CSS pixels. */
  w: number;
  h: number;
  /** Device pixels per CSS pixel actually used (capped). */
  dpr: number;
}

export interface CanvasStageOptions {
  /** Runs the loop and listeners outside Angular so frames don't trigger change detection. */
  zone: NgZone;
  /** Draws one frame. The context is already scaled to CSS pixels. `dt` is in seconds (capped at 0.1). */
  draw: (ctx: CanvasRenderingContext2D, dt: number, size: StageSize) => void;
  /** Called after the canvas has been resized. */
  resized?: (size: StageSize) => void;
  /** true: draw every frame. false: draw only on resize or `invalidate()`. */
  animate?: boolean;
  /** Element whose size the canvas follows. Defaults to the canvas itself. */
  sizeFrom?: HTMLElement;
  maxDpr?: number;
  alpha?: boolean;
}

/** Device-pixel size for a canvas of `w × h` CSS pixels. Pure, so it can be tested. */
export function canvasPixels(w: number, h: number, dpr: number, maxDpr = 2): { width: number; height: number; dpr: number } {
  const d = Math.max(1, Math.min(maxDpr, dpr || 1));
  return { width: Math.max(1, Math.round(w * d)), height: Math.max(1, Math.round(h * d)), dpr: d };
}

/**
 * The canvas plumbing every canvas game needs: crisp HiDPI sizing that follows the element,
 * a requestAnimationFrame loop outside the zone, pointer → canvas coordinates, and cleanup.
 * Taken from Figure Battle's component so all canvases behave the same.
 */
export class CanvasStage {
  readonly ctx: CanvasRenderingContext2D;
  size: StageSize = { w: 1, h: 1, dpr: 1 };

  private raf = 0;
  private last = 0;
  private running = false;
  private readonly ro: ResizeObserver;
  private readonly cleanup: (() => void)[] = [];

  constructor(readonly canvas: HTMLCanvasElement, private readonly opts: CanvasStageOptions) {
    this.ctx = canvas.getContext('2d', { alpha: opts.alpha ?? true })!;
    this.ro = new ResizeObserver(() => this.resize());
    opts.zone.runOutsideAngular(() => {
      this.ro.observe(opts.sizeFrom ?? canvas);
      this.resize();
    });
  }

  /** Starts the loop (animated stages) and draws the first frame. */
  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.last = 0;
    this.opts.zone.runOutsideAngular(() => (this.raf = requestAnimationFrame((t) => this.frame(t))));
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** Asks for one redraw on the next frame (for stages that don't animate). */
  invalidate(): void {
    if (this.running && this.opts.animate !== false) {
      return;
    }
    cancelAnimationFrame(this.raf);
    this.opts.zone.runOutsideAngular(() => (this.raf = requestAnimationFrame(() => this.paint(0))));
  }

  /** Adds a listener outside the zone that is removed on destroy. */
  listen<K extends keyof HTMLElementEventMap>(
    type: K,
    fn: (e: HTMLElementEventMap[K]) => void,
    options: AddEventListenerOptions = {},
    target: HTMLElement | Window = this.canvas,
  ): void {
    const handler = fn as EventListener;
    this.opts.zone.runOutsideAngular(() => target.addEventListener(type, handler, options));
    this.cleanup.push(() => target.removeEventListener(type, handler, options));
  }

  /** Pointer or mouse position in canvas CSS pixels. */
  toLocal(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  destroy(): void {
    this.stop();
    this.ro.disconnect();
    this.cleanup.forEach((f) => f());
    this.cleanup.length = 0;
  }

  private resize(): void {
    const el = this.opts.sizeFrom ?? this.canvas;
    const r = el.getBoundingClientRect();
    const px = canvasPixels(r.width, r.height, window.devicePixelRatio, this.opts.maxDpr);
    if (px.width !== this.canvas.width || px.height !== this.canvas.height) {
      this.canvas.width = px.width;
      this.canvas.height = px.height;
    }
    this.size = { w: Math.max(1, r.width), h: Math.max(1, r.height), dpr: px.dpr };
    this.opts.resized?.(this.size);
    if (this.opts.animate === false || !this.running) {
      this.paint(0);
    }
  }

  private frame(t: number): void {
    if (!this.running) {
      return;
    }
    const dt = this.last ? Math.min(0.1, (t - this.last) / 1000) : 1 / 60;
    this.last = t;
    this.paint(dt);
    if (this.opts.animate !== false) {
      this.raf = requestAnimationFrame((n) => this.frame(n));
    }
  }

  private paint(dt: number): void {
    const { ctx, size } = this;
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    this.opts.draw(ctx, dt, size);
  }
}
