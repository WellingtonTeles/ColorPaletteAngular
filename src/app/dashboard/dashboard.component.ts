import { Component, OnInit } from '@angular/core';
import { FirebaseAuthService } from '../services/firebase-auth.service';
import { ApiService, ColorPalette } from '../services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: any = null;
  userProfile: any = null;
  myPalettes: ColorPalette[] = [];
  publicPalettes: ColorPalette[] = [];
  isLoadingMyPalettes = false;
  isLoadingPublicPalettes = false;
  
  // Propriedades para verificação de imagem
  showImageUploadMessage = false;
  hasUserImage = false;
  isCheckingImage = false;
  clientImageUrl: string | null = null;

  menuItems = [
    { title: 'Paleta de Cores', description: 'Descubra sua paleta de cores ideal', icon: '🎨', route: '/paleta-cores' },
    { title: 'Guarda-roupa', description: 'Organize suas peças favoritas', icon: '👗', route: '/guarda-roupa' },
    { title: 'Clientes', description: 'Gerencie seus clientes', icon: '👥', route: '/clientes' },
    { title: 'Dicas de Look', description: 'Sugestões personalizadas de looks', icon: '✨', route: '/dicas-look' },
    { title: 'Incluir Foto', description: 'Faça upload da sua foto pessoal', icon: '📸', route: '/incluir-foto' },
    { title: 'Meus Looks', description: 'Veja e gerencie seus looks salvos', icon: '👗', route: '/meus-looks' }
  ];

  constructor(
    private firebaseAuth: FirebaseAuthService,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.firebaseAuth.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
    } else {
      this.loadUserProfile();
      this.loadPalettes();
      this.checkUserImage(); // Verificar se usuário tem imagem salva
    }
  }

  loadUserProfile() {
    this.apiService.getProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
        
        // Merge profile data with current user to include photoUrl
        if (profile && profile.photoUrl) {
          this.currentUser = {
            ...this.currentUser,
            photoUrl: profile.photoUrl
          };
        }
      },
      error: (error) => {
        console.error('Erro ao carregar perfil do usuário:', error);
      }
    });
  }

  getUserTypeLabel(userType: string): string {
    const labels: { [key: string]: string } = {
      'standard': 'Padrão',
      'vip': 'VIP',
      'premium': 'Premium'
    };
    return labels[userType] || userType;
  }

  loadPalettes() {
    this.loadMyPalettes();
    this.loadPublicPalettes();
  }

  loadMyPalettes() {
    this.isLoadingMyPalettes = true;
    this.apiService.getMyPalettes(1, 10).subscribe({
      next: (response) => {
        this.myPalettes = response.palettes;
        this.isLoadingMyPalettes = false;
      },
      error: (error) => {
        console.error('Erro ao carregar minhas paletas:', error);
        this.isLoadingMyPalettes = false;
      }
    });
  }

  loadPublicPalettes() {
    this.isLoadingPublicPalettes = true;
    this.apiService.getPalettes(1, 10).subscribe({
      next: (response) => {
        this.publicPalettes = response.palettes;
        this.isLoadingPublicPalettes = false;
      },
      error: (error) => {
        console.error('Erro ao carregar paletas públicas:', error);
        this.isLoadingPublicPalettes = false;
      }
    });
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  likePalette(palette: ColorPalette) {
    this.apiService.likePalette(palette.id).subscribe({
      next: (response) => {
        // Atualizar o estado do like na paleta
        palette.is_liked = !palette.is_liked;
        palette.likes_count = response.likes_count || palette.likes_count;
      },
      error: (error) => {
        console.error('Erro ao curtir paleta:', error);
      }
    });
  }

  deletePalette(palette: ColorPalette) {
    if (confirm('Tem certeza que deseja excluir esta paleta?')) {
      this.apiService.deletePalette(palette.id).subscribe({
        next: () => {
          this.myPalettes = this.myPalettes.filter(p => p.id !== palette.id);
        },
        error: (error) => {
          console.error('Erro ao excluir paleta:', error);
          alert('Erro ao excluir paleta.');
        }
      });
    }
  }

  async logout() {
    await this.firebaseAuth.logout();
  }

  // Métodos para interagir com a galeria de paletas
  onPaletteClick(palette: any) {
    // Paleta clicada
    this.router.navigate(['/palette', palette.id]);
  }

  onLikePalette(palette: ColorPalette) {
    this.likePalette(palette);
  }

  onSharePalette(palette: ColorPalette) {
    // Implementar funcionalidade de compartilhamento
    if (navigator.share) {
      navigator.share({
        title: `Paleta: ${palette.name}`,
        text: `Confira esta paleta de cores: ${palette.name}`,
        url: window.location.href
      }).catch(err => {
        // Erro ao compartilhar
      });
    } else {
      // Fallback: copiar link para clipboard
      const url = `${window.location.origin}/palette/${palette.id}`;
      navigator.clipboard.writeText(url).then(() => {
        alert('Link da paleta copiado para a área de transferência!');
      }).catch(err => {
        console.error('Erro ao copiar link:', err);
        alert('Não foi possível copiar o link.');
      });
    }
  }

  // Verificar se usuário tem imagem salva
  checkUserImage() {
    this.isCheckingImage = true;
    
    // Primeiro, verificar se há imagem na tabela image_client (nova funcionalidade)
    this.apiService.getImageClient().subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.image_base64) {
          // Imagem encontrada na tabela image_client
          this.clientImageUrl = response.data.image_base64;
          this.hasUserImage = true;
          this.showImageUploadMessage = false;
          this.isCheckingImage = false;
        } else {
          // Se não encontrou na image_client, verificar na tabela clients (método antigo)
          this.checkLegacyClientImage();
        }
      },
      error: (error) => {
        // Se der erro na image_client, verificar na tabela clients (método antigo)
        this.checkLegacyClientImage();
      }
    });
  }

  // Verificar imagem no método antigo (tabela clients)
  checkLegacyClientImage() {
    this.apiService.checkUserImage().subscribe({
      next: (response) => {
        this.hasUserImage = response.hasImage;
        this.showImageUploadMessage = !response.hasImage;
        this.isCheckingImage = false;
        
        if (!response.hasImage) {
          this.clientImageUrl = null;
        } else {
          // Buscar a imagem do cliente
          this.loadClientImage();
        }
      },
      error: (error) => {
        console.error('Erro ao verificar imagem do usuário:', error);
        this.isCheckingImage = false;
        // Em caso de erro, não mostrar a mensagem para não incomodar o usuário
        this.showImageUploadMessage = false;
        this.clientImageUrl = null;
      }
    });
  }

  // Carregar imagem do cliente
  loadClientImage() {
    this.apiService.getClientImage().subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.face_image_data) {
          this.clientImageUrl = response.data.face_image_data;
        } else {
          this.clientImageUrl = null;
        }
      },
      error: (error) => {
        console.error('Erro ao carregar imagem do cliente:', error);
        this.clientImageUrl = null;
      }
    });
  }

  // Navegar para a página de incluir foto para upload de imagem
  navigateToImageUpload() {
    this.router.navigate(['/incluir-foto']);
  }

  // Fechar mensagem de upload de imagem
  dismissImageMessage() {
    this.showImageUploadMessage = false;
  }
}
