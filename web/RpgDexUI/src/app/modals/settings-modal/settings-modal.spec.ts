import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsModal } from './settings-modal';

describe('SettingsModal', () => {
  let component: SettingsModal;
  let fixture: ComponentFixture<SettingsModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsModal],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
