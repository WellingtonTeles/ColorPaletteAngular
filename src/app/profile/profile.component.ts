import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { FirebaseAuthService, FirebaseUser } from '../services/firebase-auth.service';
import { ApiService } from '../services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  currentUser: FirebaseUser | null = null;
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  
  // Propriedades para imagem do cliente
  clientImageUrl: string | null = null;
  hasClientImage: boolean = false;
  isLoadingImage: boolean = false;

  constructor(
    private location: Location,
    private firebaseAuth: FirebaseAuthService,
    private apiService: ApiService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.currentUser = this.firebaseAuth.getCurrentUser();
    this.checkClientImage();
  }

  goBack(): void {
    this.location.back();
  }

  // Método para verificar se existe imagem do cliente
  checkClientImage(): void {
    this.isLoadingImage = true;
    
    // Primeiro tenta buscar da tabela image_client
    this.apiService.getImageClient().subscribe({
      next: (response) => {
        if (response && response.data && response.data.image_base64) {
          this.hasClientImage = true;
          this.loadClientImage();
        } else {
          // Se não encontrou na image_client, tenta na tabela clients (legacy)
          this.checkLegacyClientImage();
        }
        this.isLoadingImage = false;
      },
      error: (error) => {
        // Se deu erro na image_client, tenta na tabela clients (legacy)
        this.checkLegacyClientImage();
      }
    });
  }

  // Método para verificar imagem na tabela clients (legacy)
  checkLegacyClientImage(): void {
    this.apiService.getClientImage().subscribe({
      next: (response) => {
        if (response && response.image_data) {
          this.hasClientImage = true;
          this.loadLegacyClientImage();
        } else {
          this.hasClientImage = false;
        }
        this.isLoadingImage = false;
      },
      error: (error) => {
        this.hasClientImage = false;
        this.isLoadingImage = false;
      }
    });
  }

  // Método para carregar imagem da tabela image_client
  loadClientImage(): void {
    this.apiService.getImageClient().subscribe({
      next: (response) => {
        if (response && response.data && response.data.image_base64) {
          this.clientImageUrl = response.data.image_base64;
        }
      },
      error: (error) => {
        console.error('Erro ao carregar imagem do cliente:', error);
      }
    });
  }

  // Método para carregar imagem da tabela clients (legacy)
  loadLegacyClientImage(): void {
    this.apiService.getClientImage().subscribe({
      next: (response) => {
        if (response && response.image_data) {
          this.clientImageUrl = `data:image/jpeg;base64,${response.image_data}`;
        }
      },
      error: (error) => {
        console.error('Erro ao carregar imagem do cliente (legacy):', error);
      }
    });
  }

  // Método para navegar para incluir foto
  navigateToIncluirFoto(): void {
    this.router.navigate(['/incluir-foto']);
  }

  async deleteAccount(): Promise<void> {
    if (!confirm('Tem certeza que deseja deletar sua conta? Esta ação não pode ser desfeita e todos os seus dados serão perdidos permanentemente.')) {
      return;
    }

    if (!confirm('Esta é sua última chance! Tem ABSOLUTA certeza que deseja deletar sua conta?')) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      // Deletar conta do backend (que também deleta do Firebase)
      await this.apiService.deleteAccount().toPromise();
      
      // Fazer logout do Firebase no frontend
      await this.firebaseAuth.logout();
      
      this.successMessage = 'Conta deletada com sucesso!';
      
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
      
    } catch (error: any) {
      console.error('Erro ao deletar conta:', error);
      this.errorMessage = error.error?.message || 'Erro ao deletar conta. Tente novamente.';
    } finally {
      this.isLoading = false;
    }
  }
}
