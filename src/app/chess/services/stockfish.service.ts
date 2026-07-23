/**
 * Manages the Stockfish 18 WASM Web Worker lifecycle and exposes a clean
 * async UCI interface. Loaded lazily — the worker is only created when
 * init() is first called (triggered by StockfishLoaderComponent).
 *
 * UCI handshake:  uci → uciok → isready → readyok → ready
 * Per-move flow:  position fen <fen> → go movetime <ms> → bestmove <move>
 */

import { Injectable, signal, inject } from '@angular/core';
import { APP_BASE_HREF } from '@angular/common';

const DEFAULT_THINK_MS = 400;

interface PendingRequest {
  resolve: (move: string | null) => void;
  reject: (err: unknown) => void;
}

@Injectable({ providedIn: 'root' })
export class StockfishService {
  /** True once uciok + readyok handshake completes. */
  readonly isReady = signal(false);

  private worker: Worker | null = null;
  private initResolve: (() => void) | null = null;
  private initReject: ((err: unknown) => void) | null = null;
  private pendingMove: PendingRequest | null = null;
  /** Queue of getBestMove callers waiting while a request is in flight. */
  private queue: Array<{ fen: string; thinkMs: number; resolve: (m: string | null) => void }> = [];
  private busy = false;
  private uciReady = false;
  private readonly baseHref = inject(APP_BASE_HREF, { optional: true }) || '/';

  private getWorkerPath(): string {
    // Remove trailing slash to avoid double slashes when appending /stockfish/
    const base = this.baseHref === '/' ? '' : this.baseHref.replace(/\/$/, '');
    return `${base}/stockfish/stockfish-18-lite-single.js`;
  }

  /**
   * Initialise the Web Worker and complete the UCI handshake.
   * Safe to call multiple times — resolves immediately if already ready.
   */
  init(): Promise<void> {
    if (this.isReady()) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      this.initResolve = resolve;
      this.initReject = reject;

      try {
        this.worker = new Worker(this.getWorkerPath());
      } catch (e) {
        reject(e);
        return;
      }

      this.worker.onmessage = (event: MessageEvent<string>) => {
        this.handleMessage(event.data);
      };

      this.worker.onerror = (event) => {
        const err = new Error(`Stockfish worker error: ${event.message}`);
        this.initReject?.(err);
        this.pendingMove?.reject(err);
        this.initReject = null;
        this.pendingMove = null;
      };

      this.send('uci');
    });
  }

  /**
   * Request the best move for the given FEN. Queues calls automatically
   * so only one UCI request is in flight at a time.
   */
  getBestMove(fen: string, thinkMs = DEFAULT_THINK_MS): Promise<string | null> {
    return new Promise((resolve) => {
      this.queue.push({ fen, thinkMs, resolve });
      this.drainQueue();
    });
  }

  /**
   * Check whether the WASM file is already in the browser HTTP cache.
   * Used by the loader component to decide whether to show the 3-second wait.
   */
  async isAlreadyCached(): Promise<boolean> {
    if (!('caches' in globalThis)) return false;
    try {
      const response = await caches.match(this.getWorkerPath());
      return response !== undefined;
    } catch {
      return false;
    }
  }

  /** Terminate the worker and reset all state. */
  destroy(): void {
    this.worker?.terminate();
    this.worker = null;
    this.isReady.set(false);
    this.uciReady = false;
    this.busy = false;
    // Resolve any in-flight pending request with null so it doesn't hang.
    const pending = this.pendingMove;
    this.pendingMove = null;
    pending?.resolve(null);
    this.initResolve = null;
    this.initReject = null;
    // Drain remaining queue with null so callers don't hang.
    for (const item of this.queue) item.resolve(null);
    this.queue = [];
  }

  private send(cmd: string): void {
    this.worker?.postMessage(cmd);
  }

  private handleMessage(line: string): void {
    if (line === 'uciok') {
      this.send('isready');
      return;
    }

    if (line === 'readyok') {
      this.uciReady = true;
      this.isReady.set(true);
      this.initResolve?.();
      this.initResolve = null;
      this.initReject = null;
      this.drainQueue();
      return;
    }

    if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      // "bestmove (none)" or "bestmove 0000" means no move
      const move = parts[1] && parts[1] !== '(none)' && parts[1] !== '0000'
        ? parts[1]
        : null;
      const pending = this.pendingMove;
      this.pendingMove = null;
      this.busy = false;
      pending?.resolve(move);
      this.drainQueue();
    }
  }

  private drainQueue(): void {
    if (this.busy || !this.uciReady || this.queue.length === 0) return;
    const next = this.queue.shift()!;
    this.busy = true;
    this.pendingMove = {
      resolve: next.resolve,
      reject: () => { next.resolve(null); },
    };
    this.send(`position fen ${next.fen}`);
    this.send(`go movetime ${next.thinkMs}`);
  }
}
