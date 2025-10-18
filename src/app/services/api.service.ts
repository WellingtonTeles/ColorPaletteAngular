import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, switchMap, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { FirebaseAuthService } from './firebase-auth.service';

export interface LookTip {
  id: number;
  client_id: number;
  palette_id: number;
  title: string;
  description: string;
  colors: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface LookTipResponse {
  success: boolean;
  data: LookTip | LookTip[];
  message?: string;
}

export interface ColorPalette {
  id: number;
  name: string;
  colors: string[];
  description?: string;
  is_public: boolean;
  user_id: number;
  created_at: string;
  updated_at: string;
  likes_count?: number;
  is_liked?: boolean;
  authorName?: string;
  authorPhoto?: string;
  faceImageUrl?: string;
  faceImageData?: string;
  originalImageUrl?: string;
  imageBase64?: string;
  imageBinary?: string;
  imageFormat?: string;
  imageSize?: number;
}

export interface PaletteResponse {
  success: boolean;
  palettes: ColorPalette[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private firebaseAuth: FirebaseAuthService
  ) {}

  private async getHeaders(): Promise<HttpHeaders> {
    const token = await this.firebaseAuth.getCurrentUserToken();
    const headersConfig: any = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headersConfig['Authorization'] = `Bearer ${token}`;
    } else if (!environment.production) {
      // Dev bypass: use x-user-id to authenticate against backend for testing
      headersConfig['x-user-id'] = '4';
    }
    return new HttpHeaders(headersConfig);
  }

  // Palettes endpoints
  getPalettes(page: number = 1, limit: number = 20): Observable<PaletteResponse> {
    return this.http.get<PaletteResponse>(`${this.baseUrl}/palettes?page=${page}&limit=${limit}`);
  }

  getMyPalettes(page: number = 1, limit: number = 20): Observable<PaletteResponse> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.get<PaletteResponse>(`${this.baseUrl}/palettes/my?page=${page}&limit=${limit}`, { headers })
      )
    );
  }

  getLikedPalettes(page: number = 1, limit: number = 20): Observable<PaletteResponse> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.get<PaletteResponse>(`${this.baseUrl}/palettes/liked?page=${page}&limit=${limit}`, { headers })
      )
    );
  }

  createPalette(palette: Partial<ColorPalette>): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.post(`${this.baseUrl}/palettes`, palette, { headers })
      )
    );
  }

  updatePalette(id: number, palette: Partial<ColorPalette>): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.put(`${this.baseUrl}/palettes/${id}`, palette, { headers })
      )
    );
  }

  deletePalette(id: number): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.delete(`${this.baseUrl}/palettes/${id}`, { headers })
      )
    );
  }

  likePalette(id: number): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.post(`${this.baseUrl}/palettes/${id}/like`, {}, { headers })
      )
    );
  }

  // Health check
  healthCheck(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`);
  }

  // Auth endpoints
  verifyToken(token: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/verify`, { token });
  }

  registerUser(token: string, displayName?: string, additionalInfo?: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/register`, { 
      token, 
      displayName, 
      additionalInfo 
    });
  }

  getProfile(): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.get(`${this.baseUrl}/auth/profile`, { headers })
      )
    );
  }

  updateProfile(profileData: any): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.put(`${this.baseUrl}/auth/profile`, profileData, { headers })
      )
    );
  }

  // Client profile methods
  getClientProfile(): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.get(`${this.baseUrl}/clients/profile`, { headers })
      )
    );
  }

  updateClientProfile(clientData: any): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.put(`${this.baseUrl}/clients/profile`, clientData, { headers })
      )
    );
  }

  // Buscar imagem salva do cliente (tabela clients - método antigo)
  getClientImage(): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.get(`${this.baseUrl}/clients/image`, { headers })
      )
    );
  }

  // Buscar imagem da tabela image_client (novo método)
  getImageClient(): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.get(`${this.baseUrl}/image-client/my-image`, { headers })
      )
    );
  }

  // Verificar se usuário tem imagem salva na tabela color_palettes
  checkUserImage(): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.get(`${this.baseUrl}/palettes/check-image`, { headers })
      )
    );
  }

  deleteAccount(): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.delete(`${this.baseUrl}/auth/account`, { headers })
      )
    );
  }

  // Look Tips methods
  generateLookTips(paletteId: number, colors: string[]): Observable<LookTipResponse> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.post<LookTipResponse>(`${this.baseUrl}/look-tips/generate/${paletteId}`, 
          { colors }, 
          { headers }
        )
      )
    );
  }

  getLookTipsByPalette(paletteId: number): Observable<LookTipResponse> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.get<LookTipResponse>(`${this.baseUrl}/look-tips/palette/${paletteId}`, { headers })
      )
    );
  }

  getLookTipsByClient(): Observable<LookTipResponse> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.get<LookTipResponse>(`${this.baseUrl}/look-tips/client`, { headers })
      )
    );
  }

  getLookTipById(id: number): Observable<LookTipResponse> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.get<LookTipResponse>(`${this.baseUrl}/look-tips/${id}`, { headers })
      )
    );
  }

  updateLookTip(id: number, lookTipData: Partial<LookTip>): Observable<LookTipResponse> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.put<LookTipResponse>(`${this.baseUrl}/look-tips/${id}`, lookTipData, { headers })
      )
    );
  }

  deleteLookTip(id: number): Observable<LookTipResponse> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.delete<LookTipResponse>(`${this.baseUrl}/look-tips/${id}`, { headers })
      )
    );
  }

  createLookTip(lookTipData: Partial<LookTip>): Observable<LookTipResponse> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.post<LookTipResponse>(`${this.baseUrl}/look-tips`, lookTipData, { headers })
      )
    );
  }

  // Look Tips - Gerar imagem para um look tip
  generateLookImage(lookTipId: number, prompt: string, colors?: string[], context?: string): Observable<any> {
    const requestData = {
      prompt,
      colors,
      context
    };
    
    
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.post(`${this.baseUrl}/look-tips/${lookTipId}/generate-image`, requestData, { headers }).pipe(
          timeout(60000) // 60 segundos de timeout para aguardar DALL-E
        )
      )
    );
  }

  // Look Tips - Testar API de geração de imagens
  testImageGeneration(): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.get(`${this.baseUrl}/look-tips/test/image-generation`, { headers })
      )
    );
  }

  // Método para buscar todas as look tips (alias para getLookTipsByClient)
  getLookTips(): Observable<LookTipResponse> {
    return this.getLookTipsByClient();
  }

  // ===== MÉTODOS PARA LOOKS SALVOS =====

  // Salvar um look
  saveLook(lookData: any): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.post(`${this.baseUrl}/look-tips/saved`, lookData, { headers })
      )
    );
  }

  // Listar looks salvos
  getSavedLooks(params?: any): Observable<any> {
    let queryParams = '';
    if (params) {
      const searchParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          searchParams.append(key, params[key].toString());
        }
      });
      queryParams = searchParams.toString() ? `?${searchParams.toString()}` : '';
    }

    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.get(`${this.baseUrl}/look-tips/saved${queryParams}`, { headers })
      )
    );
  }

  // Buscar look salvo por ID
  getSavedLookById(id: number): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.get(`${this.baseUrl}/look-tips/saved/${id}`, { headers })
      )
    );
  }

  // Atualizar look salvo
  updateSavedLook(id: number, updateData: any): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.put(`${this.baseUrl}/look-tips/saved/${id}`, updateData, { headers })
      )
    );
  }

  // Deletar look salvo
  deleteSavedLook(id: number): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.delete(`${this.baseUrl}/look-tips/saved/${id}`, { headers })
      )
    );
  }

  // Alternar favorito
  toggleSavedLookFavorite(id: number): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.put(`${this.baseUrl}/look-tips/saved/${id}/favorite`, {}, { headers })
      )
    );
  }

  // Obter estatísticas dos looks salvos
  getSavedLooksStats(): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.get(`${this.baseUrl}/look-tips/saved/stats`, { headers })
      )
    );
  }

  // Método para gerar look personalizado
  generatePersonalizedLook(params: any): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.post(`${this.baseUrl}/look-tips/generate-personalized`, params, { headers })
      )
    );
  }

  // Análise de imagem com ChatGPT Vision API
  analyzeImageForPalette(imageData: string): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.post(`${this.baseUrl}/palettes/analyze-image`, { imageData }, { headers })
      )
    );
  }

  // Análise de imagem da tabela image_client com ChatGPT Vision API
  analyzeImageClientForPalette(paletteName?: string): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.post(`${this.baseUrl}/palettes/analyze-image-client`, { paletteName }, { headers })
      )
    );
  }

  // Atualizar imagem na tabela image_client
  updateImageClient(imageData: string): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.put(`${this.baseUrl}/image-client/update`, { imageData }, { headers })
      )
    );
  }

  // Buscar imagem por conteúdo base64 na tabela image_client
  findImageByBase64(imageBase64: string): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.post(`${this.baseUrl}/image-client/find-by-base64`, { imageBase64 }, { headers })
      )
    );
  }

  // Proxy: Buscar imagem externa e converter para base64 (evita CORS no browser)
  fetchExternalImageBase64(imageUrl: string): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.post(`${this.baseUrl}/image-client/fetch-external-base64`, { imageUrl }, { headers })
      )
    );
  }

  // Testar conexão com ChatGPT Vision API
  testImageAnalysis(): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.get(`${this.baseUrl}/palettes/test-analysis`, { headers })
      )
    );
  }
  
  // Gerar look personalizado baseado na paleta
  generateCustomLook(lookType: string, paletteColors: string[], imageData: string): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.post(`${this.baseUrl}/palettes/generate-custom-look`, {
          lookType,
          paletteColors,
          imageData
        }, { headers })
      )
    );
  }

  // Gerar imagem de look com ChatGPT
  generateLookImageWithChatGPT(params: any): Observable<any> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.post(`${this.baseUrl}/look-tips/generate-image-chatgpt`, params, { headers })
      )
    );
  }

  // Gerar look completo com DALL-E usando novo formato de prompt
  generateLookWithDallE(lookType: string, paletteColors: string[], context?: string): Observable<any> {
    const requestData = {
      lookType,
      paletteColors,
      context
    };
    
    
    return from(this.getHeaders()).pipe(
      switchMap(headers => 
        this.http.post(`${this.baseUrl}/look-tips/generate-dalle`, requestData, { headers }).pipe(
          timeout(90000) // 90 segundos de timeout para aguardar DALL-E + ChatGPT
        )
      )
    );
  }
}