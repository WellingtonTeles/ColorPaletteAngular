import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { ImageAnalysisService } from '../services/image-analysis.service';

interface LookTip {
  id: number;
  title: string;
  description: string;
  colors: string[];
  tags: string[];
  imageUrl?: string;
  createdAt?: string;
  // Adicionar compatibilidade com backend que usa snake_case
  created_at?: string;
}

@Component({
  selector: 'app-look-tips',
  templateUrl: './look-tips.component.html',
  styleUrls: ['./look-tips.component.scss']
})
export class LookTipsComponent implements OnInit {
  lookTips: LookTip[] = [];
  filteredLookTips: LookTip[] = [];
  searchTerm: string = '';
  selectedTag: string = '';
  availableTags: string[] = [];
  isLoading: boolean = false;
  currentUser: any = null;
  error: string = '';
  
  // Propriedades para geração de looks
  generatedLooks: any[] = [];
  isGeneratingLook: boolean = false;
  userPalette: any = { colors: [] };
  selectedLookTypeTitle: string = 'Look Personalizado';
  selectedLookType: string = '';
  
  // Propriedades para looks salvos
  savedLooks: any[] = [];
  showSavedLooks: boolean = false;
  
  // Propriedades para filtros
  selectedStyle: string = '';
  selectedOccasion: string = '';
  selectedSeason: string = '';
  
  // Opções para filtros
  styleOptions = ['casual', 'formal', 'business', 'party', 'sport', 'bohemian', 'minimalist', 'vintage'];
  occasionOptions = ['work', 'party', 'date', 'casual', 'formal', 'sport', 'travel', 'special'];
  seasonOptions = ['spring', 'summer', 'autumn', 'winter'];

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    public router: Router,
    private imageAnalysisService: ImageAnalysisService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.loadLookTips();
    this.loadUserPalette();
    this.loadSavedLooks();
  }

  loadUserPalette() {
    // Carregar a paleta mais recente do usuário
    this.apiService.getMyPalettes(1, 1).subscribe({
      next: (response: any) => {
        let latestPalette: any = null;
        if (response?.success && Array.isArray(response?.palettes) && response.palettes.length > 0) {
          latestPalette = response.palettes[0];
        } else if (Array.isArray(response?.data) && response.data.length > 0) {
          latestPalette = response.data[0];
        }

        const colors: string[] = this.parseColors(latestPalette?.colors);
        if (colors.length > 0) {
          this.userPalette = {
            id: latestPalette?.id || latestPalette?.palette_id || null,
            colors,
            name: latestPalette?.name || latestPalette?.palette_name || null
          };
          // Persistir no localStorage para outros fluxos
          localStorage.setItem('palette_colors', JSON.stringify(colors));
          if (this.userPalette.id) {
            localStorage.setItem('palette_id', String(this.userPalette.id));
          }
        } else {
          // Fallback: tentar carregar do localStorage
          try {
            const lsColorsStr = localStorage.getItem('palette_colors');
            const lsColors = lsColorsStr ? JSON.parse(lsColorsStr) : [];
            const lsPaletteId = localStorage.getItem('palette_id');
            this.userPalette = {
              id: lsPaletteId || latestPalette?.id || null,
              colors: Array.isArray(lsColors) ? lsColors : [],
              name: latestPalette?.name || null
            };
          } catch {
            this.userPalette = { colors: [] };
          }
        }
      },
      error: (error: any) => {
        console.error('Erro ao carregar paleta do usuário:', error);
        // Fallback: tentar carregar do localStorage
        try {
          const lsColorsStr = localStorage.getItem('palette_colors');
          const lsColors = lsColorsStr ? JSON.parse(lsColorsStr) : [];
          const lsPaletteId = localStorage.getItem('palette_id');
          this.userPalette = {
            id: lsPaletteId || null,
            colors: Array.isArray(lsColors) ? lsColors : []
          };
        } catch {
          this.userPalette = { colors: [] };
        }
      }
    });
  }

  loadLookTips() {
    this.isLoading = true;
    this.apiService.getLookTips().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.lookTips = response.data;
          this.filteredLookTips = [...this.lookTips];
          this.extractTags();
        } else {
          console.error('Erro ao carregar look tips:', response.message);
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar look tips:', error);
        this.isLoading = false;
      }
    });
  }

  extractTags() {
    const tagSet = new Set<string>();
    this.lookTips.forEach(tip => {
      if (tip.tags) {
        tip.tags.forEach(tag => tagSet.add(tag));
      }
    });
    this.availableTags = Array.from(tagSet);
  }

  filterLookTips() {
    this.filteredLookTips = this.lookTips.filter(tip => {
      const matchesSearch = !this.searchTerm || 
        tip.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        tip.description.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesTag = !this.selectedTag || 
        (tip.tags && tip.tags.includes(this.selectedTag));
      
      return matchesSearch && matchesTag;
    });
  }

  onSearchChange() {
    this.filterLookTips();
  }

  onTagChange() {
    this.filterLookTips();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedTag = '';
    this.filteredLookTips = [...this.lookTips];
  }

  // Helper para normalizar e extrair cores
  private parseColors(colorsRaw: any): string[] {
    let colors: string[] = [];
    if (Array.isArray(colorsRaw)) {
      colors = colorsRaw
        .map((item: any) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') return item.hex || item.color || '';
          return '';
        })
        .filter((c: any) => typeof c === 'string' && c.trim().length > 0);
    } else if (typeof colorsRaw === 'string') {
      try {
        const parsed = JSON.parse(colorsRaw);
        colors = Array.isArray(parsed)
          ? parsed
              .map((item: any) => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object') return item.hex || item.color || '';
                return '';
              })
              .filter((c: any) => typeof c === 'string' && c.trim().length > 0)
          : colorsRaw.split(/[,;\s]+/).filter(Boolean);
      } catch {
        colors = colorsRaw.split(/[,;\s]+/).filter(Boolean);
      }
    } else if (colorsRaw && typeof colorsRaw === 'object') {
      const arr = (colorsRaw as any).colors || (colorsRaw as any).palette || [];
      colors = Array.isArray(arr)
        ? arr
            .map((item: any) => {
              if (typeof item === 'string') return item;
              if (item && typeof item === 'object') return item.hex || item.color || '';
              return '';
            })
            .filter((c: any) => typeof c === 'string' && c.trim().length > 0)
        : [];
    }
    // Normalizar para formato #hex
    colors = colors.map((c: string) => (c.startsWith('#') ? c : `#${c}`));
    return colors;
  }

  generatePersonalizedLook() {
    if (!this.currentUser || !this.currentUser.id) {
      alert('Usuário não encontrado. Faça login novamente.');
      return;
    }

    this.isGeneratingLook = true;
    
    // Construir parâmetros baseados nos filtros selecionados
    const params: any = {
      userId: this.currentUser.id
    };
    
    if (this.selectedStyle) params.style = this.selectedStyle;
    if (this.selectedOccasion) params.occasion = this.selectedOccasion;
    if (this.selectedSeason) params.season = this.selectedSeason;

    this.apiService.generatePersonalizedLook(params).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.generatedLooks.unshift(response.data);
          // Limitar a 10 looks gerados para não sobrecarregar a interface
          if (this.generatedLooks.length > 10) {
            this.generatedLooks = this.generatedLooks.slice(0, 10);
          }
        } else {
          alert('Erro ao gerar look personalizado: ' + response.message);
        }
        this.isGeneratingLook = false;
      },
      error: (error: any) => {
        console.error('Erro ao gerar look:', error);
        alert('Erro ao gerar look personalizado. Tente novamente.');
        this.isGeneratingLook = false;
      }
    });
  }

  // Método de geração de imagem desativado nesta tela
  generateLookImageWithDallE(look: any) {
    alert('A geração de imagens está desativada nesta tela. Você receberá apenas dicas textuais com sua paleta de cores.');
    return;
  }

  // Método de geração de imagem (ChatGPT) desativado nesta tela
  generateLookImage(look: any) {
    alert('A geração de imagens está desativada nesta tela. Selecione um tipo de look para receber apenas as dicas textuais com sua paleta.');
    return;
  }

  // Método para obter dados da imagem da cliente
  private async getClientImageData(): Promise<string | null> {
    try {
      
      // Primeiro, tentar obter a imagem da tabela image_client
      const imageClientResponse = await this.apiService.getImageClient().toPromise();
      
      if (imageClientResponse && imageClientResponse.success && imageClientResponse.data && imageClientResponse.data.image_base64) {
        return imageClientResponse.data.image_base64;
      }
      
      
      // Fallback: tentar obter do perfil da cliente (método antigo)
      const clientImageResponse = await this.apiService.getClientImage().toPromise();
      
      if (clientImageResponse && clientImageResponse.success && clientImageResponse.data && clientImageResponse.data.face_image_data) {
        return clientImageResponse.data.face_image_data;
      }
      
      // Fallback adicional: tentar obter do perfil da cliente
      const clientProfile = await this.apiService.getClientProfile().toPromise();
      
      if (clientProfile && clientProfile.faceImageData) {
        return clientProfile.faceImageData;
      }
      
      if (clientProfile && clientProfile.faceImageUrl) {
        // Converter URL para base64
        return await this.convertImageUrlToBase64(clientProfile.faceImageUrl);
      }
      
      // Se não encontrar no perfil, verificar se há uma imagem na análise atual
      const imageAnalysis = this.imageAnalysisService?.getCurrentImageAnalysis();
      if (imageAnalysis && imageAnalysis.imageUrl) {
        return await this.convertImageUrlToBase64(imageAnalysis.imageUrl);
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao obter dados da imagem da cliente:', error);
      return null;
    }
  }

  // Método para converter URL de imagem para base64
  private async convertImageUrlToBase64(imageUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx?.drawImage(img, 0, 0);
        
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataURL);
      };
      
      img.onerror = () => {
        reject(new Error('Erro ao carregar imagem'));
      };
      
      img.src = imageUrl;
    });
  }

  // Método para criar placeholder visual do look
  createLookPlaceholder(look: any, colors: string[]): string {
    // Criar um SVG simples com as cores da paleta como placeholder
    const svgWidth = 300;
    const svgHeight = 400;
    const colorHeight = svgHeight / colors.length;
    
    let colorBars = '';
    colors.forEach((color, index) => {
      colorBars += `<rect x="0" y="${index * colorHeight}" width="${svgWidth}" height="${colorHeight}" fill="${color}"/>`;
    });
    
    const svg = `
      <svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="stripes" patternUnits="userSpaceOnUse" width="20" height="20">
            <rect width="20" height="20" fill="#f8f9fa"/>
            <rect width="10" height="20" fill="#e9ecef"/>
          </pattern>
        </defs>
        
        <!-- Background -->
        <rect width="${svgWidth}" height="${svgHeight}" fill="url(#stripes)" opacity="0.1"/>
        
        <!-- Color palette bars -->
        ${colorBars}
        
        <!-- Overlay with look info -->
        <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="rgba(255,255,255,0.8)"/>
        
        <!-- Look icon -->
        <circle cx="${svgWidth/2}" cy="120" r="40" fill="#6c5ce7" opacity="0.8"/>
        <text x="${svgWidth/2}" y="130" text-anchor="middle" font-family="Arial" font-size="24" fill="white">👗</text>
        
        <!-- Look title -->
        <text x="${svgWidth/2}" y="200" text-anchor="middle" font-family="Arial" font-size="18" font-weight="bold" fill="#2d3436">
          ${look.title || 'Look Personalizado'}
        </text>
        
        <!-- Context -->
        <text x="${svgWidth/2}" y="230" text-anchor="middle" font-family="Arial" font-size="14" fill="#636e72">
          ${look.selectedContext?.name || 'Contexto'}
        </text>
        
        <!-- Colors info -->
        <text x="${svgWidth/2}" y="260" text-anchor="middle" font-family="Arial" font-size="12" fill="#74b9ff">
          Paleta Personalizada
        </text>
        
        <!-- Generated by ChatGPT -->
        <text x="${svgWidth/2}" y="350" text-anchor="middle" font-family="Arial" font-size="10" fill="#a0a0a0">
          Análise gerada por ChatGPT
        </text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  // Toast state
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'warning' = 'success';

  showToastMessage(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  async saveLookAsTip(look: any) {
    if (!this.userPalette || !this.userPalette.colors || this.userPalette.colors.length === 0) {
      this.showToastMessage('Crie uma paleta de cores antes de salvar a dica.', 'warning');
      return;
    }

    if (!look || !look.description) {
      this.showToastMessage('Não há conteúdo para salvar como dica.', 'warning');
      return;
    }

    try {
      const tipPayload = {
        palette_id: this.userPalette?.id || null,
        title: look.title || this.selectedLookTypeTitle || 'Look Personalizado',
        description: look.data?.description || look.description || '',
        colors: look.colors || (this.userPalette?.colors?.slice(0, 5) || []),
        tags: [this.selectedLookType || 'personalizado'],
      };

      const response = await this.apiService.createLookTip(tipPayload).toPromise();

      if (response && (response as any).success) {
        this.showToastMessage('Dica salva com sucesso! 🎉', 'success');
        look.isSaved = true;
        await this.loadLookTips();
      } else {
        const msg = (response as any)?.message || 'Não foi possível salvar a dica.';
        this.showToastMessage(msg, 'error');
      }
    } catch (error: any) {
      console.error('Erro ao salvar dica:', error);
      const msg = error?.error?.message || error?.message || 'Erro ao salvar a dica. Tente novamente.';
      this.showToastMessage(msg, 'error');
    }
  }


  // Método para deletar look tip
  deleteLookTip(lookTip: LookTip) {
    if (confirm('Tem certeza que deseja excluir esta dica de look?')) {
      this.apiService.deleteLookTip(lookTip.id).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.loadLookTips(); // Recarregar as dicas
          } else {
            alert('Erro ao excluir dica de look');
          }
        },
        error: (error: any) => {
          console.error('Erro ao excluir look tip:', error);
          alert('Erro ao excluir dica de look. Tente novamente.');
        }
      });
    }
  }

  // Método para obter estilo da cor
  getColorStyle(color: string) {
    return {
      'background-color': color,
      'width': '30px',
      'height': '30px',
      'border-radius': '50%',
      'display': 'inline-block',
      'margin': '2px',
      'border': '2px solid #ddd'
    };
  }

  // Método para formatar data
  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  }

  // Método para alterar contexto do look
  changeContext(look: any) {
    // Implementar lógica para alterar contexto
  }

  // Método para selecionar contexto
  selectContext(look: any, context: string) {
    look.selectedContext = { name: context };
  }

  // método logLookImageBase64 removido
  // Método para testar geração de imagem
  testImageGeneration() {
    this.apiService.testImageGeneration().subscribe({
      next: (response) => {
        alert('API de geração de imagem funcionando corretamente!');
      },
      error: (error) => {
        console.error('Erro no teste da API:', error);
        alert('Erro ao testar API de geração de imagem.');
      }
    });
  }

  // Método para gerar look específico
  generateSpecificLook(lookType: string) {
    if (!this.currentUser || !this.currentUser.id) {
      alert('Usuário não encontrado. Faça login novamente.');
      return;
    }

    if (!this.userPalette || !this.userPalette.colors || this.userPalette.colors.length === 0) {
      alert('Nenhuma paleta de cores encontrada. Analise uma imagem primeiro.');
      return;
    }

    this.selectedLookType = lookType;
    this.selectedLookTypeTitle = 'Look ' + (lookType.charAt(0).toUpperCase() + lookType.slice(1));
    this.isGeneratingLook = true;
    
    
    // Mapear o tipo de look para um contexto apropriado
    const contextMap: { [key: string]: any } = {
      'elegante': { name: 'Elegante', description: 'Sofisticado para ocasiões especiais' },
      'casual': { name: 'Casual', description: 'Confortável para o dia a dia' },
      'festa': { name: 'Festa', description: 'Vibrante para celebrações' },
      'esportivo': { name: 'Esportivo', description: 'Ativo para exercícios e lazer' },
      'reuniao': { name: 'Reunião', description: 'Profissional para o trabalho' }
    };
    
    // Usar o endpoint generateCustomLook que já existe
    this.apiService.generateCustomLook(lookType, this.userPalette.colors, '').subscribe({
      next: (response: any) => {
        if (response.success) {
          // Adicionar o look gerado à lista com contexto já definido
          const selectedContext = contextMap[lookType] || { name: lookType.charAt(0).toUpperCase() + lookType.slice(1), description: `Look ${lookType}` };
          
          const newLook = {
            id: Date.now(), // ID temporário
            title: `Look ${lookType.charAt(0).toUpperCase() + lookType.slice(1)}`,
            description: response.lookDescription.description || response.lookDescription,
            colors: this.userPalette.colors,
            tags: response.lookDescription.tags || [lookType],
            createdAt: new Date().toISOString(),
            isGenerated: true,
            prompt: response.prompt || response.promptUsed || '',
            selectedContext: selectedContext, // Contexto já definido automaticamente
            contexts: [
              {
                name: 'Trabalho',
                description: 'Perfeito para o ambiente profissional'
              },
              {
                name: 'Casual',
                description: 'Ideal para o dia a dia'
              },
              {
                name: 'Festa',
                description: 'Elegante para ocasiões especiais'
              }
            ]
          };
          
          this.generatedLooks.unshift(newLook);
          
          // Logar prompt usado no console do navegador
          if (newLook.prompt) {
            console.log('Prompt enviado para geração de look:', newLook.prompt);
          }
          
          // Limitar a 10 looks gerados
          if (this.generatedLooks.length > 10) {
            this.generatedLooks = this.generatedLooks.slice(0, 10);
          }
          
        } else {
          alert('Erro ao gerar look: ' + response.message);
        }
        this.isGeneratingLook = false;
        this.selectedLookType = '';
      },
      error: (error: any) => {
        console.error('Erro ao gerar look:', error);
        alert('Erro ao gerar look personalizado. Tente novamente.');
        this.isGeneratingLook = false;
        this.selectedLookType = '';
      }
    });
  }

  // Método para voltar
  goBack() {
    this.router.navigate(['/dashboard']);
  }

  // ===== MÉTODOS PARA SALVAR LOOKS =====

  // Salvar look gerado
  async saveLook(look: any) {
    if (!this.currentUser || !this.currentUser.id) {
      alert('Usuário não encontrado. Faça login novamente.');
      return;
    }

    if (!this.userPalette || !this.userPalette.id) {
      alert('Paleta não encontrada. Analise uma imagem primeiro.');
      return;
    }

    // Preparar dados para salvar
    const imageDataBase64 = null;
    const lookData = {
      palette_id: this.userPalette.id,
      look_type: look.selectedContext?.name || 'Personalizado',
      title: look.title,
      description: look.description,
      tip: (look.data?.description || look.description || null),
      generated_image_url: null,
      image_data: imageDataBase64,
      payload: {
        originalLook: look,
        generationParams: {
          lookType: this.selectedLookType,
          paletteColors: this.userPalette.colors,
          context: look.selectedContext
        },
        timestamp: new Date().toISOString()
      },
      colors: look.colors || this.userPalette.colors,
      tags: look.tags || []
    };


    this.apiService.saveLook(lookData).subscribe({
      next: (response: any) => {
        if (response.success) {
          alert('Look salvo com sucesso!');
          // Marcar o look como salvo
          look.isSaved = true;
          look.savedId = response.data.id;
        } else {
          alert('Erro ao salvar look: ' + response.message);
        }
      },
      error: (error: any) => {
        console.error('Erro ao salvar look:', error);
        alert('Erro ao salvar look. Tente novamente.');
      }
    });
  }

  // Carregar looks salvos
  loadSavedLooks() {
    this.apiService.getSavedLooks().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.savedLooks = response.data.map((savedLook: any) => {
            // Parse dos campos JSON
            try {
              savedLook.colors = JSON.parse(savedLook.colors || '[]');
              savedLook.tags = JSON.parse(savedLook.tags || '[]');
              savedLook.payload = JSON.parse(savedLook.payload || '{}');
            } catch (e) {
              /* removed warn: Erro ao fazer parse dos dados do look salvo */
            }
            return savedLook;
          });
        } else {
          console.error('Erro ao carregar looks salvos:', response.message);
        }
      },
      error: (error: any) => {
        console.error('Erro ao carregar looks salvos:', error);
      }
    });
  }

  // Deletar look salvo
  deleteSavedLook(savedLook: any) {
    if (confirm('Tem certeza que deseja excluir este look salvo?')) {
      this.apiService.deleteSavedLook(savedLook.id).subscribe({
        next: (response: any) => {
          if (response.success) {
            // Remover da lista local
            this.savedLooks = this.savedLooks.filter(look => look.id !== savedLook.id);
            alert('Look salvo excluído com sucesso!');
          } else {
            alert('Erro ao excluir look salvo: ' + response.message);
          }
        },
        error: (error: any) => {
          console.error('Erro ao excluir look salvo:', error);
          alert('Erro ao excluir look salvo. Tente novamente.');
        }
      });
    }
  }

  // Alternar favorito
  toggleFavorite(savedLook: any) {
    this.apiService.toggleSavedLookFavorite(savedLook.id).subscribe({
      next: (response: any) => {
        if (response.success) {
          savedLook.is_favorite = response.data.is_favorite;
        } else {
          alert('Erro ao alterar favorito: ' + response.message);
        }
      },
      error: (error: any) => {
        console.error('Erro ao alterar favorito:', error);
        alert('Erro ao alterar favorito. Tente novamente.');
      }
    });
  }

  /**
   * Formata texto com negrito para palavras entre **, espaçamento entre parágrafos
   * e adiciona quadrados coloridos ao lado dos códigos HEX
   */
  formatTextWithBoldAndColors(inputText: string): string {
    if (!inputText) return '';

    let formattedText = inputText;

    // 1. Converter palavras entre ** para negrito
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 2. Adicionar espaçamento entre parágrafos (quebras de linha duplas)
    formattedText = formattedText.replace(/\n\n/g, '<br><br>');
    formattedText = formattedText.replace(/\n/g, '<br>');

    // 3. Detectar códigos HEX e adicionar quadrados coloridos
    // Regex para detectar códigos HEX válidos (#RRGGBB ou #RGB)
    const hexRegex = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/g;
    
    formattedText = formattedText.replace(hexRegex, (match: string) => {
      const colorCode = match;
      return `<span class="hex-color-display">
                <span class="color-square" style="background-color: ${colorCode}; display: inline-block; width: 16px; height: 16px; border-radius: 3px; margin-right: 6px; vertical-align: middle; border: 1px solid #ddd;"></span>
                <span class="color-code" style="font-family: monospace; font-weight: 500;">${colorCode}</span>
              </span>`;
    });

    return formattedText;
  }
}
