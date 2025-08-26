import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeftToLiveGameComponent } from './left-to-live.component';

describe('LeftToLiveGameComponent', () => {
  let component: LeftToLiveGameComponent;
  let fixture: ComponentFixture<LeftToLiveGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeftToLiveGameComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(LeftToLiveGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
