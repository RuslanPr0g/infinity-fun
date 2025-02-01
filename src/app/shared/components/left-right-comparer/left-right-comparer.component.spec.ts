import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeftRightComparerComponent } from './left-right-comparer.component';

describe('LeftRightComparerComponent', () => {
  let component: LeftRightComparerComponent;
  let fixture: ComponentFixture<LeftRightComparerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeftRightComparerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeftRightComparerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
