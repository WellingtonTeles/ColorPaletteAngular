import { Component } from '@angular/core';
import { FirebaseAuthService } from '../services/firebase-auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  name: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private firebaseAuth: FirebaseAuthService,
    private router: Router
  ) {}

  async onSubmit() {
    // Validações básicas
    if (!this.name || !this.email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Por favor, preencha todos os campos';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'As senhas não coincidem';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'A senha deve ter pelo menos 6 caracteres';
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.errorMessage = 'Por favor, digite um email válido';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const result = await this.firebaseAuth.register(this.email, this.password, this.name);
      this.isLoading = false;
      
      if (result.success) {
        this.successMessage = result.message;
        this.clearForm();
        // Redirecionar para login após 2 segundos
        setTimeout(() => {
          this.goToLogin();
        }, 2000);
      } else {
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.isLoading = false;
      this.errorMessage = 'Erro interno do servidor';
      console.error('Erro no cadastro:', error);
    }
  }

  async onGoogleRegister() {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const result = await this.firebaseAuth.loginWithGoogle();
      this.isLoading = false;
      
      if (result.success) {
        this.successMessage = 'Cadastro com Google realizado com sucesso!';
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1000);
      } else {
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.isLoading = false;
      this.errorMessage = 'Erro no cadastro com Google';
      console.error('Erro no cadastro com Google:', error);
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private clearForm() {
    this.name = '';
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
  }
}
