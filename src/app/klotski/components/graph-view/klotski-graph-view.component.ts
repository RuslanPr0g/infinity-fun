import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import {
  EdgeMode,
  GraphLayout,
  StateGraph,
  ViewMode,
} from '../../models/klotski.models';

const BUCKETS = 14;
const PERSPECTIVE_DISTANCE = 4;
const TILT = -1.0;
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 60;
const MAX_DPR = 2;
const TAP_SLOP_PX = 8;
const TAP_RADIUS_PX = 18;

@Component({
  selector: 'app-klotski-graph-view',
  standalone: true,
  template: `
    <div class="graph-wrap" #wrap>
      <canvas #canvas></canvas>
      @if (!graph) {
        <div class="overlay">Mapping every reachable position…</div>
      }
      <div class="zoom">
        <button type="button" (click)="zoomBy(1.5)" aria-label="Zoom in">+</button>
        <button type="button" (click)="zoomBy(1 / 1.5)" aria-label="Zoom out">−</button>
      </div>
    </div>
  `,
  styleUrl: './klotski-graph-view.component.scss',
})
export class KlotskiGraphViewComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly zone = inject(NgZone);

  @Input() graph: StateGraph | null = null;
  @Input() layout: GraphLayout | null = null;
  /** Node indices the player has visited, in order (last = current). */
  @Input() trail: readonly number[] = [];
  @Input() current = -1;
  @Input() hintNode = -1;
  @Input() mode: ViewMode = '3d';
  @Input() follow = true;
  @Input() edgeMode: EdgeMode = 'tree';
  /** Node whose board is being previewed, or -1. */
  @Input() selectedNode = -1;
  /** Emits the tapped node index, or -1 when empty space is tapped. */
  @Output() nodeTap = new EventEmitter<number>();

  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('wrap', { static: true }) private wrapRef!: ElementRef<HTMLElement>;

  private ctx!: CanvasRenderingContext2D;
  private raf = 0;
  private resizeObserver?: ResizeObserver;
  private width = 0;
  private height = 0;
  private dirty = true;

  // Camera. `t3d` eases 0 → 1 between the flat and the tilted view.
  private cx = 0;
  private cy = 0;
  private cz = 0;
  private yaw = 0.6;
  private t3d = 1;
  private zoom = 1;
  private zoomTarget = 1;
  private autoRotate = true;

  // Projected screen coordinates, reused every frame.
  private sx = new Float32Array(0);
  private sy = new Float32Array(0);
  private sorted = new Int32Array(0);
  private bucketStart: number[] = [];
  private bucketColors: string[] = [];

  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchDistance = 0;
  private lastX = 0;
  private tap: { id: number; x: number; y: number } | null = null;

  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.zoomBy(Math.exp(-e.deltaY * 0.0015));
  };
  private readonly onDown = (e: PointerEvent): void => {
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.autoRotate = false;
    this.lastX = e.clientX;
    this.pinchDistance = this.currentPinchDistance();
    this.tap = this.pointers.size === 1 ? { id: e.pointerId, x: e.clientX, y: e.clientY } : null;
    this.canvasRef.nativeElement.setPointerCapture(e.pointerId);
  };
  private readonly onMove = (e: PointerEvent): void => {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.tap && Math.hypot(e.clientX - this.tap.x, e.clientY - this.tap.y) > TAP_SLOP_PX) {
      this.tap = null;
    }
    if (this.pointers.size >= 2) {
      const distance = this.currentPinchDistance();
      if (this.pinchDistance > 0 && distance > 0) this.zoomBy(distance / this.pinchDistance);
      this.pinchDistance = distance;
      return;
    }
    this.yaw += (e.clientX - this.lastX) * 0.01;
    this.lastX = e.clientX;
    this.dirty = true;
  };
  private readonly onUp = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
    if (e.type === 'pointerup' && this.tap?.id === e.pointerId) {
      const node = this.nodeAt(e.clientX, e.clientY);
      this.zone.run(() => this.nodeTap.emit(node));
    }
    this.tap = null;
    this.pinchDistance = 0;
    const left = this.pointers.values().next().value;
    if (left) this.lastX = left.x;
  };

  /** Nearest drawn node to a screen point (within a finger-sized radius), or -1. */
  private nodeAt(clientX: number, clientY: number): number {
    const g = this.graph;
    if (!g || !this.layout) return -1;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best = -1;
    let bestDist = TAP_RADIUS_PX * TAP_RADIUS_PX;
    for (let i = 0; i < g.keys.length; i++) {
      const d = (this.sx[i] - x) ** 2 + (this.sy[i] - y) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }

  private currentPinchDistance(): number {
    if (this.pointers.size < 2) return 0;
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.zoomTarget = this.zoom = this.follow ? 5 : 1;

    this.zone.runOutsideAngular(() => {
      canvas.addEventListener('wheel', this.onWheel, { passive: false });
      canvas.addEventListener('pointerdown', this.onDown);
      canvas.addEventListener('pointermove', this.onMove);
      canvas.addEventListener('pointerup', this.onUp);
      canvas.addEventListener('pointercancel', this.onUp);
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.wrapRef.nativeElement);
      this.resize();
      this.prepare();
      const loop = (): void => {
        this.raf = requestAnimationFrame(loop);
        this.tick();
      };
      this.raf = requestAnimationFrame(loop);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.dirty = true;
    if (changes['graph'] || changes['layout']) this.prepare();
    if (changes['follow'] && !changes['follow'].firstChange) {
      this.zoomTarget = this.follow ? 5 : 1;
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    const canvas = this.canvasRef.nativeElement;
    canvas.removeEventListener('wheel', this.onWheel);
    canvas.removeEventListener('pointerdown', this.onDown);
    canvas.removeEventListener('pointermove', this.onMove);
    canvas.removeEventListener('pointerup', this.onUp);
    canvas.removeEventListener('pointercancel', this.onUp);
  }

  zoomBy(factor: number): void {
    this.zoomTarget = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoomTarget * factor));
    this.dirty = true;
  }

  private resize(): void {
    const rect = this.wrapRef.nativeElement.getBoundingClientRect();
    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    this.width = rect.width;
    this.height = rect.height;
    const canvas = this.canvasRef.nativeElement;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dirty = true;
  }

  /** Allocates projection buffers and groups nodes by colour bucket (one fillStyle per bucket). */
  private prepare(): void {
    const g = this.graph;
    if (!g) return;
    const n = g.keys.length;
    this.sx = new Float32Array(n);
    this.sy = new Float32Array(n);

    const bucketOf = new Uint8Array(n);
    const counts = new Array<number>(BUCKETS + 1).fill(0);
    const span = Math.max(1, g.maxGoalDist);
    for (let i = 0; i < n; i++) {
      const b = Math.min(BUCKETS - 1, Math.floor((Math.max(0, g.goalDist[i]) / span) * BUCKETS));
      bucketOf[i] = b;
      counts[b + 1]++;
    }
    for (let b = 0; b < BUCKETS; b++) counts[b + 1] += counts[b];
    this.bucketStart = counts.slice();
    const cursor = counts.slice();
    this.sorted = new Int32Array(n);
    for (let i = 0; i < n; i++) this.sorted[cursor[bucketOf[i]]++] = i;

    this.bucketColors = Array.from({ length: BUCKETS }, (_, b) => {
      const t = b / (BUCKETS - 1);
      return `hsl(${Math.round(85 + t * 190)} 75% ${Math.round(60 - t * 12)}%)`;
    });
  }

  private tick(): void {
    const g = this.graph;
    const l = this.layout;
    if (!g || !l || !this.ctx) return;

    let moving = false;
    const ease = (from: number, to: number, k: number): number => {
      const next = from + (to - from) * k;
      if (Math.abs(to - from) > 1e-3) moving = true;
      return Math.abs(to - from) < 1e-3 ? to : next;
    };

    const want3d = this.mode === '3d' ? 1 : 0;
    this.t3d = ease(this.t3d, want3d, 0.12);
    this.zoom = ease(this.zoom, this.zoomTarget, 0.14);

    const target = this.follow && this.current >= 0 ? this.current : -1;
    const tx = target >= 0 ? l.x[target] : 0;
    const ty = target >= 0 ? l.y[target] : 0;
    const tz = (target >= 0 ? l.z[target] : 0.5) * this.t3d;
    this.cx = ease(this.cx, tx, 0.14);
    this.cy = ease(this.cy, ty, 0.14);
    this.cz = ease(this.cz, tz, 0.14);

    const spinning = this.autoRotate && this.mode === '3d';
    if (spinning) this.yaw += 0.003;

    if (!(this.dirty || moving || spinning || this.hintNode >= 0)) return;
    this.dirty = false;
    this.draw(g, l);
  }

  private draw(g: StateGraph, l: GraphLayout): void {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;
    ctx.clearRect(0, 0, W, H);

    const n = g.keys.length;
    const cosY = Math.cos(this.yaw);
    const sinY = Math.sin(this.yaw);
    const pitch = TILT * this.t3d;
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const scale = this.zoom * Math.min(W, H) * 0.45;
    const { sx, sy } = this;

    for (let i = 0; i < n; i++) {
      const x = l.x[i] - this.cx;
      const y = l.y[i] - this.cy;
      const z = l.z[i] * this.t3d - this.cz;
      const x1 = x * cosY - y * sinY;
      const y1 = x * sinY + y * cosY;
      const y2 = y1 * cosP - z * sinP;
      const z2 = y1 * sinP + z * cosP;
      const persp = PERSPECTIVE_DISTANCE / Math.max(0.5, PERSPECTIVE_DISTANCE - z2);
      sx[i] = W / 2 + x1 * scale * persp;
      sy[i] = H / 2 - y2 * scale * persp;
    }

    const visible = (i: number): boolean =>
      sx[i] > -12 && sx[i] < W + 12 && sy[i] > -12 && sy[i] < H + 12;

    // Edges: the BFS tree from the start, or every legal move.
    if (this.edgeMode !== 'none') {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(240, 240, 240, 0.09)';
      ctx.lineWidth = 1;
      if (this.edgeMode === 'tree') {
        for (let i = 0; i < n; i++) {
          const p = l.parent[i];
          if (p < 0 || !(visible(i) || visible(p))) continue;
          ctx.moveTo(sx[p], sy[p]);
          ctx.lineTo(sx[i], sy[i]);
        }
      } else {
        for (let i = 0; i < n; i++) {
          for (const j of g.adj[i]) {
            if (j < i || !(visible(i) || visible(j))) continue;
            ctx.moveTo(sx[i], sy[i]);
            ctx.lineTo(sx[j], sy[j]);
          }
        }
      }
      ctx.stroke();
    }

    // Nodes, coloured by distance to the solution.
    const size = Math.min(7, Math.max(1.6, Math.sqrt(this.zoom) * 1.3));
    for (let b = 0; b < BUCKETS; b++) {
      ctx.fillStyle = this.bucketColors[b];
      for (let k = this.bucketStart[b]; k < this.bucketStart[b + 1]; k++) {
        const i = this.sorted[k];
        if (visible(i)) ctx.fillRect(sx[i] - size / 2, sy[i] - size / 2, size, size);
      }
    }

    // Solved positions.
    ctx.fillStyle = '#fde047';
    for (const i of g.goals) {
      if (visible(i)) ctx.fillRect(sx[i] - size, sy[i] - size, size * 2, size * 2);
    }

    // Moves available from here.
    if (this.current >= 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const j of g.adj[this.current]) {
        ctx.moveTo(sx[this.current], sy[this.current]);
        ctx.lineTo(sx[j], sy[j]);
      }
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      for (const j of g.adj[this.current]) {
        ctx.beginPath();
        ctx.arc(sx[j], sy[j], size * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // The player's path.
    if (this.trail.length > 0) {
      ctx.strokeStyle = '#84cc16';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      this.trail.forEach((node, k) => {
        if (k === 0) ctx.moveTo(sx[node], sy[node]);
        else ctx.lineTo(sx[node], sy[node]);
      });
      ctx.stroke();
      ctx.fillStyle = '#84cc16';
      for (const node of this.trail) {
        ctx.beginPath();
        ctx.arc(sx[node], sy[node], size * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this.hintNode >= 0) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 160);
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx[this.hintNode], sy[this.hintNode], 7 + pulse * 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.selectedNode >= 0) {
      const i = this.selectedNode;
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sx[i], sy[i], 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx[i] - 15, sy[i]);
      ctx.lineTo(sx[i] - 6, sy[i]);
      ctx.moveTo(sx[i] + 6, sy[i]);
      ctx.lineTo(sx[i] + 15, sy[i]);
      ctx.moveTo(sx[i], sy[i] - 15);
      ctx.lineTo(sx[i], sy[i] - 6);
      ctx.moveTo(sx[i], sy[i] + 6);
      ctx.lineTo(sx[i], sy[i] + 15);
      ctx.stroke();
    }

    if (this.current >= 0) {
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx[this.current], sy[this.current], 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}
