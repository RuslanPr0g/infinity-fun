import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SeaBattleHelperGameComponent } from './seabattle-helper.component';

describe('SeaBattleHelperGameComponent', () => {
  let fixture: ComponentFixture<SeaBattleHelperGameComponent>;
  let component: SeaBattleHelperGameComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SeaBattleHelperGameComponent], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(SeaBattleHelperGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders 100 squares', () => {
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.board .cell').length).toBe(100);
  });

  it('marks, undoes and clears', () => {
    component.onTap(0, 0);
    expect(component.grid()[0][0].state).toBe('miss');
    component.undo();
    expect(component.grid()[0][0].state).toBe('empty');
    component.onTap(3, 3);
    component.clear();
    expect(component.grid()[3][3].state).toBe('empty');
    component.undo();
    expect(component.grid()[3][3].state).toBe('miss');
  });
});
