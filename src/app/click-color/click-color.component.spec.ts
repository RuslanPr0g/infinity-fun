import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClickColorComponent } from './click-color.component';

describe('ClickColorComponent', () => {
  let component: ClickColorComponent;
  let fixture: ComponentFixture<ClickColorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClickColorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClickColorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
