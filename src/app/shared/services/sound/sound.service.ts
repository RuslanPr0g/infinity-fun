import { Injectable, inject, signal } from '@angular/core';
import { LocalStorageConst } from '../../../core/constants/local-storage.const';
import { LocalStorageService } from '../local-storage/local-storage.service';

/** Right / wrong sounds for every game, with one site-wide mute (toggled from the game shell). */
@Injectable({
  providedIn: 'root',
})
export class SoundService {
  private readonly storage = inject(LocalStorageService);
  private readonly cache = new Map<string, HTMLAudioElement>();

  readonly muted = signal<boolean>(this.storage.getItem<boolean>(LocalStorageConst.SoundMuted) ?? false);

  toggleMute(): void {
    this.muted.update((m) => !m);
    this.storage.setItem(LocalStorageConst.SoundMuted, this.muted());
  }

  playCorrect(): void {
    this.play('sounds/correct.mp3');
  }

  playWrong(): void {
    this.play('sounds/wrong.mp3');
  }

  private play(src: string): void {
    if (this.muted() || typeof Audio === 'undefined') {
      return;
    }
    let audio = this.cache.get(src);
    if (!audio) {
      audio = new Audio(src);
      this.cache.set(src, audio);
    }
    audio.currentTime = 0;
    audio.play().catch(() => undefined);
  }
}
