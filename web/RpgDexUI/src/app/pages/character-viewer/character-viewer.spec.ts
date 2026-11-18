import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CharacterViewer } from './character-viewer';

describe('CharacterViewer', () => {
  let component: CharacterViewer;
  let fixture: ComponentFixture<CharacterViewer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterViewer],
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterViewer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
