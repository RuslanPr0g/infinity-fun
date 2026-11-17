import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LeftRightComparerComponent } from './left-right-comparer.component';

describe('LeftRightComparerComponent', () => {
  let fixture: ComponentFixture<LeftRightComparerComponent>;
  let component: LeftRightComparerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LeftRightComparerComponent] }).compileComponents();
    fixture = TestBed.createComponent(LeftRightComparerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('leftText', '2 + 2');
    fixture.componentRef.setInput('rightText', '3 × 3');
    fixture.componentRef.setInput('correctSide', 'right');
    fixture.detectChanges();
  });

  it('shows both sides', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('2 + 2');
    expect(text).toContain('3 × 3');
  });

  it('emits the picked side and flashes it', () => {
    const picks: string[] = [];
    component.picked.subscribe((s) => picks.push(s));
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    const left = buttons[0];
    const right = buttons[1];
    left.click();
    expect(component.flash().left).toBe('bad');
    right.click();
    expect(component.flash().right).toBe('ok');
    expect(picks).toEqual(['left', 'right']);
  });

  it('answers to arrow keys', () => {
    const picks: string[] = [];
    component.picked.subscribe((s) => picks.push(s));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(picks).toEqual(['right', 'left']);
  });
});
