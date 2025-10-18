import { Injectable, Injector } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { User } from 'firebase/auth';
import firebase from 'firebase/compat/app';
import { ApiService } from './api.service';

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {
  private currentUserSubject = new BehaviorSubject<FirebaseUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private afAuth: AngularFireAuth,
    private router: Router,
    private injector: Injector
  ) {
    // Monitora mudanças no estado de autenticação
    this.afAuth.authState.subscribe(user => {
      if (user) {
        const firebaseUser: FirebaseUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        };
        this.currentUserSubject.next(firebaseUser);
        localStorage.setItem('user', JSON.stringify(firebaseUser));
        // Cache básico imediato
        if (user.displayName || user.email) {
          localStorage.setItem('user_name', user.displayName || user.email || 'Usuário');
        }
        if (user.photoURL) {
          localStorage.setItem('user_photo', user.photoURL);
        }
      } else {
        this.currentUserSubject.next(null);
        localStorage.removeItem('user');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_photo');
        localStorage.removeItem('user_type');
      }
    });
  }

  // Registro com email e senha
  async register(email: string, password: string, displayName?: string): Promise<any> {
    try {
      const result = await this.afAuth.createUserWithEmailAndPassword(email, password);
      
      // Atualizar perfil com nome de exibição
      if (result.user && displayName) {
        await result.user.updateProfile({
          displayName: displayName
        });
      }

      // Enviar email de verificação
      await this.sendEmailVerification();
      
      return {
        success: true,
        message: 'Conta criada com sucesso! Verifique seu email.',
        user: result.user
      };
    } catch (error: any) {
      return {
        success: false,
        message: this.getErrorMessage(error.code)
      };
    }
  }

  // Login com email e senha
  async login(email: string, password: string): Promise<any> {
    try {
      const result = await this.afAuth.signInWithEmailAndPassword(email, password);
      
      if (result.user && !result.user.emailVerified) {
        return {
          success: false,
          message: 'Por favor, verifique seu email antes de fazer login.'
        };
      }

      // Após login bem-sucedido, verificar/criar usuário e cliente no backend
      if (result.user) {
        const apiService = this.injector.get(ApiService);
        let profile: any = null;
        let client: any = null;
        try {
          // Tentar obter o perfil do usuário (requer existir na tabela users)
          profile = await apiService.getProfile().toPromise();
          // Garantir que o cliente exista (cria automaticamente se não existir)
          client = await apiService.getClientProfile().toPromise();
        } catch (profileError: any) {
          // Se o backend exigir registro (403) ou indicar requiresRegistration, registrar usuário
          if (profileError?.status === 403 || profileError?.error?.requiresRegistration) {
            try {
              const token = await result.user.getIdToken();
              await apiService.registerUser(
                token,
                result.user.displayName || result.user.email || 'Usuário'
              ).toPromise();
              // Após registrar usuário, garantir criação/retorno do perfil do cliente
              client = await apiService.getClientProfile().toPromise();
              profile = await apiService.getProfile().toPromise();
            } catch (registerError: any) {
              // Se falhar o registro, seguir sem bloquear o login
            }
          }
        }
        // Cache de nome, foto e tipo de usuário
        this.cacheLocalProfile(result.user, client, profile);
        // Após cache básico, buscar e salvar cores da paleta do usuário
        await this.fetchAndCachePaletteColors(apiService);
      }

      return {
        success: true,
        message: 'Login realizado com sucesso!',
        user: result.user
      };
    } catch (error: any) {
      return {
        success: false,
        message: this.getErrorMessage(error.code)
      };
    }
  }

  // Login com Google
  async loginWithGoogle(): Promise<any> {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await this.afAuth.signInWithPopup(provider);
      
      // Após login bem-sucedido com Google, verificar/criar usuário e cliente no backend
      if (result.user) {
        const apiService = this.injector.get(ApiService);
        let profile: any = null;
        let client: any = null;
        try {
          // Primeiro, tentar obter o perfil do usuário (users)
          profile = await apiService.getProfile().toPromise();
          // Garantir que o cliente exista (clients)
          client = await apiService.getClientProfile().toPromise();
        } catch (profileError: any) {
          // Se o backend exigir registro (403) ou indicar requiresRegistration, registrar usuário
          if (profileError?.status === 403 || profileError?.error?.requiresRegistration) {
            try {
              const token = await result.user.getIdToken();
              await apiService.registerUser(
                token, 
                result.user.displayName || result.user.email || 'Usuário'
              ).toPromise();
              // Após registro, criar/retornar perfil de cliente
              client = await apiService.getClientProfile().toPromise();
              profile = await apiService.getProfile().toPromise();
            } catch (registerError: any) {
              // Não bloquear fluxo em caso de falha
            }
          }
        }
        // Cache de nome, foto e tipo de usuário
        this.cacheLocalProfile(result.user, client, profile);
        // Após cache básico, buscar e salvar cores da paleta do usuário
        await this.fetchAndCachePaletteColors(apiService);
      }
      
      return {
        success: true,
        message: 'Login com Google realizado com sucesso!',
        user: result.user
      };
    } catch (error: any) {
      return {
        success: false,
        message: this.getErrorMessage(error.code)
      };
    }
  }

  // Logout
  async logout(): Promise<void> {
    await this.afAuth.signOut();
    this.router.navigate(['/login']);
  }

  // Enviar email de verificação
  async sendEmailVerification(): Promise<void> {
    const user = await this.afAuth.currentUser;
    if (user) {
      await user.sendEmailVerification();
    }
  }

  // Reset de senha
  async resetPassword(email: string): Promise<any> {
    try {
      await this.afAuth.sendPasswordResetEmail(email);
      return {
        success: true,
        message: 'Email de recuperação enviado com sucesso!'
      };
    } catch (error: any) {
      return {
        success: false,
        message: this.getErrorMessage(error.code)
      };
    }
  }

  // Verificar se usuário está logado
  isLoggedIn(): boolean {
    const user = localStorage.getItem('user');
    return user !== null;
  }

  // Obter usuário atual
  getCurrentUser(): FirebaseUser | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  // Obter token do usuário atual
  async getCurrentUserToken(): Promise<string | null> {
    const user = await this.afAuth.currentUser;
    return user ? await user.getIdToken() : null;
  }

  // Auxiliar: normalizar tipo de usuário
  private normalizeUserType(value?: string): 'standard' | 'vip' | 'premium' | '' {
    const v = (value || '').toString().trim().toLowerCase();
    if (!v) return '';
    if (['standard','padrao','padrão','basico','básico','basic'].includes(v)) return 'standard';
    if (['vip'].includes(v)) return 'vip';
    if (['premium','premio','prêmio'].includes(v)) return 'premium';
    return '';
  }

  // Cache local de nome, foto e tipo
  private cacheLocalProfile(user: firebase.User, client: any, profile: any) {
    const name = user?.displayName || user?.email || profile?.name || profile?.displayName || 'Usuário';
    const photo = user?.photoURL || '';
    const typeCandidates: string[] = [];
    if (profile?.userType) typeCandidates.push(profile.userType);
    if (profile?.type) typeCandidates.push(profile.type);
    if (client?.client_type_name) typeCandidates.push(client.client_type_name);
    if (client?.client_type?.name) typeCandidates.push(client.client_type.name);
    if (client?.client_type) typeCandidates.push(client.client_type);
    const normalized = this.normalizeUserType(typeCandidates.find(t => this.normalizeUserType(t) !== '') || '');

    localStorage.setItem('user_name', name);
    if (photo) localStorage.setItem('user_photo', photo); // foto Firebase
    if (normalized) {
      localStorage.setItem('user_type', normalized);
    }
  }

  // Buscar e salvar cores da paleta do usuário na localStorage
  private async fetchAndCachePaletteColors(apiService: ApiService): Promise<void> {
    try {
      const resp: any = await apiService.getMyPalettes(1, 1).toPromise();
      const palettes = resp?.palettes || resp?.data || [];
      const palette = palettes && palettes.length ? palettes[0] : null;
      const colorsRaw = palette?.colors;
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
      if (colors.length) {
        localStorage.setItem('palette_colors', JSON.stringify(colors));
      }
      if (palette?.id) {
        localStorage.setItem('palette_id', String(palette.id));
      }
    } catch (e) {
      // silencioso: login não deve falhar por causa da paleta
    }
  }

  // Traduzir códigos de erro do Firebase
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'Usuário não encontrado.';
      case 'auth/wrong-password':
        return 'Senha incorreta.';
      case 'auth/email-already-in-use':
        return 'Este email já está em uso.';
      case 'auth/weak-password':
        return 'A senha deve ter pelo menos 6 caracteres.';
      case 'auth/invalid-email':
        return 'Email inválido.';
      case 'auth/user-disabled':
        return 'Esta conta foi desabilitada.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas. Tente novamente mais tarde.';
      case 'auth/network-request-failed':
        return 'Erro de conexão. Verifique sua internet.';
      default:
        return 'Erro inesperado. Tente novamente.';
    }
  }
}