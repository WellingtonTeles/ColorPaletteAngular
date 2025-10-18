import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

interface SavedLook {
  id: number;
  title?: string;
  description?: string;
  look_type?: string;
  generated_image_url?: string;
  image_data?: string;
  colors?: string[] | string;
  tags?: string[] | string;
  payload?: any;
  tip?: string;
  is_favorite?: boolean;
  created_at?: string;
  expanded?: boolean;
}

@Component({
  selector: 'app-saved-looks',
  templateUrl: './saved-looks.component.html',
  styleUrls: ['./saved-looks.component.scss']
})
export class SavedLooksComponent implements OnInit {
  savedLooks: SavedLook[] = [];
  isLoading = false;
  error: string = '';

  // New: user profile and type
  userProfile: any = null;
  userType: 'standard' | 'vip' | 'premium' | '' = '';
  // New: client profile and image availability
  clientProfile: any = null;
  clientImageAvailable: boolean = false;
  clientImageSrc: string | null = null;

  // New: palette info to generate looks
  userPalette: any = null;
  paletteColors: string[] = [];

  // New: generation state
  isGeneratingBatch = false;
  generationMessage: string = '';

  // Toast notification state and helper
  showToast = false;
  toastMessage: string = '';
  toastType: 'info' | 'success' | 'warning' | 'error' = 'info';

  showToastMessage(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => { this.showToast = false; }, 3500);
  }

  isVipTotalExceeded(): boolean {
    return this.getVipTotal() > 7;
  }

  // New: VIP options and monthly restriction
  vipOptions = [
    { key: 'romantico', label: 'Estilo romântico' },
    { key: 'classico', label: 'Estilo clássico' },
    { key: 'casual', label: 'Estilo casual' },
    { key: 'criativo', label: 'Estilo criativo' },
    { key: 'dramatico_urbano', label: 'Estilo dramático urbano' },
    { key: 'elegante', label: 'Estilo elegante' },
    { key: 'sexy', label: 'Estilo sexy' }
  ];
  vipSelection: { [key: string]: { quantity: number } } = {
    romantico: { quantity: 0 },
    classico: { quantity: 0 },
    casual: { quantity: 0 },
    criativo: { quantity: 0 },
    dramatico_urbano: { quantity: 0 },
    elegante: { quantity: 0 },
    sexy: { quantity: 0 }
  };
  canModifyLooks: boolean = true;
  nextChangeDateText: string = '';

  // New: Weekly planner (premium)
  weeklyPlan: { day: string; lookType: string }[] = [
    { day: 'Segunda', lookType: '' },
    { day: 'Terça', lookType: '' },
    { day: 'Quarta', lookType: '' },
    { day: 'Quinta', lookType: '' },
    { day: 'Sexta', lookType: '' },
    { day: 'Sábado', lookType: '' },
    { day: 'Domingo', lookType: '' }
  ];

  // Map frontend look keys to backend enum values
  private mapLookType(key: string): string {
    const mapping: { [key: string]: string } = {
      // antigos
      esportivo: 'esporte',
      casual: 'casual',
      reuniao: 'trabalho',
      elegante: 'sair',
      party: 'festa',
      // novos estilos -> categoria base para armazenamento
      romantico: 'sair',
      classico: 'trabalho',
      criativo: 'sair',
      dramatico_urbano: 'sair',
      sexy: 'festa'
    };
    return mapping[key] || 'casual';
  }

  // Helper: total selecionado para VIP/Premium
  getVipTotal(): number {
    return Object.values(this.vipSelection).reduce((sum, v) => sum + (v.quantity || 0), 0);
  }

  // Atualiza a quantidade de um estilo e valida o total
  onVipQuantityChange(key: string) {
    const current = this.vipSelection[key]?.quantity ?? 0;
    let qty = Number(current);
    if (!Number.isFinite(qty) || qty < 0) qty = 0;
    if (qty > 7) qty = 7;
    this.vipSelection[key] = { quantity: qty };

    const total = this.getVipTotal();
    if (total > 7) {
      this.showToastMessage(`Você selecionou ${total} looks no total (máximo 7). Reduza as quantidades.`, 'error');
    }
  }

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Fallback imediato: ler tipo e foto do localStorage após login
    const cachedType = localStorage.getItem('user_type');
    if (cachedType) {
      this.userType = (cachedType as any);
    }
    const cachedPhoto = localStorage.getItem('user_photo');
    if (cachedPhoto) {
      this.clientImageSrc = cachedPhoto;
      // não alterar disponibilidade aqui; confirmação virá do backend
    }
    this.updateMonthlyRestriction();

    // Garantir paleta disponível antes de qualquer avaliação
    this.ensurePaletteColors();

    // Carregar paleta do usuário pelo backend
    this.loadUserPalette();

    // Após tentar preencher paleta, avaliar auto geração
    this.evaluateAutoGeneration();

    // Continuar com carregamentos da API
    this.loadClientProfile();
    this.loadUserProfile();
    this.loadSavedLooks();
  }

  loadSavedLooks() {
    this.isLoading = true;
    this.apiService.getSavedLooks().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.savedLooks = (response.data || []).map((savedLook: any) => {
            // Parse campos JSON se vierem como string
            try {
              if (typeof savedLook.colors === 'string') {
                savedLook.colors = JSON.parse(savedLook.colors || '[]');
              }
              if (typeof savedLook.tags === 'string') {
                savedLook.tags = JSON.parse(savedLook.tags || '[]');
              }
              if (typeof savedLook.payload === 'string') {
                savedLook.payload = JSON.parse(savedLook.payload || '{}');
              }
            } catch (e) {
              // silêncio: evitar travar caso JSON inválido
            }
            savedLook.expanded = false;
            return savedLook as SavedLook;
          });
          this.error = '';
          // Load any previously saved weekly plan from looks
          this.loadExistingWeeklyPlan();
        } else {
          this.error = response.message || 'Erro ao carregar looks salvos.';
        }
        this.isLoading = false;
        this.evaluateAutoGeneration();
      },
      error: (error: any) => {
        this.error = error?.message || 'Erro ao carregar looks salvos.';
        this.isLoading = false;
        this.evaluateAutoGeneration();
      }
    });
  }

  toggleAccordion(look: SavedLook) {
    look.expanded = !look.expanded;
  }

  getImageSrc(look: SavedLook): string | null {
    if (look.image_data) {
      if (look.image_data.startsWith('data:image/')) {
        return look.image_data;
      }
      // fallback: assumir PNG base64
      return `data:image/png;base64,${look.image_data}`;
    }
    return look.generated_image_url || null;
  }

  // Helpers para template estrito
  getColors(look: SavedLook): string[] {
    const c = look.colors as any;
    if (!c) return [];
    if (Array.isArray(c)) {
      return c.filter((v: any) => typeof v === 'string');
    }
    if (typeof c === 'string') {
      try {
        const parsed = JSON.parse(c);
        if (Array.isArray(parsed)) return parsed.filter((v: any) => typeof v === 'string');
      } catch {}
      return c.split(/[\s,;]+/).filter(Boolean);
    }
    return [];
  }

  getTags(look: SavedLook): string[] {
    const t = look.tags as any;
    if (!t) return [];
    if (Array.isArray(t)) {
      return t.filter((v: any) => typeof v === 'string');
    }
    if (typeof t === 'string') {
      try {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed)) return parsed.filter((v: any) => typeof v === 'string');
      } catch {}
      return t.split(/[\s,;]+/).filter(Boolean);
    }
    return [];
  }

  getTipText(look: SavedLook): string {
    return (
      look.tip || look.description || (look.payload && (look.payload.description || look.payload.tip)) || ''
    );
  }

  deleteSavedLook(look: SavedLook) {
    if (!look.id) return;
    if (confirm('Tem certeza que deseja excluir este look salvo?')) {
      this.apiService.deleteSavedLook(look.id).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.savedLooks = this.savedLooks.filter((l: SavedLook) => l.id !== look.id);
            alert('Look salvo excluído com sucesso!');
          } else {
            alert('Erro ao excluir look salvo: ' + (response.message || ''));
          }
        },
        error: (error: any) => {
          alert('Erro ao excluir look salvo. Tente novamente.');
        }
      });
    }
  }

  shareSavedLook(look: SavedLook) {
    const url = `${window.location.origin}/meus-looks?look=${look.id}`;
    const text = this.getTipText(look) || `Confira meu look salvo: ${look.title || ''}`;
    const title = `Look: ${look.title || 'Vestria'}`;

    if ((navigator as any).share) {
      (navigator as any).share({ title, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert('Link do look copiado para a área de transferência!');
      }).catch(() => {
        alert('Não foi possível copiar o link.');
      });
    }
  }

  formatTextWithBoldAndColors(inputText: string): string {
    if (!inputText) return '';
    let formattedText = inputText;

    // Negrito para palavras entre **
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Quebras de linha duplas em parágrafos
    formattedText = formattedText.replace(/\n\n/g, '<br/><br/>' );
    // Adicionar marcador ao lado de códigos hex de cor
    formattedText = formattedText.replace(/(#(?:[0-9a-fA-F]{3}){1,2})/g, (match: string) => {
      const color = match;
      return `<span class="color-chip" style="background:${color}"></span><span>${color}</span>`;
    });

    return formattedText;
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  // Load user profile to get user type

  // Load user profile to get user type
  loadUserProfile() {
    this.apiService.getProfile().subscribe({
      next: (profile: any) => {
        const userObj = (profile && profile.user) ? profile.user : profile;
        this.userProfile = userObj;
        // Try to derive via client relationship (clients/clients_types) if available later
        const typeFromProfile = (userObj as any)?.userType || (userObj as any)?.type || '';
        const derived = this.deriveUserType(typeFromProfile, this.clientProfile);
        // Priorizar client_types: só usar valor do perfil se ainda não definido
        if (derived && !this.userType) {
          this.userType = derived as any;
        }
        this.updateMonthlyRestriction();
        this.evaluateAutoGeneration();
      },
      error: () => {
        // silent
      }
    });
  }

  // Load client profile to determine user type via clients/clients_types
  loadClientProfile() {
    this.apiService.getClientProfile().subscribe({
      next: (client: any) => {
        const clientObj = (client && client.client) ? client.client : client;
        this.clientProfile = clientObj;
        const derived = this.deriveUserType('', clientObj);
        if (derived) this.userType = derived as any;
        // Extrair imagem diretamente da tabela clients (face_image_data)
        const base64Data = clientObj?.face_image_data || clientObj?.faceImageData;
        const urlData = clientObj?.face_image_url || clientObj?.faceImageUrl || clientObj?.original_image_url || clientObj?.originalImageUrl;
        let imgSrc: string | null = null;
        if (base64Data) {
          imgSrc = base64Data.startsWith('data:image/') ? base64Data : `data:image/png;base64,${base64Data}`;
        } else if (urlData) {
          imgSrc = urlData;
        }
        this.clientImageSrc = imgSrc;
        this.clientImageAvailable = !!imgSrc;
        if (!imgSrc) {
          // Fallback para endpoints de imagem
          this.checkClientImageAvailability();
        } else {
          this.generationMessage = '';
        }
        this.updateMonthlyRestriction();
        this.evaluateAutoGeneration();
      },
      error: () => {
        // If cannot load client profile, still proceed with user profile
        this.clientProfile = null;
      }
    });
  }

  // Derive normalized user type (standard|vip|premium) from various possible fields
  private deriveUserType(typeCandidate: string, client: any): 'standard' | 'vip' | 'premium' | '' {
    const normalize = (value?: string) => (value || '').toString().trim().toLowerCase();
    const candidates: string[] = [];
    if (typeCandidate) candidates.push(typeCandidate);
    if (client) {
      candidates.push(client?.client_type_name);
      candidates.push(client?.client_type?.name);
      candidates.push(client?.client_type); // aceitar string direta vinda do backend
      candidates.push(client?.type);
      candidates.push(client?.clientType);
    }
    // Fallback: mapear IDs numéricos
    const idRaw = client?.client_type_id ?? client?.clientTypeId ?? client?.type_id;
    if (idRaw !== undefined && idRaw !== null) {
      const idNum = Number(idRaw);
      if (!Number.isNaN(idNum)) {
        if (idNum === 1) return 'standard';
        if (idNum === 2) return 'vip';
        if (idNum === 3) return 'premium';
      }
    }
    for (const c of candidates) {
      const v = normalize(c);
      if (!v) continue;
      if (['standard','padrao','padrão','basico','básico','basic'].includes(v)) return 'standard';
      if (['vip'].includes(v)) return 'vip';
      if (['premium','premio','prêmio'].includes(v)) return 'premium';
    }
    return '';
  }

  getUserTypeLabel(type: string): string {
    switch ((type || '').toLowerCase()) {
      case 'standard': return 'Padrão';
      case 'vip': return 'VIP';
      case 'premium': return 'Premium';
      default: return 'Desconhecido';
    }
  }

  // Check if client has an image saved to be used by the generation prompt
  private checkClientImageAvailability() {
    this.apiService.getImageClient().subscribe({
      next: (resp: any) => {
        const data = resp?.data || resp;
        const base64Data = data?.image_base64 || data?.imageData || data?.face_image_data;
        const urlData = data?.url || data?.image_url || data?.imageUrl;
        let imgSrc: string | null = null;
        if (base64Data) {
          imgSrc = base64Data.startsWith('data:image/') ? base64Data : `data:image/png;base64,${base64Data}`;
        } else if (urlData) {
          imgSrc = urlData;
        }
        this.clientImageSrc = imgSrc;
        this.clientImageAvailable = !!imgSrc;
        if (!imgSrc) {
          this.generationMessage = 'Para gerar looks fiéis ao seu rosto, inclua uma imagem em Incluir Foto.';
        } else {
          this.generationMessage = '';
        }
      },
      error: () => {
        // Try legacy endpoint
        this.apiService.getClientImage().subscribe({
          next: (resp2: any) => {
            const data2 = resp2?.data || resp2;
            const base64Data2 = data2?.image || data2?.imageData || data2?.face_image_data;
            const urlData2 = data2?.url || data2?.image_url || data2?.imageUrl;
            let imgSrc2: string | null = null;
            if (base64Data2) {
              imgSrc2 = base64Data2.startsWith('data:image/') ? base64Data2 : `data:image/png;base64,${base64Data2}`;
            } else if (urlData2) {
              imgSrc2 = urlData2;
            }
            this.clientImageSrc = imgSrc2;
            this.clientImageAvailable = !!imgSrc2;
            if (!imgSrc2) {
              this.generationMessage = 'Para gerar looks fiéis ao seu rosto, inclua uma imagem em Incluir Foto.';
            } else {
              this.generationMessage = '';
            }
          },
          error: () => {
            this.clientImageSrc = null;
            this.clientImageAvailable = false;
            this.generationMessage = 'Para gerar looks fiéis ao seu rosto, inclua uma imagem em Incluir Foto.';
          }
        });
      }
    });
  }

  // Load palette (first/my palette) to get colors
  loadUserPalette() {
    this.apiService.getMyPalettes(1, 1).subscribe({
      next: (resp: any) => {
        const palettes = resp?.palettes || resp?.data || [];
        this.userPalette = palettes && palettes.length ? palettes[0] : null;
        const colorsRaw = this.userPalette?.colors;
        if (Array.isArray(colorsRaw)) {
          // Suporta arrays de strings e objetos ({ hex } ou { color })
          this.paletteColors = colorsRaw
            .map((item: any) => {
              if (typeof item === 'string') return item;
              if (item && typeof item === 'object') return item.hex || item.color || '';
              return '';
            })
            .filter((c: any) => typeof c === 'string' && c.trim().length > 0);
        } else if (typeof colorsRaw === 'string') {
          try {
            const parsed = JSON.parse(colorsRaw);
            this.paletteColors = Array.isArray(parsed)
              ? parsed
                  .map((item: any) => {
                    if (typeof item === 'string') return item;
                    if (item && typeof item === 'object') return item.hex || item.color || '';
                    return '';
                  })
                  .filter((c: any) => typeof c === 'string' && c.trim().length > 0)
              : colorsRaw.split(/[,;\s]+/).filter(Boolean);
          } catch {
            this.paletteColors = colorsRaw.split(/[,;\s]+/).filter(Boolean);
          }
        } else if (colorsRaw && typeof colorsRaw === 'object') {
          const arr = (colorsRaw as any).colors || (colorsRaw as any).palette || [];
          this.paletteColors = Array.isArray(arr)
            ? arr
                .map((item: any) => {
                  if (typeof item === 'string') return item;
                  if (item && typeof item === 'object') return item.hex || item.color || '';
                  return '';
                })
                .filter((c: any) => typeof c === 'string' && c.trim().length > 0)
            : [];
        } else {
          this.paletteColors = [];
        }
        // Normalizar para formato #hex
        this.paletteColors = this.paletteColors.map((c: string) => (c.startsWith('#') ? c : `#${c}`));
        // Persistir para reuso rápido
        if (this.paletteColors.length) {
          localStorage.setItem('palette_colors', JSON.stringify(this.paletteColors));
        }
        // Persistir palette_id para fallback
        if (this.userPalette?.id) {
          localStorage.setItem('palette_id', String(this.userPalette.id));
        }
        this.evaluateAutoGeneration();
      },
      error: () => {
        this.userPalette = null;
        this.paletteColors = [];
      }
    });
  }

  // Fallbacks para obter cores da paleta no onInit
  private ensurePaletteColors() {
    if (this.paletteColors.length) return;
    // Tentar localStorage primeiro
    const stored = localStorage.getItem('palette_colors');
    if (stored) {
      try {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.length) {
          this.paletteColors = arr.filter((c: any) => typeof c === 'string');
          this.evaluateAutoGeneration();
          return;
        }
      } catch {}
    }
    // Tentar detectar via imagem do cliente (servidor possui a imagem salva)
    this.analyzeClientImageForPalette();
  }

  private analyzeClientImageForPalette() {
    this.apiService.analyzeImageClientForPalette().subscribe({
      next: (resp: any) => {
        const colors = this.extractColorsFromResponse(resp);
        if (colors.length) {
          this.paletteColors = colors;
          localStorage.setItem('palette_colors', JSON.stringify(colors));
          this.showToastMessage('Paleta detectada a partir da sua imagem.', 'success');
          this.evaluateAutoGeneration();
        }
      },
      error: () => {
        // manter silêncio; usuário poderá tentar novamente mais tarde
      }
    });
  }

  private extractColorsFromResponse(resp: any): string[] {
    const d = resp?.data ?? resp;
    const paletteObj = d?.palette ?? d?.paleta ?? d?.result?.palette ?? d?.result?.paleta ?? resp?.palette;
    const rawColors = d?.colors ?? paletteObj?.colors ?? d?.palette_colors ?? paletteObj?.palette_colors ?? d?.paletteColors ?? paletteObj?.paletteColors;
    let arr: any[] = [];
    if (Array.isArray(rawColors)) {
      arr = rawColors;
    } else if (typeof rawColors === 'string') {
      try {
        const parsed = JSON.parse(rawColors);
        arr = Array.isArray(parsed) ? parsed : rawColors.split(/[,;\s]+/);
      } catch {
        arr = rawColors.split(/[,;\s]+/);
      }
    } else if (rawColors && typeof rawColors === 'object') {
      arr = (rawColors as any).colors || (rawColors as any).palette || [];
    }
    const colors = arr
      .map((item: any) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') return item.hex || item.color || '';
        return '';
      })
      .filter((c: any) => typeof c === 'string' && c.trim().length > 0)
      .map((c: string) => c.trim().startsWith('#') ? c.trim() : `#${c.trim()}`);
    return colors;
  }

  // Adicionado: helper para obter palette_id válido (dentro da classe)
  private getPaletteId(): number | null {
    const id = (this.userPalette as any)?.id;
    if (typeof id === 'number' && Number.isFinite(id)) return id;
    const cached = localStorage.getItem('palette_id');
    if (cached) {
      const n = parseInt(cached, 10);
      if (Number.isFinite(n)) return n;
    }
    return null;
  }

  // Evaluate auto-generation for standard users
  evaluateAutoGeneration() {
    if (this.userType === 'standard' && !this.isLoading && this.savedLooks.length === 0 && this.paletteColors.length && !this.isGeneratingBatch) {
      this.generateStandardLooksBatch();
    }
  }

  // Monthly restriction for VIP/Premium: only allow changes once per 30 days
  updateMonthlyRestriction() {
    if (this.userType === 'vip' || this.userType === 'premium') {
      const key = 'looks_last_generation_at';
      const stored = localStorage.getItem(key);
      if (stored) {
        const last = new Date(stored);
        const now = new Date();
        const diffMs = now.getTime() - last.getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        this.canModifyLooks = days >= 30;
        if (!this.canModifyLooks) {
          const remaining = Math.max(0, 30 - days);
          this.nextChangeDateText = `Você poderá alterar seus looks em ${remaining} dia(s).`;
        } else {
          this.nextChangeDateText = '';
        }
      } else {
        this.canModifyLooks = true;
        this.nextChangeDateText = '';
      }
    } else {
      this.canModifyLooks = true;
      this.nextChangeDateText = '';
    }
  }

  // Generate standard batch: 7 looks (2 esportivo, 3 casual, 2 reuniao)
  async generateStandardLooksBatch() {
    if (!this.paletteColors.length) {
      // tentar fallback imediato via localStorage/servidor
      this.ensurePaletteColors();
    }
    if (!this.paletteColors.length) {
      this.generationMessage = 'Paleta indisponível para gerar looks.';
      return;
    }
    this.isGeneratingBatch = true;
    this.generationMessage = 'Gerando 7 looks automaticamente (2 esportivos, 3 casuais, 2 profissionais) com DALL-E 3... Esta geração pode levar cerca de 3 minutos. Aguarde...';

    const plan = [
      { type: 'esportivo', count: 2 },
      { type: 'casual', count: 3 },
      { type: 'reuniao', count: 2 }
    ];

    try {
      for (const item of plan) {
        for (let i = 0; i < item.count; i++) {
          await this.generateAndSaveLook(item.type);
        }
      }
      this.generationMessage = 'Looks gerados e salvos com sucesso!';
      localStorage.setItem('looks_last_generation_at', new Date().toISOString());
      this.updateMonthlyRestriction();
      this.loadSavedLooks();
    } catch (e) {
      this.generationMessage = 'Falha ao gerar alguns looks. Tente novamente mais tarde.';
    } finally {
      this.isGeneratingBatch = false;
    }
  }

  // Generate VIP/Premium batch based on selection (máximo 7)
  async generateVipLooksBatch() {
    if (!(this.userType === 'vip' || this.userType === 'premium')) return;
    if (!this.canModifyLooks) return;
    const total = this.getVipTotal();
    const MAX = 7;
    if (total <= 0) {
      this.showToastMessage('Defina quantidades para pelo menos um estilo.', 'warning');
      return;
    }
    if (total > MAX) {
      this.showToastMessage(`Você selecionou ${total} looks, o máximo permitido é ${MAX}. Reduza as quantidades.`, 'error');
      return;
    }
    if (!this.paletteColors.length) {
      // tentar fallback imediato via localStorage/servidor
      this.ensurePaletteColors();
    }
    if (!this.paletteColors.length) {
      this.showToastMessage('Nenhuma paleta encontrada para gerar os looks.', 'warning');
      return;
    }
    this.isGeneratingBatch = true;
    this.generationMessage = 'A geração com DALL·E 3 pode levar cerca de 3 minutos. Por favor, aguarde enquanto criamos seus looks.';
    try {
      for (const opt of this.vipOptions) {
        const qty = this.vipSelection[opt.key]?.quantity || 0;
        if (qty > 0) {
          for (let i = 0; i < qty; i++) {
            await this.generateAndSaveLook(opt.key);
          }
        }
      }
      this.generationMessage = 'Looks gerados e salvos com sucesso!';
      localStorage.setItem('looks_last_generation_at', new Date().toISOString());
      this.updateMonthlyRestriction();
      this.loadSavedLooks();
    } catch (e) {
      this.showToastMessage('Falha ao gerar alguns looks. Tente novamente.', 'error');
    } finally {
      this.isGeneratingBatch = false;
    }
  }

  // Método geral para gerar looks conforme pacote
  generateLooks() {
    if (this.isGeneratingBatch) return;
    if (!this.paletteColors.length) {
      // tentar fallback imediato via localStorage/servidor
      this.ensurePaletteColors();
    }
    if (!this.paletteColors.length) {
      this.showToastMessage('Nenhuma paleta encontrada para gerar os looks.', 'warning');
      return;
    }
    if (!this.clientImageAvailable) {
      this.showToastMessage('É necessário incluir uma imagem do cliente para que a geração use a referência do rosto. Vá em "Incluir Foto" e adicione sua imagem.', 'warning');
      this.router.navigate(['/incluir-foto']);
      return;
    }
    if (this.userType === 'standard') {
      this.generateStandardLooksBatch();
      return;
    }
    if (this.userType === 'vip' || this.userType === 'premium') {
      if (!this.canModifyLooks) {
        this.showToastMessage(this.nextChangeDateText || 'Você poderá alterar seus looks novamente mais tarde.', 'warning');
        return;
      }
      if (this.getVipTotal() > 7) {
        this.showToastMessage(`Você selecionou ${this.getVipTotal()} looks, o máximo permitido é 7. Reduza as quantidades.`, 'error');
        return;
      }
      this.generateVipLooksBatch();
      return;
    }
    this.showToastMessage('Defina seu tipo de pacote para gerar os looks.', 'warning');
  }

  // Helper to call API generate and save
  private async generateAndSaveLook(lookType: string): Promise<void> {
    const response: any = await firstValueFrom(this.apiService.generateLookWithDallE(lookType, this.paletteColors, 'referencia: imagem_cliente'));
    if (!response?.success) throw new Error('Erro na geração com DALL-E');
    const desc: string = response.description || (response.data?.description) || '';
    const imageUrl: string = response.imageUrl || response.generatedImageUrl || null;
    const optLabel = this.vipOptions.find(o => o.key === lookType)?.label || `Look ${lookType.charAt(0).toUpperCase() + lookType.slice(1)}`;
    const tags: string[] = [lookType, 'dalle'];
    const mappedType = this.mapLookType(lookType);
    const lookData: any = {
      palette_id: this.getPaletteId(),
      look_type: mappedType,
      title: optLabel,
      description: desc,
      tip: desc,
      generated_image_url: imageUrl,
      image_data: null,
      payload: {
        generationParams: {
          lookType: lookType,
          lookLabel: optLabel,
          paletteColors: this.paletteColors,
          clientImageUsed: this.clientImageAvailable
        },
        source: 'meus-looks',
        dalle: {
          prompt: response.prompt,
          clientImageUsed: response.clientImageUsed ?? this.clientImageAvailable,
          timestamp: response.timestamp
        },
        timestamp: new Date().toISOString()
      },
      colors: this.paletteColors,
      tags: tags
    };
    const saveResp: any = await firstValueFrom(this.apiService.saveLook(lookData));
    if (!saveResp?.success) throw new Error('Erro ao salvar look');
  }

  // Load existing weekly plan from saved looks (tag weekly-plan)
  loadExistingWeeklyPlan() {
    const planLook = this.savedLooks.find((l: SavedLook) => {
      const tags = l.tags as any;
      if (!tags) return false;
      if (Array.isArray(tags)) return (tags as string[]).includes('weekly-plan');
      if (typeof tags === 'string') {
        try {
          const parsed = JSON.parse(tags);
          if (Array.isArray(parsed)) return parsed.includes('weekly-plan');
        } catch {}
        return (tags as string).split(/[\s,;]+/).includes('weekly-plan');
      }
      return false;
    });
    if (planLook && (planLook as any).payload && (planLook as any).payload.weeklyPlan) {
      this.weeklyPlan = (planLook as any).payload.weeklyPlan;
    }
  }

  // Save weekly plan (premium)
  saveWeeklyPlan() {
    if (this.userType !== 'premium') return;
    const lookData: any = {
      palette_id: this.getPaletteId(),
      look_type: 'casual',
      title: 'Planejamento da Semana',
      description: 'Programação de looks para a semana',
      tip: null,
      generated_image_url: null,
      image_data: null,
      payload: {
        weeklyPlan: this.weeklyPlan,
        timestamp: new Date().toISOString()
      },
      colors: this.paletteColors,
      tags: ['weekly-plan']
    };

    this.apiService.saveLook(lookData).subscribe({
      next: (response: any) => {
        if (response.success) {
          alert('Planejamento semanal salvo com sucesso!');
          this.loadSavedLooks();
        } else {
          alert('Erro ao salvar planejamento semanal.');
        }
      },
      error: () => {
        alert('Erro ao salvar planejamento semanal.');
      }
    });
  }
}