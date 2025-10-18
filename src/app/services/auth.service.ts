import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface User {
  id: string;
  email: string;
  name: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private users: User[] = [];

  constructor() {
    this.loadUsersFromStorage();
    this.loadCurrentUserFromStorage();
  }

  // CREATE - Registrar novo usuário
  register(userData: RegisterData): Observable<{ success: boolean; message: string; user?: User }> {
    return new Observable(observer => {
      // Verificar se email já existe
      const existingUser = this.users.find(user => user.email === userData.email);
      if (existingUser) {
        observer.next({ success: false, message: 'Email já está em uso' });
        observer.complete();
        return;
      }

      // Criar novo usuário
      const newUser: User = {
        id: this.generateId(),
        email: userData.email,
        name: userData.name,
        password: userData.password,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.users.push(newUser);
      this.saveUsersToStorage();

      // Remover senha do retorno
      const userResponse = { ...newUser };
      delete userResponse.password;

      observer.next({ success: true, message: 'Usuário criado com sucesso', user: userResponse });
      observer.complete();
    });
  }

  // READ - Login do usuário
  login(credentials: LoginCredentials): Observable<{ success: boolean; message: string; user?: User }> {
    return new Observable(observer => {
      const user = this.users.find(u => 
        u.email === credentials.email && u.password === credentials.password
      );

      if (user) {
        const userResponse = { ...user };
        delete userResponse.password;
        
        this.currentUserSubject.next(userResponse);
        this.saveCurrentUserToStorage(userResponse);
        
        observer.next({ success: true, message: 'Login realizado com sucesso', user: userResponse });
      } else {
        observer.next({ success: false, message: 'Email ou senha incorretos' });
      }
      observer.complete();
    });
  }

  // READ - Obter usuário atual
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // READ - Obter todos os usuários (sem senhas)
  getAllUsers(): User[] {
    return this.users.map(user => {
      const userCopy = { ...user };
      delete userCopy.password;
      return userCopy;
    });
  }

  // READ - Obter usuário por ID
  getUserById(id: string): User | null {
    const user = this.users.find(u => u.id === id);
    if (user) {
      const userCopy = { ...user };
      delete userCopy.password;
      return userCopy;
    }
    return null;
  }

  // UPDATE - Atualizar dados do usuário
  updateUser(id: string, updateData: Partial<User>): Observable<{ success: boolean; message: string; user?: User }> {
    return new Observable(observer => {
      const userIndex = this.users.findIndex(u => u.id === id);
      
      if (userIndex === -1) {
        observer.next({ success: false, message: 'Usuário não encontrado' });
        observer.complete();
        return;
      }

      // Verificar se email já existe (se estiver sendo alterado)
      if (updateData.email && updateData.email !== this.users[userIndex].email) {
        const emailExists = this.users.find(u => u.email === updateData.email && u.id !== id);
        if (emailExists) {
          observer.next({ success: false, message: 'Email já está em uso' });
          observer.complete();
          return;
        }
      }

      // Atualizar usuário
      this.users[userIndex] = {
        ...this.users[userIndex],
        ...updateData,
        updatedAt: new Date()
      };

      this.saveUsersToStorage();

      // Atualizar usuário atual se for o mesmo
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.id === id) {
        const updatedUser = { ...this.users[userIndex] };
        delete updatedUser.password;
        this.currentUserSubject.next(updatedUser);
        this.saveCurrentUserToStorage(updatedUser);
      }

      const userResponse = { ...this.users[userIndex] };
      delete userResponse.password;

      observer.next({ success: true, message: 'Usuário atualizado com sucesso', user: userResponse });
      observer.complete();
    });
  }

  // DELETE - Deletar usuário
  deleteUser(id: string): Observable<{ success: boolean; message: string }> {
    return new Observable(observer => {
      const userIndex = this.users.findIndex(u => u.id === id);
      
      if (userIndex === -1) {
        observer.next({ success: false, message: 'Usuário não encontrado' });
        observer.complete();
        return;
      }

      // Remover usuário
      this.users.splice(userIndex, 1);
      this.saveUsersToStorage();

      // Se for o usuário atual, fazer logout
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.id === id) {
        this.logout();
      }

      observer.next({ success: true, message: 'Usuário deletado com sucesso' });
      observer.complete();
    });
  }

  // Logout
  logout(): void {
    this.currentUserSubject.next(null);
    localStorage.removeItem('currentUser');
  }

  // Verificar se está logado
  isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  // Recuperação de senha (simulada)
  forgotPassword(email: string): Observable<{ success: boolean; message: string }> {
    return new Observable(observer => {
      const user = this.users.find(u => u.email === email);
      
      if (user) {
        // Simular envio de email
        observer.next({ 
          success: true, 
          message: 'Instruções de recuperação enviadas para seu email' 
        });
      } else {
        observer.next({ 
          success: false, 
          message: 'Email não encontrado' 
        });
      }
      observer.complete();
    });
  }

  // Métodos privados para persistência
  private saveUsersToStorage(): void {
    localStorage.setItem('users', JSON.stringify(this.users));
  }

  private loadUsersFromStorage(): void {
    const usersData = localStorage.getItem('users');
    if (usersData) {
      this.users = JSON.parse(usersData);
    }
  }

  private saveCurrentUserToStorage(user: User): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  private loadCurrentUserFromStorage(): void {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      this.currentUserSubject.next(JSON.parse(userData));
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
