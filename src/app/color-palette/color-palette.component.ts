import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, ColorPalette } from '../services/api.service';
import { ImageAnalysisService, ImageAnalysisData } from '../services/image-analysis.service';
import { FirebaseAuthService } from '../services/firebase-auth.service';
//import { ConsoleReporter } from 'jasmine';

interface ColorInfo {
  hex: string;
  name: string;
  rgb: { r: number; g: number; b: number };
}

@Component({
  selector: 'app-color-palette',
  templateUrl: './color-palette.component.html',
  styleUrls: ['./color-palette.component.scss']
})
export class ColorPaletteComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedImage: string | null = null;
  isProcessing: boolean = false;
  isDragOver: boolean = false;
  colorPalette: ColorInfo[] = [];
  paletteName: string = '';
  paletteDescription: string = '';
  isSaving: boolean = false;
  
  // Propriedades para geração de look personalizado

  savedPaletteColors: string[] = [];

  // Propriedades para imagem salva
  savedPalette: ColorPalette | null = null;
  isLoadingSavedPalette: boolean = false;
  showImageUpdateSection: boolean = false;
  isCheckingPalette: boolean = false;

  constructor(
    private router: Router,
    private apiService: ApiService,
    private imageAnalysisService: ImageAnalysisService,
    private firebaseAuth: FirebaseAuthService
  ) {
  }

  async ngOnInit() {
    await this.loadSavedPalette();
  }

  // Carregar paleta salva do usuário
  async loadSavedPalette() {
    try {
      this.isLoadingSavedPalette = true;
      
      // Primeiro, verificar se já existe uma paleta salva
      const response = await this.apiService.getMyPalettes(1, 1).toPromise();
      
      if (response && response.palettes && response.palettes.length > 0) {
        // CASO 1: Paleta já existe - exibir a paleta
        this.savedPalette = response.palettes[0];
        
        // Carregar a imagem associada à paleta (se existir)
        if (this.savedPalette.imageBase64) {
          const imageFormat = this.savedPalette.imageFormat || 'jpeg';
          this.selectedImage = this.normalizeBase64Image(this.savedPalette.imageBase64, imageFormat);
        } else {
          // Tentar buscar imagem da tabela image_client
          try {
            const imageClientResponse = await this.apiService.getImageClient().toPromise();
            if (imageClientResponse && imageClientResponse.success && imageClientResponse.data && imageClientResponse.data.image_base64) {
              this.selectedImage = this.normalizeBase64Image(imageClientResponse.data.image_base64, 'jpeg');
            }
          } catch (imageError) {
          }
        }
        console.log('Paleta',this.savedPalette.colors);
        const rawColors: any = this.savedPalette.colors as any;
        let colorsArr: any[] = [];

        if (Array.isArray(rawColors)) {
          colorsArr = rawColors;
        } else if (typeof rawColors === 'string') {
          try {
            const parsed = JSON.parse(rawColors);
            if (Array.isArray(parsed)) {
              colorsArr = parsed;
            } else {
              colorsArr = rawColors.split(/[\s,;]+/).filter(Boolean);
            }
          } catch {
            colorsArr = rawColors.split(/[\s,;]+/).filter(Boolean);
          }
        } else if (rawColors && typeof rawColors === 'object') {
          if (Array.isArray(rawColors.colors)) {
            colorsArr = rawColors.colors;
          } else if (Array.isArray((rawColors as any).palette)) {
            colorsArr = (rawColors as any).palette;
          } else {
            colorsArr = [];
          }
        }

        if (colorsArr.length > 0) {
          this.colorPalette = colorsArr.map((item: any, index: number) => {
            let colorHex: string;
            let name: string;

            if (typeof item === 'string') {
              colorHex = item;
              if (!colorHex.startsWith('#')) {
                colorHex = '#' + colorHex;
              }
              const rgb = this.hexToRgb(colorHex);
              name = this.getColorName(rgb.r, rgb.g, rgb.b);
              return { hex: colorHex, name, rgb };
            } else if (item && typeof item === 'object') {
              if (item.hex) {
                colorHex = item.hex;
                name = item.name || `Cor ${index + 1}`;
              } else if (item.color) {
                colorHex = item.color;
                name = item.name || `Cor ${index + 1}`;
              } else {
                colorHex = '#CCCCCC';
                name = `Cor ${index + 1}`;
              }
              if (!colorHex.startsWith('#')) {
                colorHex = '#' + colorHex;
              }
              const rgb = this.hexToRgb(colorHex);
              return { hex: colorHex, name, rgb };
            } else {
              const colorHexFallback = '#CCCCCC';
              const rgb = this.hexToRgb(colorHexFallback);
              return { hex: colorHexFallback, name: `Cor ${index + 1}`, rgb };
            }
          });
          this.savedPaletteColors = this.colorPalette.map(color => color.hex);
        }
        
        this.paletteName = this.savedPalette.name || '';
        this.paletteDescription = this.savedPalette.description || '';
        
      } else {
        // CASO 2: Paleta não existe - verificar se há imagem na tabela image_client
        try {
          const imageClientResponse = await this.apiService.getImageClient().toPromise();
          if (imageClientResponse && imageClientResponse.success && imageClientResponse.data && imageClientResponse.data.image_base64) {
             // Existe imagem na tabela image_client - perguntar se deseja trocar a imagem antes de gerar a paleta
             this.selectedImage = this.normalizeBase64Image(imageClientResponse.data.image_base64, 'jpeg');
             
             const wantsToChange = confirm('Encontramos uma imagem salva. Você deseja trocar a imagem antes de gerar a paleta?');
             if (wantsToChange) {
               // Abre a seção de atualização de imagem e aguarda o usuário salvar uma nova imagem
               this.showImageUpdateSection = true;
               alert('Selecione e salve uma nova imagem. Após salvar, geraremos sua paleta automaticamente.');
             } else {
               // Gerar paleta automaticamente usando a imagem da tabela image_client
               // Apenas gerar se não existir paleta salva
               if (!this.savedPalette) {
                 await this.generatePaletteFromImageClient();
               }
             }
             
          } else {
          }
        } catch (imageError) {
        }
      }
      
    } catch (error: any) {
      console.error('Erro ao carregar dados salvos:', error);
      // Se o backend exigir registro do usuário, tentar registrar automaticamente e reprocessar
      if (error?.status === 403 && (error?.error?.requiresRegistration || (typeof error?.error?.message === 'string' && error.error.message.includes('Registration required')))) {
        try {
          const token = await this.firebaseAuth.getCurrentUserToken();
          if (token) {
            const fbUser = this.firebaseAuth.getCurrentUser();
            await this.apiService.registerUser(
              token,
              fbUser?.displayName || fbUser?.email || 'Usuário'
            ).toPromise();

            // Tentar novamente carregar paleta do usuário
            const retryResponse = await this.apiService.getMyPalettes(1, 1).toPromise();
            if (retryResponse && retryResponse.palettes && retryResponse.palettes.length > 0) {
              this.savedPalette = retryResponse.palettes[0];

              // Carregar imagem associada à paleta (se existir)
              if (this.savedPalette.imageBase64) {
                const imageFormat = this.savedPalette.imageFormat || 'jpeg';
                this.selectedImage = this.normalizeBase64Image(this.savedPalette.imageBase64, imageFormat);
              } else {
                // Tentar buscar imagem da tabela image_client
                try {
                  const imageClientResponse = await this.apiService.getImageClient().toPromise();
                  if (imageClientResponse && imageClientResponse.success && imageClientResponse.data && imageClientResponse.data.image_base64) {
                    this.selectedImage = this.normalizeBase64Image(imageClientResponse.data.image_base64, 'jpeg');
                  }
                } catch (imageError) {}
              }

              // Carregar as cores da paleta (tratar string, array ou objeto)
              const rawColorsRetry: any = this.savedPalette.colors as any;
              let colorsArrRetry: any[] = [];
              if (Array.isArray(rawColorsRetry)) {
                colorsArrRetry = rawColorsRetry;
              } else if (typeof rawColorsRetry === 'string') {
                try {
                  const parsed = JSON.parse(rawColorsRetry);
                  if (Array.isArray(parsed)) {
                    colorsArrRetry = parsed;
                  } else {
                    colorsArrRetry = rawColorsRetry.split(/[\s,;]+/).filter(Boolean);
                  }
                } catch {
                  colorsArrRetry = rawColorsRetry.split(/[\s,;]+/).filter(Boolean);
                }
              } else if (rawColorsRetry && typeof rawColorsRetry === 'object') {
                if (Array.isArray(rawColorsRetry.colors)) {
                  colorsArrRetry = rawColorsRetry.colors;
                } else if (Array.isArray((rawColorsRetry as any).palette)) {
                  colorsArrRetry = (rawColorsRetry as any).palette;
                }
              }

              if (colorsArrRetry.length > 0) {
                this.colorPalette = colorsArrRetry.map((item: any, index: number) => {
                  let colorHex: string;
                  let name: string;

                  if (typeof item === 'string') {
                    colorHex = item;
                    if (!colorHex.startsWith('#')) {
                      colorHex = '#' + colorHex;
                    }
                    const rgb = this.hexToRgb(colorHex);
                    name = this.getColorName(rgb.r, rgb.g, rgb.b);
                    return { hex: colorHex, name, rgb };
                  } else if (item && typeof item === 'object') {
                    if (item.hex) {
                      colorHex = item.hex;
                      name = item.name || `Cor ${index + 1}`;
                    } else if (item.color) {
                      colorHex = item.color;
                      name = item.name || `Cor ${index + 1}`;
                    } else {
                      colorHex = '#CCCCCC';
                      name = `Cor ${index + 1}`;
                    }
                    if (!colorHex.startsWith('#')) {
                      colorHex = '#' + colorHex;
                    }
                    const rgb = this.hexToRgb(colorHex);
                    return { hex: colorHex, name, rgb };
                  } else {
                    const colorHexFallback = '#CCCCCC';
                    const rgb = this.hexToRgb(colorHexFallback);
                    return { hex: colorHexFallback, name: `Cor ${index + 1}`, rgb };
                  }
                });
                this.savedPaletteColors = this.colorPalette.map(color => color.hex);
              }

              this.paletteName = this.savedPalette.name || '';
              this.paletteDescription = this.savedPalette.description || '';
            } else {
              // Caso continue sem paleta, tentar utilizar a imagem do image_client para gerar automaticamente
              try {
                const imageClientResponse = await this.apiService.getImageClient().toPromise();
                if (imageClientResponse && imageClientResponse.success && imageClientResponse.data && imageClientResponse.data.image_base64) {
                  this.selectedImage = this.normalizeBase64Image(imageClientResponse.data.image_base64, 'jpeg');
                  // Apenas gerar se não existir paleta salva
                  if (!this.savedPalette) {
                    await this.generatePaletteFromImageClient();
                  }
                }
              } catch (imageError) {}
            }
          }
        } catch (registerErr) {
          console.error('Erro ao registrar usuário automaticamente:', registerErr);
        }
      } else {
        // Em outros erros, tentar fallback para imagem do image_client
        try {
          const imageClientResponse = await this.apiService.getImageClient().toPromise();
          if (imageClientResponse && imageClientResponse.success && imageClientResponse.data && imageClientResponse.data.image_base64) {
            this.selectedImage = this.normalizeBase64Image(imageClientResponse.data.image_base64, 'jpeg');
            // Evitar gerar nova paleta se já existir uma paleta salva
            if (!this.savedPalette) {
              await this.generatePaletteFromImageClient();
            }
          }
        } catch (imageError) {}
      }
    } finally {
      this.isLoadingSavedPalette = false;
    }
  }

  // Método para mostrar/esconder seção de atualização de imagem
  toggleImageUpdateSection() {
    this.showImageUpdateSection = !this.showImageUpdateSection;
  }

  // Método para abrir modal de atualização de imagem (quando clica na imagem)
  openImageUpdateModal() {
    this.showImageUpdateSection = true;
  }

  // Método para atualizar imagem salva
  async updateSavedImage() {
    if (!this.selectedImage) {
      alert('Por favor, selecione uma imagem primeiro.');
      return;
    }

    this.isSaving = true;
    
    try {
      // Usar a imagem completa com prefixo data:image/
      const imageData = this.selectedImage;

      // Atualizar a imagem na tabela image_client
      await this.apiService.updateImageClient(imageData).toPromise();
      
      // Recarregar a imagem salva
      await this.loadSavedPalette();
      
      // Apenas gere a paleta se ainda não existir uma paleta salva
      if (!this.savedPalette) {
        await this.generatePaletteFromImageClient();
      }
      
      this.showImageUpdateSection = false;
      alert('Imagem atualizada com sucesso!');
      
    } catch (error: any) {
      console.error('Erro ao atualizar imagem:', error);
      if (error.status === 404) {
        alert('Nenhuma imagem encontrada para atualizar. Por favor, faça upload de uma imagem primeiro.');
      } else {
        alert('Erro ao atualizar imagem. Tente novamente.');
      }
    } finally {
      this.isSaving = false;
    }
  }

  // Método para detectar formato da imagem
  private detectImageFormat(base64Data: string): string {
    if (base64Data.startsWith('/9j/')) return 'jpeg';
    if (base64Data.startsWith('iVBORw0KGgo')) return 'png';
    if (base64Data.startsWith('UklGR')) return 'webp';
    return 'jpeg'; // padrão
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validar se é uma imagem válida
      if (!this.isValidImageFile(file)) {
        alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WEBP)');
        return;
      }

      // Validar tamanho do arquivo (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('O arquivo é muito grande. Por favor, selecione uma imagem menor que 10MB.');
        return;
      }

      this.processImageFile(file);
    }
  }

  // Método para validar se o arquivo é uma imagem válida
  private isValidImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return validTypes.includes(file.type);
  }

  // Método para processar o arquivo de imagem
  private processImageFile(file: File) {
    // Verificar se a imagem é muito grande antes de processar
    if (file.size > 15 * 1024 * 1024) { // 15MB
      alert('A imagem é muito grande. Por favor, selecione uma imagem menor que 15MB.');
      this.resetUpload();
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      
      // Validar se a imagem foi carregada corretamente
      if (!imageData || !imageData.startsWith('data:image/')) {
        alert('Erro ao carregar a imagem. Por favor, tente novamente.');
        this.resetUpload();
        return;
      }

      // Validar se a imagem contém dados válidos
      this.validateImageContent(imageData).then(isValid => {
        if (isValid) {
          this.selectedImage = imageData;
          this.extractColorsFromFace();
        } else {
          alert('A imagem selecionada não é válida ou está corrompida. Por favor, selecione outra imagem.');
          this.resetUpload();
        }
      }).catch(error => {
        console.error('Erro na validação da imagem:', error);
        alert('Erro ao validar a imagem. Por favor, tente novamente.');
        this.resetUpload();
      });
    };
    
    reader.onerror = () => {
      alert('Erro ao ler o arquivo. Por favor, tente novamente.');
      this.resetUpload();
    };
    
    reader.readAsDataURL(file);
  }

  // Método para validar o conteúdo da imagem
  private validateImageContent(imageData: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        // Verificar se a imagem tem dimensões válidas
        if (img.width < 100 || img.height < 100) {
          resolve(false);
          return;
        }

        // Verificar se a imagem não é muito pequena ou muito grande
        if (img.width > 5000 || img.height > 5000) {
          resolve(false);
          return;
        }

        resolve(true);
      };

      img.onerror = () => {
        resolve(false);
      };

      img.src = imageData;
    });
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validar se é uma imagem válida
      if (!this.isValidImageFile(file)) {
        alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WEBP)');
        return;
      }

      // Validar tamanho do arquivo (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('O arquivo é muito grande. Por favor, selecione uma imagem menor que 10MB.');
        return;
      }

      this.processImageFile(file);
    }
  }

  // Método para gerar paleta usando imagem da tabela image_client
  async generatePaletteFromImageClient() {
    try {
      this.isProcessing = true;
      
      
      // Usar o novo endpoint que busca a imagem da tabela image_client
      const analysis = await this.apiService.analyzeImageClientForPalette(this.paletteName || 'Paleta Facial').toPromise();
      
      if (analysis && analysis.success) {
        // Processar resultado da análise
        this.processAnalysisResult(analysis.data);
        
        // Recarregar a paleta salva para obter os dados atualizados
        await this.loadSavedPalette();
        
        alert('Paleta gerada com sucesso a partir da sua imagem salva!');
      } else {
        throw new Error(analysis?.message || 'Erro ao gerar paleta da imagem salva');
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao gerar paleta da imagem salva:', error);
      
      if (error.status === 404) {
        alert('Nenhuma imagem encontrada. Por favor, faça upload de uma imagem primeiro.');
      } else {
        alert('Erro ao gerar paleta da imagem salva. Tente novamente.');
      }
    } finally {
      this.isProcessing = false;
    }
  }

  async extractColorsFromFace() {
    if (!this.selectedImage) {
      console.error('Nenhuma imagem selecionada');
      return;
    }

    this.isProcessing = true;
    
    try {
      // Usar ChatGPT Vision API para análise
      const analysis = await this.analyzeImageWithChatGPT(this.selectedImage);
      
      if (analysis && analysis.success) {
        // O backend agora retorna 'data' diretamente em vez de 'analysis'
        this.processAnalysisResult(analysis.data);
      } else {
        throw new Error(analysis?.message || 'Erro na análise da imagem');
      }
      
    } catch (error) {
      console.error('❌ Erro ao analisar imagem:', error);
      alert('Erro ao analisar a imagem. Tente novamente.');
    } finally {
      this.isProcessing = false;
    }
  }

  // Novo método para analisar imagem com ChatGPT Vision API
  private async analyzeImageWithChatGPT(imageData: string): Promise<any> {
    try {
      
      const response = await this.apiService.analyzeImageForPalette(imageData).toPromise();
      
      return response;
    } catch (error) {
      console.error('❌ Erro ao chamar API de análise:', error);
      throw error;
    }
  }

  // Processar resultado da análise do ChatGPT
  private processAnalysisResult(analysis: any): void {
    try {
      
      // Processar paleta de cores
      if (analysis.palette && Array.isArray(analysis.palette)) {
        this.colorPalette = analysis.palette.map((item: any, index: number) => {
          let color: string;
          let name: string;
          
          if (typeof item === 'string') {
            color = item;
            name = `Cor ${index + 1}`;
          } else if (item.color && item.name) {
            color = item.color;
            name = item.name;
          } else if (item.hex && item.name) {
            color = item.hex;
            name = item.name;
          } else {
            color = '#CCCCCC';
            name = `Cor ${index + 1}`;
          }
          
          // Garantir que a cor está no formato correto
          if (!color.startsWith('#')) {
            color = '#' + color;
          }
          
          const rgb = this.hexToRgb(color);
          return {
            hex: color,
            name: name,
            rgb: rgb
          };
        });
        
        // Salvar cores da paleta para geração de looks
        this.savedPaletteColors = this.colorPalette.map(color => color.hex);
        
      }
      
      // Processar informações da estação
      if (analysis.season) {
        if (typeof analysis.season === 'string') {
          this.paletteDescription = analysis.season;
        } else if (analysis.season.name) {
          this.paletteDescription = `${analysis.season.name}${analysis.season.description ? ': ' + analysis.season.description : ''}`;
        }
      }
      
      // Armazenar análise completa no serviço
      const imageAnalysis: ImageAnalysisData = {
        faceDetected: true,
        skinTone: typeof analysis.season === 'string' ? analysis.season : analysis.season?.name || 'Não identificado',
        skinToneCategory: this.mapSeasonToCategory(typeof analysis.season === 'string' ? analysis.season : analysis.season?.name),
        colorTemperature: this.extractTemperatureFromSeason(typeof analysis.season === 'string' ? analysis.season : analysis.season?.name),
        analysisTimestamp: new Date(),
        imageUrl: this.selectedImage || undefined
      };
      
      this.imageAnalysisService.setImageAnalysis(imageAnalysis);
      
    } catch (error) {
      console.error('❌ Erro ao processar resultado da análise:', error);
      this.colorPalette = this.generateMockColorPalette();
    }
  }

  // Mapear estação para categoria de tom de pele
  private mapSeasonToCategory(season: string): 'fair' | 'medium' | 'olive' | 'dark' {
    if (!season) return 'medium';
    
    const seasonLower = season.toLowerCase();
    if (seasonLower.includes('inverno')) return 'fair';
    if (seasonLower.includes('verão')) return 'fair';
    if (seasonLower.includes('outono')) return 'olive';
    if (seasonLower.includes('primavera')) return 'medium';
    
    return 'medium';
  }

  // Extrair temperatura da cor da estação
  private extractTemperatureFromSeason(season: string): 'warm' | 'cool' | 'neutral' {
    if (!season) return 'neutral';
    
    const warmSeasons = ['spring', 'autumn', 'warm', 'quente', 'outono', 'primavera'];
    const coolSeasons = ['summer', 'winter', 'cool', 'frio', 'inverno', 'verão'];
    
    const seasonLower = season.toLowerCase();
    
    if (warmSeasons.some(s => seasonLower.includes(s))) {
      return 'warm';
    } else if (coolSeasons.some(s => seasonLower.includes(s))) {
      return 'cool';
    }
    
    return 'neutral';
  }

  isSkinColor(r: number, g: number, b: number): boolean {
    // Algoritmo simples para detectar tons de pele
    // Baseado em ranges típicos de cor de pele humana
    const rg = r - g;
    const rb = r - b;
    const gb = g - b;
    
    // Condições para tons de pele
    return (
      r > 95 && g > 40 && b > 20 &&
      Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
      Math.abs(rg) > 15 && r > g && r > b
    ) || (
      r > 220 && g > 210 && b > 170 &&
      Math.abs(rg) <= 15 && r >= b && g >= b
    );
  }

  getSkinColorName(r: number, g: number, b: number): string {
    // Classificação básica de tons de pele
    const brightness = (r + g + b) / 3;
    const warmth = (r - b) / 255;
    
    if (brightness > 200) {
      return warmth > 0.1 ? 'Tom Claro Quente' : 'Tom Claro Frio';
    } else if (brightness > 150) {
      return warmth > 0.1 ? 'Tom Médio Quente' : 'Tom Médio Frio';
    } else if (brightness > 100) {
      return warmth > 0.1 ? 'Tom Escuro Quente' : 'Tom Escuro Frio';
    } else {
      return 'Tom Profundo';
    }
  }

  hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  extractColors() {
    this.isProcessing = true;
    
    // Simular processamento de extração de cores
    setTimeout(() => {
      this.colorPalette = this.generateMockColorPalette();
      this.isProcessing = false;
      // Removido generateLookTips() - será chamado apenas após salvar a paleta
    }, 2000);
  }

  generateMockColorPalette(): ColorInfo[] {
    // Simulação de extração de cores - em produção seria feita com canvas/biblioteca
    const mockColors = [
      { hex: '#2C3E50', name: 'Azul Marinho', rgb: { r: 44, g: 62, b: 80 } },
      { hex: '#E74C3C', name: 'Vermelho Coral', rgb: { r: 231, g: 76, b: 60 } },
      { hex: '#F39C12', name: 'Laranja Dourado', rgb: { r: 243, g: 156, b: 18 } },
      { hex: '#27AE60', name: 'Verde Esmeralda', rgb: { r: 39, g: 174, b: 96 } },
      { hex: '#8E44AD', name: 'Roxo Ametista', rgb: { r: 142, g: 68, b: 173 } },
      { hex: '#F1C40F', name: 'Amarelo Ouro', rgb: { r: 241, g: 196, b: 15 } }
    ];

    // Retornar 4-6 cores aleatórias
    const shuffled = mockColors.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.floor(Math.random() * 3) + 4);
  }

  resetUpload() {
    this.selectedImage = null;
    this.colorPalette = [];
    this.paletteName = '';
    this.paletteDescription = '';
    this.isProcessing = false;
    
    // Limpar input de arquivo
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  async savePalette() {
    // Validar se há uma imagem selecionada
    if (!this.selectedImage) {
      alert('Por favor, selecione uma imagem antes de salvar a paleta.');
      return;
    }

    // Validar se a imagem ainda é válida
    const isImageValid = await this.validateImageContent(this.selectedImage);
    if (!isImageValid) {
      alert('A imagem selecionada não é mais válida. Por favor, selecione uma nova imagem.');
      this.resetUpload();
      return;
    }

    if (!this.paletteName.trim() || this.colorPalette.length === 0) {
      alert('Por favor, insira um nome para a paleta');
      return;
    }

    this.isSaving = true;

    try {
      // A imagem do rosto já foi salva durante o processamento facial
      // Não é necessário salvar novamente aqui

      const paletteData = {
        name: this.paletteName.trim(),
        description: this.paletteDescription.trim() || undefined,
        colors: this.colorPalette.map(color => color.hex),
        is_public: false,
        user_id: 0 // Será definido pelo backend baseado no token
      };

      const response = await this.apiService.createPalette(paletteData).toPromise();
      
      if (response && response.palette && response.palette.id) {
        // Automatically generate look tips for the new palette
        await this.generateLookTipsForPalette(response.palette.id);
      } else {
        this.isSaving = false;
        this.router.navigate(['/dashboard']);
      }
    } catch (error: any) {
      console.error('Erro ao salvar paleta:', error);
      this.isSaving = false;
      
      // Show success message for palette updates
      if (error.status === 200 || (error.error && error.error.success)) {
        alert('Sua paleta facial foi atualizada com sucesso!');
        this.router.navigate(['/dicas-look']);
      } else {
        alert('Erro ao salvar paleta: ' + (error.error?.message || error.message));
      }
    }
  }

  navigateToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  // Método auxiliar para extrair cores reais da imagem (implementação futura)
  private extractColorsFromImage(imageElement: HTMLImageElement): ColorInfo[] {
    // Aqui seria implementada a lógica real de extração usando Canvas API
    // Por enquanto retornamos cores mock
    return this.generateMockColorPalette();
  }

  // Método para converter RGB para HEX
  private rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // Método para obter nome da cor baseado no valor RGB
  private getColorName(r: number, g: number, b: number): string {
    // Implementação simplificada - em produção usaria uma biblioteca de nomes de cores
    const colorNames: { [key: string]: string } = {
      '#FF0000': 'Vermelho',
      '#00FF00': 'Verde',
      '#0000FF': 'Azul',
      '#FFFF00': 'Amarelo',
      '#FF00FF': 'Magenta',
      '#00FFFF': 'Ciano',
      '#000000': 'Preto',
      '#FFFFFF': 'Branco'
    };

    const hex = this.rgbToHex(r, g, b);
    return colorNames[hex] || 'Cor Personalizada';
  }

  generateLookTipsForPalette(paletteId: number) {
    if (this.colorPalette.length === 0) {
      this.isSaving = false;
      this.router.navigate(['/dashboard']);
      return;
    }

    const colors = this.colorPalette.map(color => color.hex);
    
    this.apiService.generateLookTips(paletteId, colors).subscribe({
      next: (response) => {
        this.isSaving = false;
        this.router.navigate(['/dicas-look']); // Navegar para a página de dicas de look
      },
      error: (error) => {
        console.error('Erro ao gerar dicas de look:', error);
        this.isSaving = false;
        this.router.navigate(['/dashboard']); // Em caso de erro, navegar para dashboard
      }
    });
  }

  analyzeFaceSkinTone(faceColors: ColorInfo[]): { name: string; category: 'fair' | 'medium' | 'olive' | 'dark' } {
    if (faceColors.length === 0) {
      return { name: 'Tom Neutro', category: 'medium' };
    }
    
    // Usar a primeira cor (mais dominante) para análise
    const dominantColor = faceColors[0];
    const rgb = dominantColor.rgb;
    
    const brightness = (rgb.r + rgb.g + rgb.b) / 3;
    const warmth = (rgb.r - rgb.b) / 255;
    
    if (brightness > 200) {
      return {
        name: warmth > 0.1 ? 'Tom Claro Quente' : 'Tom Claro Frio',
        category: 'fair'
      };
    } else if (brightness > 150) {
      return {
        name: warmth > 0.1 ? 'Tom Médio Quente' : 'Tom Médio Frio',
        category: 'medium'
      };
    } else if (brightness > 100) {
      return {
        name: warmth > 0.1 ? 'Tom Escuro Quente' : 'Tom Escuro Frio',
        category: 'olive'
      };
    } else {
      return {
        name: 'Tom Profundo',
        category: 'dark'
      };
    }
  }

  /**
   * Função utilitária para normalizar strings base64 e evitar duplicação de prefixos
   * @param imageData - String base64 que pode ou não ter prefixo
   * @param defaultFormat - Formato padrão da imagem (jpeg, png, webp)
   * @returns String base64 normalizada com prefixo único
   */
  private normalizeBase64Image(imageData: string, defaultFormat: string = 'jpeg'): string {
    if (!imageData) return '';
    
    // Se já tem prefixo data:image/, verificar se não está duplicado
    if (imageData.startsWith('data:image/')) {
      // Verificar se há duplicação do prefixo
      const duplicatedPrefixPattern = /^(data:image\/[^;]+;base64,)(data:image\/[^;]+;base64,)/;
      if (duplicatedPrefixPattern.test(imageData)) {
        // Remover o primeiro prefixo duplicado
        return imageData.replace(duplicatedPrefixPattern, '$2');
      }
      // Se não há duplicação, retornar como está
      return imageData;
    }
    
    // Se não tem prefixo, adicionar o prefixo correto
    const format = this.detectImageFormat(imageData) || defaultFormat;
    return `data:image/${format};base64,${imageData}`;
  }
  
}
