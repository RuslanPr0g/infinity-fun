import { TestBed } from '@angular/core/testing';
import { EasyBot } from '../engine/bots/easy-bot';
import { parseSquare } from '../engine/core/board';
import { MoveIntent, PASS_INTENT } from '../engine/variant';
import { ChessSessionService } from './chess-session.service';

function move(from: string, to: string): MoveIntent {
  return { kind: 'move', from: parseSquare(from), to: parseSquare(to) };
}

describe('ChessSessionService', () => {
  let service: ChessSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChessSessionService);
    service.reset();
  });

  it('starts a hotseat game in the entry phase with White entering', () => {
    service.start({ modeId: 'simultaneous', opponent: 'hotseat' });
    expect(service.phase()).toBe('entry');
    expect(service.entryColor()).toBe('white');
    expect(service.position()?.round).toBe(1);
    expect(service.status().outcome).toBe('ongoing');
  });

  it('drives the hotseat round lifecycle: entry → handoff → entry → reveal → entry', () => {
    service.start({ modeId: 'simultaneous', opponent: 'hotseat' });

    service.confirmIntent(move('e2', 'e4'));
    expect(service.phase()).toBe('handoff');
    // The board is unchanged while the pending move is hidden.
    expect(service.position()?.round).toBe(1);

    service.continueHandoff();
    expect(service.phase()).toBe('entry');
    expect(service.entryColor()).toBe('black');

    service.confirmIntent(move('e7', 'e5'));
    expect(service.phase()).toBe('reveal');
    expect(service.lastResolution()?.round).toBe(1);
    expect(service.moveLog().length).toBe(1);
    expect(service.moveLog()[0].descriptions.length).toBe(2);

    service.completeReveal();
    expect(service.phase()).toBe('entry');
    expect(service.entryColor()).toBe('white');
    expect(service.position()?.round).toBe(2);
  });

  it('records captures in the capturing side\'s tray', () => {
    service.start({ modeId: 'simultaneous', opponent: 'hotseat' });

    service.confirmIntent(move('e2', 'e4'));
    service.continueHandoff();
    service.confirmIntent(move('d7', 'd5'));
    service.completeReveal();

    service.confirmIntent(move('e4', 'd5'));
    service.continueHandoff();
    service.confirmIntent(move('a7', 'a6'));

    expect(service.capturedByWhite()).toEqual(['pawn']);
    expect(service.capturedByBlack()).toEqual([]);
  });

  it('runs a bot round without a handoff and returns entry to the human', () => {
    service.start({
      modeId: 'simultaneous',
      opponent: 'bot',
      botId: 'easy',
      humanColor: 'white',
    });
    expect(service.entryColor()).toBe('white');

    service.confirmIntent(move('e2', 'e4'));
    expect(service.phase()).toBe('reveal');
    expect(service.moveLog().length).toBe(1);

    service.completeReveal();
    expect(service.phase()).toBe('entry');
    expect(service.entryColor()).toBe('white');
    expect(service.position()?.round).toBe(2);
  });

  it('asks the bot for a move from the start-of-round position, not the post-confirm state', () => {
    const spy = spyOn(EasyBot.prototype, 'chooseMove').and.callThrough();
    service.start({
      modeId: 'simultaneous',
      opponent: 'bot',
      botId: 'easy',
      humanColor: 'white',
    });
    const startBoard = service.position()!.board;

    service.confirmIntent(move('g1', 'f3'));

    expect(spy).toHaveBeenCalledTimes(1);
    const [positionArg, colorArg] = spy.calls.mostRecent().args;
    expect(positionArg.board).toEqual(startBoard);
    expect(positionArg.round).toBe(1);
    expect(colorArg).toBe('black');
  });

  it('lets the human play black against the bot', () => {
    service.start({
      modeId: 'simultaneous',
      opponent: 'bot',
      botId: 'easy',
      humanColor: 'black',
    });
    expect(service.entryColor()).toBe('black');
    service.confirmIntent(move('e7', 'e5'));
    expect(service.phase()).toBe('reveal');
    service.completeReveal();
    expect(service.entryColor()).toBe('black');
  });

  it('exposes legal intents only for the entering color during entry', () => {
    service.start({ modeId: 'simultaneous', opponent: 'hotseat' });
    expect(service.legalIntentsFrom(parseSquare('e2')).length).toBe(2);
    expect(service.legalIntentsFrom(parseSquare('e7')).length).toBe(0);
  });

  it('ends the game on triple pass and moves to game-over after the reveal', () => {
    service.start({ modeId: 'simultaneous', opponent: 'hotseat' });
    for (let i = 0; i < 3; i++) {
      expect(service.status().outcome).toBe('ongoing');
      service.confirmIntent(PASS_INTENT);
      service.continueHandoff();
      service.confirmIntent(PASS_INTENT);
      service.completeReveal();
    }
    expect(service.status()).toEqual({ outcome: 'draw', reason: 'triple-pass' });
    expect(service.phase()).toBe('game-over');
  });

  it('handles resignation: the opponent wins immediately', () => {
    service.start({ modeId: 'simultaneous', opponent: 'hotseat' });
    service.resign('black');
    expect(service.status()).toEqual({
      outcome: 'white-won',
      reason: 'resignation',
    });
    expect(service.phase()).toBe('game-over');
  });

  it('ignores confirms outside the entry phase', () => {
    service.start({ modeId: 'simultaneous', opponent: 'hotseat' });
    service.confirmIntent(move('e2', 'e4'));
    expect(service.phase()).toBe('handoff');
    service.confirmIntent(move('d2', 'd4'));
    expect(service.phase()).toBe('handoff');
    expect(service.moveLog().length).toBe(0);
  });

  it('throws on unknown mode ids', () => {
    expect(() =>
      service.start({ modeId: 'not-a-mode', opponent: 'hotseat' }),
    ).toThrow();
  });

  it('resets cleanly', () => {
    service.start({ modeId: 'simultaneous', opponent: 'hotseat' });
    service.confirmIntent(move('e2', 'e4'));
    service.reset();
    expect(service.phase()).toBe('idle');
    expect(service.position()).toBeNull();
    expect(service.moveLog()).toEqual([]);
  });
});
