import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LookTipsComponent } from './look-tips.component';

describe('LookTipsComponent', () => {
  let component: LookTipsComponent;
  let fixture: ComponentFixture<LookTipsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LookTipsComponent]
    });
    fixture = TestBed.createComponent(LookTipsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
