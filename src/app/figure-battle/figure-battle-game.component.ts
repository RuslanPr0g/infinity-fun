import {
  AfterViewInit, Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewEncapsulation,
  computed, inject, viewChild,
} from '@angular/core';
import { ArmoryScreenComponent } from './components/armory-screen.component';
import { BattleHudComponent, PowersBarComponent } from './components/battle-hud.component';
import { BriefModalComponent } from './components/brief-modal.component';
import { DeployBottomComponent, DeployTopComponent } from './components/deploy-hud.component';
import { LevelsScreenComponent } from './components/levels-screen.component';
import { MenuScreenComponent } from './components/menu-screen.component';
import { ResultModalComponent } from './components/result-modal.component';
import { Renderer } from './engine/renderer';
import { FigureBattleGameService } from './services/figure-battle-game.service';

/**
 * Total Figure Battle Simulator. The battlefield is one full-screen canvas driven by a
 * requestAnimationFrame loop outside Angular's zone; menus and HUDs are HTML overlays.
 */
@Component({
  selector: 'app-figure-battle-game',
  standalone: true,
  imports: [
    MenuScreenComponent, LevelsScreenComponent, DeployTopComponent, DeployBottomComponent,
    BattleHudComponent, PowersBarComponent, ResultModalComponent, BriefModalComponent, ArmoryScreenComponent,
  ],
  encapsulation: ViewEncapsulation.None,
  styleUrl: './figure-battle-game.component.scss',
  template: `
    <div class="fb" #root (mousedown)="keepFocus($event)" (click)="uiClick($event)" (mouseover)="uiHover($event)">
      <canvas #canvas class="fb-canvas"></canvas>
      <div class="fb-layout">
        <div class="fb-top" #top>
          @if (hud() === 'deploy') {
            <fb-deploy-top />
          } @else if (hud() === 'battle') {
            <fb-battle-hud [class.fb-hidden]="game.screen() === 'result'" />
          }
        </div>
        <div class="fb-stage" #stage></div>
        <div class="fb-bottom" #bottom>
          @if (hud() === 'deploy') {
            <fb-deploy-bottom />
          } @else if (game.screen() === 'battle') {
            <fb-powers />
          }
        </div>
      </div>

      @switch (game.screen()) {
        @case ('menu') { <fb-menu /> }
        @case ('levels') { <fb-levels /> }
        @case ('armory') { <fb-armory /> }
        @case ('result') { <fb-result /> }
      }
      @if (game.screen() === 'deploy' && game.briefOpen()) {
        <fb-brief />
      }
      @if (game.toast(); as t) {
        @for (x of [t]; track x.id) {
          <div class="fb-toast fb-panel">{{ x.text }}</div>
        }
      }
    </div>
  `,
})
export class FigureBattleGameComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly game = inject(FigureBattleGameService);
  private readonly zone = inject(NgZone);

  readonly hud = computed(() => {
    const s = this.game.screen();
    return s === 'deploy' ? 'deploy' : s === 'battle' || s === 'result' ? 'battle' : 'none';
  });

  private readonly rootEl = viewChild.required<ElementRef<HTMLElement>>('root');
  private readonly canvasEl = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly topEl = viewChild.required<ElementRef<HTMLElement>>('top');
  private readonly stageEl = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly bottomEl = viewChild.required<ElementRef<HTMLElement>>('bottom');

  private renderer!: Renderer;
  private raf = 0;
  private last = 0;
  private ro?: ResizeObserver;
  private rootX = 0;
  private rootY = 0;
  private pointerType = 'mouse';
  private lastHover: Element | null = null;
  private readonly cleanup: (() => void)[] = [];

  ngOnInit(): void {
    const g = this.game;
    // Coming back to the route keeps a running mission; the menus just need the demo battle going.
    if (g.screen() === 'menu') {
      g.showMenu();
    } else if (g.screen() === 'levels') {
      g.showLevels();
    }
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasEl().nativeElement;
    this.renderer = new Renderer(canvas);
    if (window.matchMedia?.('(pointer: coarse)').matches) {
      this.game.bf.fxCap = 1200;
    }
    this.game.panOf = (x, y) => this.renderer.panOf(x, y);

    this.zone.runOutsideAngular(() => {
      this.ro = new ResizeObserver(() => this.layout());
      for (const el of [this.rootEl(), this.topEl(), this.stageEl(), this.bottomEl()]) {
        this.ro.observe(el.nativeElement);
      }
      this.layout();
      this.listen(canvas, 'pointerdown', (e) => this.onDown(e as PointerEvent));
      this.listen(canvas, 'pointermove', (e) => this.onMove(e as PointerEvent));
      this.listen(canvas, 'pointerup', (e) => this.onUp(e as PointerEvent));
      this.listen(canvas, 'pointercancel', (e) => this.onUp(e as PointerEvent));
      this.listen(canvas, 'pointerleave', () => {
        if (this.game.bf.paintMode === 0) {
          this.game.bf.mouse = null;
        }
      });
      this.listen(canvas, 'contextmenu', (e) => e.preventDefault());
      const root = this.rootEl().nativeElement;
      this.listen(root, 'pointerdown', (e) => {
        this.pointerType = (e as PointerEvent).pointerType;
        this.game.sfx.unlock();
      }, true);
      this.listen(root, 'pointermove', (e) => (this.pointerType = (e as PointerEvent).pointerType), true);
      this.raf = requestAnimationFrame((t) => this.loop(t));
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.cleanup.forEach((f) => f());
  }

  private listen(el: EventTarget, type: string, fn: (e: Event) => void, capture = false): void {
    el.addEventListener(type, fn, { capture, passive: type !== 'contextmenu' });
    this.cleanup.push(() => el.removeEventListener(type, fn, { capture }));
  }

  private layout(): void {
    const root = this.rootEl().nativeElement.getBoundingClientRect();
    const st = this.stageEl().nativeElement.getBoundingClientRect();
    this.rootX = root.left;
    this.rootY = root.top;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.resize(root.width, root.height, dpr, { x: st.left - root.left, y: st.top - root.top, w: st.width, h: st.height });
  }

  private loop(t: number): void {
    const dt = this.last ? Math.min(0.1, (t - this.last) / 1000) : 1 / 60;
    this.last = t;
    const bf = this.game.bf;
    bf.frame(dt);
    this.renderer.render(bf, this.pointerType !== 'touch');
    this.raf = requestAnimationFrame((n) => this.loop(n));
  }

  private toWorld(e: PointerEvent): { x: number; y: number } {
    return this.renderer.screenToWorld(e.clientX - this.rootX, e.clientY - this.rootY);
  }

  private onDown(e: PointerEvent): void {
    if (!e.isPrimary) {
      return;
    }
    this.pointerType = e.pointerType;
    const p = this.toWorld(e);
    if (this.game.bf.deploying) {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    }
    this.game.bf.pointerDown(p.x, p.y, e.pointerType === 'mouse' ? e.button : 0);
  }

  private onMove(e: PointerEvent): void {
    if (!e.isPrimary) {
      return;
    }
    this.pointerType = e.pointerType;
    const p = this.toWorld(e);
    this.game.bf.pointerMove(p.x, p.y);
  }

  private onUp(e: PointerEvent): void {
    if (!e.isPrimary) {
      return;
    }
    this.game.bf.pointerUp();
    if (e.pointerType !== 'mouse') {
      this.game.bf.mouse = null;
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      return;
    }
    this.game.sfx.unlock();
    if (this.game.handleKey(e)) {
      e.preventDefault();
    }
  }

  /** Buttons never take focus, so Space/Enter always reach the game hotkeys (like the original). */
  keepFocus(e: MouseEvent): void {
    if ((e.target as Element).closest('button')) {
      e.preventDefault();
    }
  }

  uiClick(e: MouseEvent): void {
    const b = (e.target as Element).closest('button');
    if (b && !b.disabled) {
      this.game.uiClick();
    }
  }

  uiHover(e: MouseEvent): void {
    const b = (e.target as Element).closest('button');
    if (b !== this.lastHover) {
      this.lastHover = b;
      if (b && !b.disabled && this.pointerType === 'mouse') {
        this.game.uiHover();
      }
    }
  }
}
