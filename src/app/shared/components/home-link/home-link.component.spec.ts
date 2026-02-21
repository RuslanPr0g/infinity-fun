import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeLinkComponent } from './home-link.component';

describe('HomeLinkComponent', () => {
  let component: HomeLinkComponent;
  let fixture: ComponentFixture<HomeLinkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeLinkComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeLinkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
