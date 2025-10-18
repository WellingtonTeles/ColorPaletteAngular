import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncluirFotoComponent } from './incluir-foto.component';

describe('IncluirFotoComponent', () => {
  let component: IncluirFotoComponent;
  let fixture: ComponentFixture<IncluirFotoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [IncluirFotoComponent]
    });
    fixture = TestBed.createComponent(IncluirFotoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
