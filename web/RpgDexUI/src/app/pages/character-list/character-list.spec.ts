import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CharacterList } from './character-list';

describe('CharacterList', () => {
  let component: CharacterList;
  let fixture: ComponentFixture<CharacterList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterList],
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
