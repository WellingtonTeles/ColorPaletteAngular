import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { FirebaseAuthService } from './firebase-auth.service';

export interface WardrobeItem {
  id?: number;
  client_id?: number;
  clothing_category_id: number;
  name: string;
  brand?: string;
  description?: string;
  colors: string[];
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  image_url?: string;
  purchase_date?: string;
  created_at?: string;
  updated_at?: string;
  category_name?: string;
}

export interface ClothingCategory {
  id: number;
  name: string;
  display_name: string;
  created_at?: string;
}

export interface WardrobeResponse {
  success: boolean;
  items?: WardrobeItem[];
  item?: WardrobeItem;
  pagination?: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
  message?: string;
  error?: string;
}

export interface WardrobeStats {
  total_items: number;
  favorite_items: number;
  categories_count: number;
  colors_used: number;
  seasons_used: number;
  items_by_category: { [key: string]: number };
  items_by_season: { [key: string]: number };
  recent_items: WardrobeItem[];
  avg_price?: number;
  total_value?: number;
}

export interface WardrobeStatsResponse {
  success: boolean;
  stats?: WardrobeStats;
  message?: string;
  error?: string;
}

export interface CategoriesResponse {
  success: boolean;
  categories?: ClothingCategory[];
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WardrobeService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private firebaseAuth: FirebaseAuthService
  ) { }

  private getAuthHeaders(): Observable<HttpHeaders> {
    return from(this.firebaseAuth.getCurrentUserToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        });
        return [headers];
      })
    );
  }

  // Obter todos os itens do guarda-roupa
  getWardrobeItems(params?: {
    page?: number;
    limit?: number;
    category_id?: number;
    season?: string;
    search?: string;
  }): Observable<WardrobeResponse> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => {
        let url = `${this.apiUrl}/wardrobe`;
        
        if (params) {
          const queryParams = new URLSearchParams();
          if (params.page) queryParams.append('page', params.page.toString());
          if (params.limit) queryParams.append('limit', params.limit.toString());
          if (params.category_id) queryParams.append('category_id', params.category_id.toString());
          if (params.season) queryParams.append('season', params.season);
          if (params.search) queryParams.append('search', params.search);
          
          const queryString = queryParams.toString();
          if (queryString) {
            url += `?${queryString}`;
          }
        }
        
        return this.http.get<WardrobeResponse>(url, { headers });
      })
    );
  }

  // Obter item específico do guarda-roupa
  getWardrobeItem(id: number): Observable<WardrobeResponse> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => {
        return this.http.get<WardrobeResponse>(`${this.apiUrl}/wardrobe/${id}`, { headers });
      })
    );
  }

  // Adicionar novo item ao guarda-roupa
  addWardrobeItem(item: Omit<WardrobeItem, 'id' | 'client_id' | 'created_at' | 'updated_at'>): Observable<WardrobeResponse> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => {
        return this.http.post<WardrobeResponse>(`${this.apiUrl}/wardrobe`, item, { headers });
      })
    );
  }

  // Atualizar item do guarda-roupa
  updateWardrobeItem(id: number, item: Partial<WardrobeItem>): Observable<WardrobeResponse> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => {
        return this.http.put<WardrobeResponse>(`${this.apiUrl}/wardrobe/${id}`, item, { headers });
      })
    );
  }

  // Deletar item do guarda-roupa
  deleteWardrobeItem(id: number): Observable<WardrobeResponse> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => {
        return this.http.delete<WardrobeResponse>(`${this.apiUrl}/wardrobe/${id}`, { headers });
      })
    );
  }

  // Obter estatísticas do guarda-roupa
  getWardrobeStats(): Observable<WardrobeStatsResponse> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => {
        return this.http.get<WardrobeStatsResponse>(`${this.apiUrl}/wardrobe/stats`, { headers });
      })
    );
  }

  // Buscar itens do guarda-roupa
  searchWardrobeItems(params: {
    colors?: string[];
    season?: string;
    category_id?: number;
    limit?: number;
  }): Observable<WardrobeResponse> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => {
        let url = `${this.apiUrl}/wardrobe/search`;
        
        const queryParams = new URLSearchParams();
        if (params.colors && params.colors.length > 0) {
          queryParams.append('colors', JSON.stringify(params.colors));
        }
        if (params.season) queryParams.append('season', params.season);
        if (params.category_id) queryParams.append('category_id', params.category_id.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        
        const queryString = queryParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
        
        return this.http.get<WardrobeResponse>(url, { headers });
      })
    );
  }

  // Obter itens por categoria
  getWardrobeByCategory(categoryId: number, limit?: number): Observable<WardrobeResponse> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => {
        let url = `${this.apiUrl}/wardrobe/category/${categoryId}`;
        if (limit) {
          url += `?limit=${limit}`;
        }
        return this.http.get<WardrobeResponse>(url, { headers });
      })
    );
  }

  // Obter categorias de roupas (assumindo que existe uma rota para isso)
  getClothingCategories(): Observable<CategoriesResponse> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => {
        return this.http.get<CategoriesResponse>(`${this.apiUrl}/clothing-categories`, { headers });
      })
    );
  }
}