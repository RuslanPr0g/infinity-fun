import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SoundService } from '../shared/services/sound/sound.service';
import { RejectCookiesGameComponent } from './reject-cookies.component';

describe('RejectCookiesGameComponent', () => {
  let fixture: ComponentFixture<RejectCookiesGameComponent>;
  let component: RejectCookiesGameComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RejectCookiesGameComponent],
      providers: [provideRouter([]), { provide: SoundService, useValue: jasmine.createSpyObj('SoundService', ['playCorrect', 'playWrong', 'toggleMute'], { muted: () => false }) }],
    }).compileComponents();
    fixture = TestBed.createComponent(RejectCookiesGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts on the banner and loses on accept', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(component.store.step()).toBe('banner');
    (el.querySelector('rc-consent .big') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.store.step()).toBe('lost');
    expect(el.textContent).toContain('They got you');
  });

  it('goes to the details form once every option is off', () => {
    component.store.go('prefs');
    component.store.options.set(component.store.options().map(() => false));
    fixture.detectChanges();
    component.store.go(component.store.options().some((v) => v) ? 'lost' : 'details');
    expect(component.store.step()).toBe('details');
  });

  it('play again starts a fresh round', () => {
    component.store.go('won');
    component.again();
    expect(component.store.step()).toBe('banner');
    expect(component.store.options().every((v) => v)).toBeTrue();
  });
});
