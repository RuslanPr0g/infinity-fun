import { LocalStorageService } from '../../shared/services/local-storage/local-storage.service';
import { ChessSettingsService } from './chess-settings.service';

describe('ChessSettingsService', () => {
  const KEY = 'chess-confirm-moves';

  beforeEach(() => {
    localStorage.removeItem(KEY);
  });

  function createService(): ChessSettingsService {
    return new ChessSettingsService(new LocalStorageService());
  }

  it('asks for move confirmation by default', () => {
    expect(createService().confirmMoves()).toBeTrue();
  });

  it('persists the choice to local storage and restores it on creation', () => {
    const service = createService();
    service.setConfirmMoves(false);
    expect(service.confirmMoves()).toBeFalse();

    const restored = createService();
    expect(restored.confirmMoves()).toBeFalse();

    restored.setConfirmMoves(true);
    expect(createService().confirmMoves()).toBeTrue();
  });
});
