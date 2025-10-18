import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaletteGalleryComponent } from './palette-gallery.component';

describe('PaletteGalleryComponent', () => {
  let component: PaletteGalleryComponent;
  let fixture: ComponentFixture<PaletteGalleryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PaletteGalleryComponent]
    });
    fixture = TestBed.createComponent(PaletteGalleryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
