import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-test-image-search',
  template: `
    <div class="container mt-4">
      <h3>Teste de Busca de Imagem por Base64</h3>
      
      <div class="mb-3">
        <label for="imageBase64" class="form-label">Conteúdo Base64 da Imagem:</label>
        <textarea 
          id="imageBase64" 
          class="form-control" 
          rows="5" 
          [(ngModel)]="imageBase64"
          placeholder="Cole aqui o conteúdo base64 da imagem...">
        </textarea>
      </div>
      
      <button 
        class="btn btn-primary" 
        (click)="searchImage()" 
        [disabled]="isSearching || !imageBase64">
        {{ isSearching ? 'Buscando...' : 'Buscar Imagem' }}
      </button>
      
      <div *ngIf="searchResult" class="mt-4">
        <div class="alert alert-success" *ngIf="searchResult.success">
          <h5>✅ Imagem encontrada!</h5>
          <p><strong>ID:</strong> {{ searchResult.data.id }}</p>
          <p><strong>User ID:</strong> {{ searchResult.data.user_id }}</p>
          <p><strong>Criado em:</strong> {{ searchResult.data.created_at | date:'dd/MM/yyyy HH:mm' }}</p>
          <p><strong>Atualizado em:</strong> {{ searchResult.data.updated_at | date:'dd/MM/yyyy HH:mm' }}</p>
          
          <div class="mt-3">
            <h6>Prévia da Imagem:</h6>
            <img 
              [src]="'data:image/jpeg;base64,' + searchResult.data.image_base64" 
              alt="Imagem encontrada" 
              class="img-thumbnail" 
              style="max-width: 300px; max-height: 300px;">
          </div>
        </div>
        
        <div class="alert alert-warning" *ngIf="!searchResult.success">
          <h5>⚠️ Imagem não encontrada</h5>
          <p>{{ searchResult.message }}</p>
        </div>
      </div>
      
      <div *ngIf="error" class="mt-4">
        <div class="alert alert-danger">
          <h5>❌ Erro</h5>
          <p>{{ error }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 800px;
    }
    
    textarea {
      font-family: monospace;
      font-size: 12px;
    }
    
    .img-thumbnail {
      border: 2px solid #dee2e6;
    }
  `]
})
export class TestImageSearchComponent {
  imageBase64: string = '';
  isSearching: boolean = false;
  searchResult: any = null;
  error: string = '';

  constructor(private apiService: ApiService) {}

  searchImage() {
    if (!this.imageBase64.trim()) {
      this.error = 'Por favor, insira o conteúdo base64 da imagem.';
      return;
    }

    this.isSearching = true;
    this.searchResult = null;
    this.error = '';

    // Limpar o prefixo "data:image/jpeg;base64," se existir
    let cleanBase64 = this.imageBase64.trim();
    if (cleanBase64.startsWith('data:image/')) {
      const commaIndex = cleanBase64.indexOf(',');
      if (commaIndex !== -1) {
        cleanBase64 = cleanBase64.substring(commaIndex + 1);
      }
    }

    this.apiService.findImageByBase64(cleanBase64).subscribe({
      next: (response) => {
        this.searchResult = response;
        this.isSearching = false;
      },
      error: (error) => {
        console.error('Erro na busca:', error);
        this.error = error.error?.message || 'Erro ao buscar imagem';
        this.isSearching = false;
      }
    });
  }

  getImageSrc(): string {
    if (this.searchResult?.success && this.searchResult?.data?.image_base64) {
      const base64 = this.searchResult.data.image_base64;
      // Verificar se já tem o prefixo data:image
      if (base64.startsWith('data:image/')) {
        return base64;
      }
      // Assumir JPEG se não tiver prefixo
      return `data:image/jpeg;base64,${base64}`;
    }
    return '';
  }
}