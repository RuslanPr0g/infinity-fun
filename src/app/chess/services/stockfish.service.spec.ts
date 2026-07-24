/**
 * Unit tests for StockfishService.
 * The Web Worker is fully mocked — no actual WASM is loaded.
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { StockfishService } from './stockfish.service';

// ─── Fake Worker ──────────────────────────────────────────────────────────────

class FakeWorker {
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;
  readonly sent: string[] = [];
  /** When true, auto-responds to UCI commands. */
  autoRespond = true;

  postMessage(msg: string): void {
    this.sent.push(msg);
    if (!this.autoRespond) return;
    setTimeout(() => {
      if (msg === 'uci') this.emit('uciok');
      else if (msg === 'isready') this.emit('readyok');
      else if (msg.startsWith('go movetime')) {
        this.emit('info depth 1 score cp 30');
        this.emit('bestmove e2e4');
      }
    }, 0);
  }

  emit(line: string): void {
    this.onmessage?.({ data: line });
  }

  terminate(): void {
    this.terminated = true;
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StockfishService', () => {
  let service: StockfishService;
  let fake: FakeWorker;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StockfishService);
    fake = new FakeWorker();
    spyOn(window, 'Worker').and.returnValue(fake as unknown as Worker);
  });

  afterEach(() => {
    service.destroy();
  });

  it('completes the UCI handshake and sets isReady to true', async () => {
    expect(service.isReady()).toBeFalse();
    await service.init();
    expect(service.isReady()).toBeTrue();
  });

  it('resolves init() immediately when already ready (no second Worker created)', async () => {
    await service.init();
    const workerSpy = window.Worker as unknown as jasmine.Spy;
    const callsBefore = workerSpy.calls.count();
    await service.init();
    expect(workerSpy.calls.count()).toBe(callsBefore);
  });

  it('sends uci then isready in order during init', async () => {
    await service.init();
    expect(fake.sent[0]).toBe('uci');
    expect(fake.sent[1]).toBe('isready');
  });

  it('getBestMove sends position fen + go movetime and returns the move', async () => {
    await service.init();
    const move = await service.getBestMove(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1',
      100,
    );
    expect(move).toBe('e2e4');
    expect(fake.sent.some(cmd => cmd.startsWith('position fen'))).toBeTrue();
    expect(fake.sent.some(cmd => cmd.startsWith('go movetime 100'))).toBeTrue();
  });

  it('queues concurrent getBestMove calls and delivers both results', async () => {
    await service.init();
    const [m1, m2] = await Promise.all([
      service.getBestMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1', 50),
      service.getBestMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b - - 0 1', 50),
    ]);
    expect(m1).toBe('e2e4');
    expect(m2).toBe('e2e4');
  });

  it('returns null for bestmove (none)', async () => {
    fake.autoRespond = false;
    // Custom responder that sends (none).
    fake.postMessage = (msg: string) => {
      fake.sent.push(msg);
      setTimeout(() => {
        if (msg === 'uci') fake.emit('uciok');
        else if (msg === 'isready') fake.emit('readyok');
        else if (msg.startsWith('go movetime')) fake.emit('bestmove (none)');
      }, 0);
    };
    await service.init();
    const move = await service.getBestMove('8/8/8/8/8/8/8/8 w - - 0 1', 50);
    expect(move).toBeNull();
  });

  it('returns null for bestmove 0000', async () => {
    fake.autoRespond = false;
    fake.postMessage = (msg: string) => {
      fake.sent.push(msg);
      setTimeout(() => {
        if (msg === 'uci') fake.emit('uciok');
        else if (msg === 'isready') fake.emit('readyok');
        else if (msg.startsWith('go')) fake.emit('bestmove 0000');
      }, 0);
    };
    await service.init();
    const move = await service.getBestMove('8/8/8/8/8/8/8/8 w - - 0 1', 50);
    expect(move).toBeNull();
  });

  it('destroy() terminates the worker and resets isReady', async () => {
    await service.init();
    expect(service.isReady()).toBeTrue();
    service.destroy();
    expect(fake.terminated).toBeTrue();
    expect(service.isReady()).toBeFalse();
  });

  it('destroy() resolves queued getBestMove calls with null synchronously', async () => {
    // Don't init — just call getBestMove and destroy before the worker responds.
    await service.init();

    // Block responses so the move stays in the queue.
    fake.autoRespond = false;
    fake.postMessage = (msg: string) => { fake.sent.push(msg); };

    const movePromise = service.getBestMove('8/8/8/8/8/8/8/8 w - - 0 1', 5000);
    // destroy() immediately resolves all queued calls with null.
    service.destroy();
    const result = await movePromise;
    expect(result).toBeNull();
  });

  describe('debug logging', () => {
    afterEach(() => {
      delete (globalThis as any).STOCKFISH_DEBUG;
    });

    it('stays silent by default (no globalThis override, no query param)', async () => {
      spyOn(console, 'log');
      await service.init();
      expect(console.log).not.toHaveBeenCalled();
    });

    it('logs once globalThis.STOCKFISH_DEBUG is set, without needing a fresh service instance', async () => {
      spyOn(console, 'log');
      (globalThis as any).STOCKFISH_DEBUG = true;
      await service.init();
      expect(console.log).toHaveBeenCalledWith('[Stockfish →] uci');
    });
  });
});
