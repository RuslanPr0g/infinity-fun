import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeftToLiveComponent } from './left-to-live.component';

describe('LeftToLiveComponent', () => {
  let component: LeftToLiveComponent;
  let fixture: ComponentFixture<LeftToLiveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeftToLiveComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeftToLiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
