import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClickColorGameComponent } from './click-color.component';

describe('ClickColorGameComponent', () => {
  let component: ClickColorGameComponent;
  let fixture: ComponentFixture<ClickColorGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClickColorGameComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ClickColorGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
