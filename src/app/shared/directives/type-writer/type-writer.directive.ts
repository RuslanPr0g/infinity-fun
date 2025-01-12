import { Directive, ElementRef, Input, OnInit } from '@angular/core';

@Directive({
  selector: '[appTypewriter]',
})
export class TypewriterDirective implements OnInit {
  @Input() text: string = '';
  @Input() speed: number = 100;

  constructor(private el: ElementRef) {}

  ngOnInit() {
    this.typeText();
  }

  typeText() {
    let index = 0;
    const element = this.el.nativeElement;
    element.innerHTML = '';

    const typeInterval = setInterval(() => {
      element.innerHTML += this.text.charAt(index);
      index++;

      if (index === this.text.length) {
        clearInterval(typeInterval);
      }
    }, this.speed);
  }
}
