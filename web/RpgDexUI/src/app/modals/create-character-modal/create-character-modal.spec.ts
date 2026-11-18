import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateCharacterModal } from './create-character-modal';

describe('CreateCharacterModal', () => {
  let component: CreateCharacterModal;
  let fixture: ComponentFixture<CreateCharacterModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateCharacterModal],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateCharacterModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
