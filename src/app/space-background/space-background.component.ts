import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

interface Star {
  top: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
}

interface ShootingStar {
  top: number;
  left: number;
  duration: number;
  delay: number;
}

@Component({
  selector: 'app-space-background',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './space-background.component.html',
  styleUrls: ['./space-background.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpaceBackgroundComponent implements OnInit {
  stars: Star[] = [];
  shootingStars: ShootingStar[] = [];

  ngOnInit(): void {
    this.stars = this.generateStars(70);
    this.shootingStars = this.generateShootingStars(4);
  }

  generateStars(count: number): Star[] {
    const stars: Star[] = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 20 + 10,
        delay: Math.random() * 45,
      });
    }
    return stars;
  }

  generateShootingStars(count: number): ShootingStar[] {
    const shootingStars: ShootingStar[] = [];
    for (let i = 0; i < count; i++) {
      shootingStars.push({
        top: Math.random() * 50,
        left: Math.random() * 100,
        duration: Math.random() * 10 + 15,
        delay: Math.random() * 56,
      });
    }
    return shootingStars;
  }
}
