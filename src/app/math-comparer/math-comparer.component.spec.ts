import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MathComparerComponent } from './math-comparer.component';

describe('MathComparerComponent', () => {
  let component: MathComparerComponent;
  let fixture: ComponentFixture<MathComparerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MathComparerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MathComparerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
