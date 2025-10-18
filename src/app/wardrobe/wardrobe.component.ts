import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { WardrobeService, WardrobeItem, ClothingCategory, WardrobeStats } from '../services/wardrobe.service';

@Component({
  selector: 'app-wardrobe',
  templateUrl: './wardrobe.component.html',
  styleUrls: ['./wardrobe.component.scss']
})
export class WardrobeComponent implements OnInit {
  // Data properties
  wardrobeItems: WardrobeItem[] = [];
  categories: ClothingCategory[] = [];
  stats: WardrobeStats | null = null;
  
  // UI state
  loading = false;
  saving = false;
  showModal = false;
  editingItem: WardrobeItem | null = null;
  
  // Form data
  currentItem: Partial<WardrobeItem> = {
    colors: []
  };
  newColor = '';
  
  // Filters and search
  searchTerm = '';
  selectedCategory = '';
  selectedSeason = '';
  
  // Pagination
  pagination = {
    page: 1,
    limit: 20,
    hasMore: false
  };

  constructor(
    private location: Location,
    private wardrobeService: WardrobeService
  ) { }

  ngOnInit(): void {
    this.loadInitialData();
  }

  async loadInitialData(): Promise<void> {
    this.loading = true;
    try {
      await Promise.all([
        this.loadWardrobeItems(),
        this.loadCategories(),
        this.loadStats()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadWardrobeItems(): Promise<void> {
    try {
      this.wardrobeService.getWardrobeItems({
        page: this.pagination.page,
        limit: this.pagination.limit,
        search: this.searchTerm || undefined,
        category_id: this.selectedCategory ? parseInt(this.selectedCategory) : undefined,
        season: this.selectedSeason || undefined
      }).subscribe({
        next: (response) => {
          if (response.success && response.items) {
            if (this.pagination.page === 1) {
              this.wardrobeItems = response.items;
            } else {
              this.wardrobeItems.push(...response.items);
            }
            
            this.pagination.hasMore = response.pagination?.hasMore || false;
          }
        },
        error: (error) => {
          console.error('Erro ao carregar itens do guarda-roupa:', error);
        }
      });
    } catch (error) {
      console.error('Erro ao carregar itens do guarda-roupa:', error);
    }
  }

  async loadCategories(): Promise<void> {
    try {
      this.wardrobeService.getClothingCategories().subscribe({
        next: (response) => {
          if (response.success && response.categories) {
            this.categories = response.categories;
          }
        },
        error: (error) => {
          console.error('Erro ao carregar categorias:', error);
        }
      });
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  }

  async loadStats(): Promise<void> {
    try {
      this.wardrobeService.getWardrobeStats().subscribe({
        next: (response) => {
          if (response.success && response.stats) {
            this.stats = response.stats;
          }
        },
        error: (error) => {
          console.error('Erro ao carregar estatísticas:', error);
        }
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  }

  // Search and filter methods
  onSearch(): void {
    this.resetPagination();
    this.loadWardrobeItems();
  }

  onCategoryFilter(): void {
    this.resetPagination();
    this.loadWardrobeItems();
  }

  onSeasonFilter(): void {
    this.resetPagination();
    this.loadWardrobeItems();
  }

  resetPagination(): void {
    this.pagination.page = 1;
    this.pagination.hasMore = false;
  }

  loadMore(): void {
    if (this.pagination.hasMore && !this.loading) {
      this.pagination.page++;
      this.loadWardrobeItems();
    }
  }

  // Modal methods
  openAddItemModal(): void {
    this.editingItem = null;
    this.currentItem = {
      colors: []
    };
    this.newColor = '';
    this.showModal = true;
  }

  editItem(item: WardrobeItem, event: Event): void {
    event.stopPropagation();
    this.editingItem = item;
    this.currentItem = { ...item };
    this.newColor = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingItem = null;
    this.currentItem = { colors: [] };
    this.newColor = '';
  }

  // Color management
  addColor(): void {
    if (this.newColor.trim() && this.currentItem.colors) {
      const color = this.newColor.trim();
      if (!this.currentItem.colors.includes(color)) {
        this.currentItem.colors.push(color);
        this.newColor = '';
      }
    }
  }

  removeColor(index: number): void {
    if (this.currentItem.colors) {
      this.currentItem.colors.splice(index, 1);
    }
  }

  // CRUD operations
  async saveItem(): Promise<void> {
    if (!this.currentItem.name || !this.currentItem.clothing_category_id || !this.currentItem.colors?.length) {
      return;
    }

    this.saving = true;
    try {
      if (this.editingItem) {
        this.wardrobeService.updateWardrobeItem(this.editingItem.id!, this.currentItem as WardrobeItem).subscribe({
          next: (response) => {
            if (response.success) {
              this.closeModal();
              this.resetPagination();
              this.loadWardrobeItems();
              this.loadStats();
            }
          },
          error: (error) => {
            console.error('Erro ao atualizar item:', error);
          },
          complete: () => {
            this.saving = false;
          }
        });
      } else {
        this.wardrobeService.addWardrobeItem(this.currentItem as WardrobeItem).subscribe({
          next: (response) => {
            if (response.success) {
              this.closeModal();
              this.resetPagination();
              this.loadWardrobeItems();
              this.loadStats();
            }
          },
          error: (error) => {
            console.error('Erro ao criar item:', error);
          },
          complete: () => {
            this.saving = false;
          }
        });
      }
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      this.saving = false;
    }
  }

  async deleteItem(item: WardrobeItem, event: Event): Promise<void> {
    event.stopPropagation();
    
    if (!confirm('Tem certeza que deseja excluir esta peça?')) {
      return;
    }

    try {
      this.wardrobeService.deleteWardrobeItem(item.id!).subscribe({
        next: (response) => {
          if (response.success) {
            this.resetPagination();
            this.loadWardrobeItems();
            this.loadStats();
          }
        },
        error: (error) => {
          console.error('Erro ao excluir item:', error);
        }
      });
    } catch (error) {
      console.error('Erro ao excluir item:', error);
    }
  }

  viewItem(item: WardrobeItem): void {
    // Implementar visualização detalhada do item
  }

  // Utility methods
  getCategoriesCount(): number {
    if (!this.stats) return 0;
    return this.stats.categories_count || 0;
  }

  getSeasonsCount(): number {
    const seasons = new Set(this.wardrobeItems.map(item => item.season).filter(Boolean));
    return seasons.size;
  }

  getSeasonLabel(season: string): string {
    const seasonLabels: { [key: string]: string } = {
      'spring': 'Primavera',
      'summer': 'Verão',
      'autumn': 'Outono',
      'winter': 'Inverno'
    };
    return seasonLabels[season] || season;
  }

  onImageError(event: any): void {
    event.target.src = '/assets/placeholder-clothing.svg';
  }

  goBack(): void {
    this.location.back();
  }
}
