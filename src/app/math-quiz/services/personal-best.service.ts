import { Injectable } from '@angular/core';
import { LocalStorageService } from '../../shared/services/local-storage/local-storage.service';
import { Difficulty, GameMode, PersonalBestRecord } from '../models/math-quiz.models';

@Injectable({ providedIn: 'root' })
export class PersonalBestService {
  constructor(private storage: LocalStorageService) {}

  private key(mode: GameMode, difficulty: Difficulty): string {
    return `math-quiz-best-${mode}-${difficulty}`;
  }

  getPersonalBest(mode: GameMode, difficulty: Difficulty): number {
    const record = this.storage.getItem<PersonalBestRecord>(this.key(mode, difficulty));
    return record ? record.score : 0;
  }

  setPersonalBest(mode: GameMode, difficulty: Difficulty, score: number): void {
    const record: PersonalBestRecord = {
      score,
      achievedAt: new Date().toISOString(),
    };
    this.storage.setItem<PersonalBestRecord>(this.key(mode, difficulty), record);
  }
}
