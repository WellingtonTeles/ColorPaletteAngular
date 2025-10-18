import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ImageAnalysisData {
  skinTone?: string;
  skinToneCategory?: 'fair' | 'medium' | 'olive' | 'dark';
  dominantColors?: string[];
  colorTemperature?: 'warm' | 'cool' | 'neutral';
  brightness?: number;
  contrast?: number;
  faceDetected?: boolean;
  imageUrl?: string;
  analysisTimestamp?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ImageAnalysisService {
  private imageAnalysisSubject = new BehaviorSubject<ImageAnalysisData | null>(null);
  public imageAnalysis$ = this.imageAnalysisSubject.asObservable();

  constructor() { }

  /**
   * Armazena os dados de análise da imagem
   */
  setImageAnalysis(data: ImageAnalysisData): void {
    data.analysisTimestamp = new Date();
    this.imageAnalysisSubject.next(data);
  }

  /**
   * Obtém os dados atuais de análise da imagem
   */
  getCurrentImageAnalysis(): ImageAnalysisData | null {
    return this.imageAnalysisSubject.value;
  }

  /**
   * Limpa os dados de análise da imagem
   */
  clearImageAnalysis(): void {
    this.imageAnalysisSubject.next(null);
  }

  /**
   * Analisa uma imagem e extrai características visuais
   */
  analyzeImage(imageElement: HTMLImageElement): Promise<ImageAnalysisData> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = imageElement.width;
      canvas.height = imageElement.height;
      ctx.drawImage(imageElement, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      
      // Análise de cores dominantes
      const colorMap = new Map<string, number>();
      const sampleRate = 20; // Analisar a cada 20 pixels para performance
      
      let totalR = 0, totalG = 0, totalB = 0;
      let pixelCount = 0;
      
      for (let i = 0; i < pixels.length; i += 4 * sampleRate) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const alpha = pixels[i + 3];
        
        if (alpha < 128) continue; // Ignorar pixels transparentes
        
        totalR += r;
        totalG += g;
        totalB += b;
        pixelCount++;
        
        const hex = this.rgbToHex(r, g, b);
        colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
      }
      
      // Cores dominantes
      const dominantColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([hex]) => hex);
      
      // Cor média
      const avgR = Math.round(totalR / pixelCount);
      const avgG = Math.round(totalG / pixelCount);
      const avgB = Math.round(totalB / pixelCount);
      
      // Análise de temperatura de cor
      const colorTemperature = this.analyzeColorTemperature(avgR, avgG, avgB);
      
      // Análise de brilho
      const brightness = (avgR + avgG + avgB) / 3;
      
      // Análise de contraste (simplificada)
      const contrast = this.calculateContrast(pixels, sampleRate);
      
      // Análise de tom de pele (baseada na cor média)
      const skinToneAnalysis = this.analyzeSkinTone(avgR, avgG, avgB);
      
      const analysisData: ImageAnalysisData = {
        skinTone: skinToneAnalysis.name,
        skinToneCategory: skinToneAnalysis.category,
        dominantColors,
        colorTemperature,
        brightness,
        contrast,
        faceDetected: false, // Será atualizado se houver detecção facial
        imageUrl: imageElement.src
      };
      
      resolve(analysisData);
    });
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  private analyzeColorTemperature(r: number, g: number, b: number): 'warm' | 'cool' | 'neutral' {
    const warmth = (r - b) / 255;
    
    if (warmth > 0.1) return 'warm';
    if (warmth < -0.1) return 'cool';
    return 'neutral';
  }

  private calculateContrast(pixels: Uint8ClampedArray, sampleRate: number): number {
    let minBrightness = 255;
    let maxBrightness = 0;
    
    for (let i = 0; i < pixels.length; i += 4 * sampleRate) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const alpha = pixels[i + 3];
      
      if (alpha < 128) continue;
      
      const brightness = (r + g + b) / 3;
      minBrightness = Math.min(minBrightness, brightness);
      maxBrightness = Math.max(maxBrightness, brightness);
    }
    
    return maxBrightness - minBrightness;
  }

  private analyzeSkinTone(r: number, g: number, b: number): { name: string; category: 'fair' | 'medium' | 'olive' | 'dark' } {
    const brightness = (r + g + b) / 3;
    const warmth = (r - b) / 255;
    
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
}