import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SoundService } from '../shared/services/sound/sound.service';
import { ClickColorGameComponent } from './click-color.component';
import { SWATCHES } from './color-reaction.engine';

describe('ClickColorGameComponent', () => {
  let component: ClickColorGameComponent;
  let fixture: ComponentFixture<ClickColorGameComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ClickColorGameComponent],
      providers: [provideRouter([]), { provide: SoundService, useValue: jasmine.createSpyObj('SoundService', ['playCorrect', 'playWrong', 'toggleMute'], { muted: () => false }) }],
    }).compileComponents();
    fixture = TestBed.createComponent(ClickColorGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => component.ngOnDestroy());

  it('scores a hit and changes the target', () => {
    component.start();
    const t = component.target()!;
    component.tap(t);
    expect(component.score()).toBe(1);
    expect(component.target()).not.toBe(t);
  });

  it('does not score a miss', () => {
    component.start();
    component.tap(SWATCHES.find((s) => s !== component.target())!);
    expect(component.score()).toBe(0);
  });

  it('ends after the round and saves the best', fakeAsync(() => {
    const now = spyOn(performance, 'now').and.returnValue(0);
    component.start();
    component.tap(component.target()!);
    now.and.returnValue(61_000);
    tick(200);
    expect(component.phase()).toBe('over');
    expect(component.best()).toBe(1);
    expect(component.newBest()).toBeTrue();
  }));
});
