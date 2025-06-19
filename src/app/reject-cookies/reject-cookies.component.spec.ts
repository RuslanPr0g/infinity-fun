import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RejectCookiesGameComponent } from './reject-cookies.component';

describe('RejectCookiesGameComponent', () => {
  let component: RejectCookiesGameComponent;
  let fixture: ComponentFixture<RejectCookiesGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RejectCookiesGameComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(RejectCookiesGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
