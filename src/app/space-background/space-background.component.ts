import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

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
})
export class SpaceBackgroundComponent implements OnInit {
  stars: Star[] = [];
  shootingStars: ShootingStar[] = [];

  ngOnInit(): void {
    this.generateStars(200);
    this.generateShootingStars(5);
  }

  generateStars(count: number) {
    for (let i = 0; i < count; i++) {
      this.stars.push({
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 20 + 10,
        delay: Math.random() * 45,
      });
    }
  }

  generateShootingStars(count: number) {
    for (let i = 0; i < count; i++) {
      this.shootingStars.push({
        top: Math.random() * 50,
        left: Math.random() * 100,
        duration: Math.random() * 10 + 15,
        delay: Math.random() * 56,
      });
    }
  }
}
