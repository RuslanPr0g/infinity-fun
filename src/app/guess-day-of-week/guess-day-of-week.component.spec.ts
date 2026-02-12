import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuessDayOfWeekComponent } from './guess-day-of-week.component';

describe('GuessDayOfWeekComponent', () => {
  let component: GuessDayOfWeekComponent;
  let fixture: ComponentFixture<GuessDayOfWeekComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuessDayOfWeekComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GuessDayOfWeekComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
