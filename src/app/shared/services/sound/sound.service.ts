import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SoundService {
  playCorrect(): void {
    const audio = new Audio('sounds/correct.mp3');
    this.playSound(audio);
  }

  playWrong(): void {
    const audio = new Audio('sounds/wrong.mp3');
    this.playSound(audio);
  }

  playSound(audio: HTMLAudioElement): void {
    audio.load();
    audio
      .play()
      .catch((error: any) => console.error('Error playing sound:', error));
  }
}
