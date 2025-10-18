import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ColorPalette } from '../services/api.service';

@Component({
  selector: 'app-palette-gallery',
  templateUrl: './palette-gallery.component.html',
  styleUrls: ['./palette-gallery.component.scss']
})
export class PaletteGalleryComponent {
  @Input() palettes: ColorPalette[] = [];
  @Input() isLoading: boolean = false;
  @Input() showActions: boolean = true;
  @Input() emptyMessage: string = 'Nenhuma paleta encontrada';
  @Input() title: string = 'Paletas';

  @Output() paletteClick = new EventEmitter<ColorPalette>();
  @Output() likeClick = new EventEmitter<ColorPalette>();
  @Output() shareClick = new EventEmitter<ColorPalette>();

  onPaletteClick(palette: ColorPalette) {
    this.paletteClick.emit(palette);
  }

  onLikeClick(palette: ColorPalette, event: Event) {
    event.stopPropagation();
    this.likeClick.emit(palette);
  }

  onShareClick(palette: ColorPalette, event: Event) {
    event.stopPropagation();
    this.shareClick.emit(palette);
  }

  getColorPreview(colors: string[]): string[] {
    return colors.slice(0, 5); // Mostrar apenas as primeiras 5 cores
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
