import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LeftToLiveGameComponent } from './left-to-live.component';

describe('LeftToLiveGameComponent', () => {
  let component: LeftToLiveGameComponent;
  let fixture: ComponentFixture<LeftToLiveGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LeftToLiveGameComponent], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(LeftToLiveGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => component.ngOnDestroy());

  it('counts months between the two ages', () => {
    component.setAge(40);
    component.setUntil(50);
    expect(component.data().total).toBe(120);
  });

  it('pushes "live until" up when the age passes it', () => {
    component.setUntil(60);
    component.setAge(70);
    expect(component.until()).toBe(71);
    expect(component.data().total).toBe(12);
  });
});
