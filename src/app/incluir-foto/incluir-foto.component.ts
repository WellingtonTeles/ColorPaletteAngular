import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseAuthService } from '../services/firebase-auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-incluir-foto',
  templateUrl: './incluir-foto.component.html',
  styleUrls: ['./incluir-foto.component.scss']
})
export class IncluirFotoComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;

  // Estado do componente
  selectedImage: string | null = null;
  selectedFile: File | null = null;
  isUploading = false;
  uploadSuccess = false;
  errorMessage = '';
  successMessage = '';
  
  // Informações da imagem
  imageInfo = {
    name: '',
    size: '',
    type: ''
  };

  // Usuário atual
  currentUser: any = null;

  // Configurações de upload
  maxFileSize = 5 * 1024 * 1024; // 5MB
  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  constructor(
    private router: Router,
    private firebaseAuth: FirebaseAuthService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.currentUser = this.firebaseAuth.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

  }

  // Abrir seletor de arquivo
  openFileSelector() {
    this.fileInput.nativeElement.click();
  }

  // Manipular seleção de arquivo
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.processSelectedFile(file);
    }
  }

  // Manipular drag and drop
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processSelectedFile(files[0]);
    }
  }

  // Processar arquivo selecionado
  processSelectedFile(file: File) {

    // Validar tipo de arquivo
    if (!this.allowedTypes.includes(file.type)) {
      this.showError('Tipo de arquivo não suportado. Use: JPEG, PNG, GIF ou WebP');
      return;
    }

    // Validar tamanho do arquivo
    if (file.size > this.maxFileSize) {
      this.showError('Arquivo muito grande. Tamanho máximo: 5MB');
      return;
    }

    this.selectedFile = file;
    this.imageInfo = {
      name: file.name,
      size: this.formatFileSize(file.size),
      type: file.type
    };

    // Converter para base64 para preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.selectedImage = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    // Limpar mensagens
    this.clearMessages();
  }

  // Fazer upload da imagem
  async uploadImage() {
    if (!this.selectedFile || !this.selectedImage) {
      this.showError('Nenhuma imagem selecionada');
      return;
    }

    this.isUploading = true;
    this.clearMessages();

    try {

      // Obter token de autenticação
      const token = await this.firebaseAuth.getCurrentUserToken();
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      // Preparar headers
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      // Preparar dados para envio
      const uploadData = {
        imageData: this.selectedImage
      };


      // Fazer requisição para o backend
      const response = await this.http.post<any>(
        `${environment.apiUrl}/image-client/upload`,
        uploadData,
        { headers }
      ).toPromise();


      this.uploadSuccess = true;
      this.showSuccess('Imagem enviada com sucesso!');
      
      // Limpar seleção após 2 segundos
      setTimeout(() => {
        this.clearSelection();
      }, 2000);

    } catch (error: any) {
      console.error('❌ Erro no upload:', error);
      
      let errorMsg = 'Erro ao enviar imagem';
      if (error.error?.message) {
        errorMsg = error.error.message;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      this.showError(errorMsg);
    } finally {
      this.isUploading = false;
    }
  }

  // Remover imagem selecionada
  removeImage() {
    this.clearSelection();
    this.clearMessages();
  }

  // Limpar seleção
  clearSelection() {
    this.selectedImage = null;
    this.selectedFile = null;
    this.imageInfo = { name: '', size: '', type: '' };
    this.uploadSuccess = false;
    
    // Limpar input file
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // Voltar ao dashboard
  goBack() {
    this.router.navigate(['/dashboard']);
  }

  // Utilitários para mensagens
  showError(message: string) {
    this.errorMessage = message;
    this.successMessage = '';
    setTimeout(() => this.clearMessages(), 5000);
  }

  showSuccess(message: string) {
    this.successMessage = message;
    this.errorMessage = '';
  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Formatar tamanho do arquivo
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Verificar se pode fazer upload
  canUpload(): boolean {
    return !!(this.selectedImage && !this.isUploading && !this.uploadSuccess);
  }
}
