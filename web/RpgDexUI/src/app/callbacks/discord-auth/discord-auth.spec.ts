import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscordAuth } from './discord-auth';

describe('DiscordAuth', () => {
  let component: DiscordAuth;
  let fixture: ComponentFixture<DiscordAuth>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiscordAuth],
    }).compileComponents();

    fixture = TestBed.createComponent(DiscordAuth);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
