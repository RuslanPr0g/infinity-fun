import { TestBed } from '@angular/core/testing';
import { Opening } from '../../../chess-openings/models/opening.model';
import { ResultSummaryComponent } from './result-summary.component';

describe('ResultSummaryComponent', () => {
  let component: ResultSummaryComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ResultSummaryComponent] });
    component = TestBed.createComponent(ResultSummaryComponent).componentInstance;
  });

  it('resolves a blurb for an opening in OPENING_BLURBS', () => {
    component.targetOpening = { id: 'c50', eco: 'C50', name: 'Italian Game', moves: ['e4'] };
    expect(component.blurb()).toContain('oldest recorded openings');
  });

  it('omits the blurb (returns null, not placeholder text) for an opening with no matching entry', () => {
    const unknown: Opening = { id: 'z99', eco: 'Z99', name: 'Some Obscure Opening', moves: ['e4'] };
    component.targetOpening = unknown;
    expect(component.blurb()).toBeNull();
  });
});
