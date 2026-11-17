import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PeriodicTableService } from '../shared/services/periodic-table/periodic-table.service';
import { SoundService } from '../shared/services/sound/sound.service';
import { PeriodicElement } from './models/periodic.model';
import { PeriodicGameComponent } from './periodic-game.component';

const els: PeriodicElement[] = ['Hydrogen', 'Helium', 'Lithium', 'Carbon', 'Oxygen'].map((name, i) => ({ name, symbol: name.slice(0, 2), number: i + 1 }));

describe('PeriodicGameComponent', () => {
  let component: PeriodicGameComponent;
  let fixture: ComponentFixture<PeriodicGameComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PeriodicGameComponent],
      providers: [
        provideRouter([]),
        { provide: PeriodicTableService, useValue: { getElements: () => of(els) } },
        { provide: SoundService, useValue: jasmine.createSpyObj('SoundService', ['playCorrect', 'playWrong', 'toggleMute'], { muted: () => false }) },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PeriodicGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads elements and shows four options', () => {
    expect(component.load()).toBe('ready');
    expect(component.options().length).toBe(4);
  });

  it('scores a right typed name and moves on', fakeAsync(() => {
    component.setMode('type');
    const first = component.current()!;
    component.typed.set(first.name.toUpperCase());
    component.check();
    expect(component.streak()).toBe(1);
    tick(1000);
    expect(component.current()).not.toBe(first);
  }));

  it('show answer counts as a miss', fakeAsync(() => {
    component.pick(component.current()!);
    tick(1000);
    component.giveUp();
    expect(component.streak()).toBe(0);
    expect(component.best()).toBe(1);
    tick(2000);
  }));
});
