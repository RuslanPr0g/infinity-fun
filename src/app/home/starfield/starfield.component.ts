import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, inject, viewChild } from '@angular/core';
import { CanvasStage, StageSize } from '../../shared/canvas/canvas-stage';
import { ViewportService } from '../../shared/services/viewport/viewport.service';

interface Star {
  x: number; // 0…1
  y: number;
  r: number;
  phase: number;
  speed: number;
  depth: number; // 0.2…1, deeper stars drift slower
}

interface Meteor {
  x: number;
  y: number;
  life: number; // seconds left
  max: number;
}

const BG_TOP = '#0b0f24';
const BG_BOTTOM = '#04050d';

/** Slowly drifting, twinkling stars with the odd shooting star, drawn on one canvas behind the home page. */
@Component({
  selector: 'app-starfield',
  standalone: true,
  template: `<canvas #canvas aria-hidden="true"></canvas>`,
  styles: `
    :host { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
    canvas { width: 100%; height: 100%; max-width: none; }
  `,
})
export class StarfieldComponent implements AfterViewInit, OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly still = inject(ViewportService).reducedMotion();
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private stage?: CanvasStage;
  private stars: Star[] = [];
  private meteors: Meteor[] = [];
  private nextMeteor = 3;
  private time = 0;
  private bg?: CanvasGradient;

  ngAfterViewInit(): void {
    this.stage = new CanvasStage(this.canvas().nativeElement, {
      zone: this.zone,
      animate: !this.still,
      alpha: false,
      resized: (s) => this.seed(s),
      draw: (ctx, dt, s) => this.draw(ctx, dt, s),
    });
    this.stage.start();
  }

  ngOnDestroy(): void {
    this.stage?.destroy();
  }

  private seed(s: StageSize): void {
    const count = Math.round(Math.min(260, (s.w * s.h) / 6500));
    while (this.stars.length < count) {
      const depth = 0.2 + Math.random() * 0.8;
      this.stars.push({ x: Math.random(), y: Math.random(), r: 0.4 + depth * 1.1, phase: Math.random() * 6.3, speed: 0.6 + Math.random() * 1.6, depth });
    }
    this.stars.length = count;
    this.bg = undefined;
  }

  private draw(ctx: CanvasRenderingContext2D, dt: number, s: StageSize): void {
    this.time += dt;
    if (!this.bg) {
      this.bg = ctx.createLinearGradient(0, 0, 0, s.h);
      this.bg.addColorStop(0, BG_TOP);
      this.bg.addColorStop(1, BG_BOTTOM);
    }
    ctx.fillStyle = this.bg;
    ctx.fillRect(0, 0, s.w, s.h);

    ctx.fillStyle = '#fff';
    for (const st of this.stars) {
      st.x -= dt * 0.004 * st.depth;
      if (st.x < 0) {
        st.x += 1;
      }
      ctx.globalAlpha = 0.25 + 0.6 * st.depth * (0.55 + 0.45 * Math.sin(this.time * st.speed + st.phase));
      ctx.beginPath();
      ctx.arc(st.x * s.w, st.y * s.h, st.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (dt > 0) {
      this.drawMeteors(ctx, dt, s);
    }
  }

  private drawMeteors(ctx: CanvasRenderingContext2D, dt: number, s: StageSize): void {
    this.nextMeteor -= dt;
    if (this.nextMeteor <= 0) {
      this.nextMeteor = 4 + Math.random() * 7;
      this.meteors.push({ x: Math.random() * s.w * 0.8, y: Math.random() * s.h * 0.4, life: 1.1, max: 1.1 });
    }
    const speed = Math.max(s.w, s.h) * 0.55;
    ctx.lineCap = 'round';
    for (const m of this.meteors) {
      m.life -= dt;
      m.x += speed * dt;
      m.y += speed * dt * 0.55;
      const a = Math.max(0, m.life / m.max);
      const g = ctx.createLinearGradient(m.x, m.y, m.x - 90, m.y - 50);
      g.addColorStop(0, `rgba(255,255,255,${0.85 * a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - 90, m.y - 50);
      ctx.stroke();
    }
    this.meteors = this.meteors.filter((m) => m.life > 0);
  }
}
