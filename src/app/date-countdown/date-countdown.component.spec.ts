import { Location } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { DateCountdownComponent } from './date-countdown.component';

describe('DateCountdownComponent', () => {
  let fixture: ComponentFixture<DateCountdownComponent>;
  let component: DateCountdownComponent;
  let location: Location;

  function create(query: Record<string, string>): void {
    TestBed.configureTestingModule({
      imports: [DateCountdownComponent],
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { queryParams: query, routeConfig: { path: 'date-countdown' } } } }],
    });
    fixture = TestBed.createComponent(DateCountdownComponent);
    component = fixture.componentInstance;
    location = TestBed.inject(Location);
    fixture.detectChanges();
  }

  it('starts empty without a date', () => {
    create({});
    expect(component.left()).toBeNull();
  });

  it('opens a shared countdown from the URL', () => {
    create({ date: '2099-01-01', title: 'Party' });
    expect(component.setup().title).toBe('Party');
    expect(component.left()?.isPast).toBeFalse();
  });

  it('counts up for a past date', () => {
    create({ date: '2000-01-01' });
    expect(component.left()?.isPast).toBeTrue();
  });

  it('writes changes to the address bar', () => {
    create({});
    const spy = spyOn(location, 'replaceState');
    component.patch({ kind: 'weekday', day: 'Monday', time: '09:00' });
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith('/date-countdown', 'day=Monday&time=09%3A00');
  });

  it('keeps the default name when the new one is blank', () => {
    create({});
    component.editing.set(true);
    component.saveTitle('   ');
    expect(component.setup().title).toBe('Countdown');
  });
});
