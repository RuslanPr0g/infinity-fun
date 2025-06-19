import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MathComparerGameComponent } from './math-comparer.component';

describe('MathComparerGameComponent', () => {
  let component: MathComparerGameComponent;
  let fixture: ComponentFixture<MathComparerGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MathComparerGameComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(MathComparerGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
