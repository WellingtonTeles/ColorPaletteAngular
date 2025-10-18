import { Component } from '@angular/core';
import { FirebaseAuthService } from '../services/firebase-auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  showPassword: boolean = false;

  constructor(
    private firebaseAuth: FirebaseAuthService,
    private router: Router
  ) {}

  async onSubmit() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor, preencha todos os campos';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const result = await this.firebaseAuth.login(this.email, this.password);
      this.isLoading = false;
      
      if (result.success) {
        this.successMessage = 'Login realizado com sucesso!';
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1000);
      } else {
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.isLoading = false;
      this.errorMessage = 'Erro interno do servidor';
      console.error('Erro no login:', error);
    }
  }

  async onForgotPassword() {
    if (!this.email) {
      this.errorMessage = 'Por favor, digite seu email primeiro';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const result = await this.firebaseAuth.resetPassword(this.email);
      this.isLoading = false;
      
      if (result.success) {
        this.successMessage = result.message;
      } else {
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.isLoading = false;
      this.errorMessage = 'Erro interno do servidor';
      console.error('Erro na recuperação de senha:', error);
    }
  }

  async onGoogleLogin() {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const result = await this.firebaseAuth.loginWithGoogle();
      this.isLoading = false;
      
      if (result.success) {
        this.successMessage = 'Login com Google realizado com sucesso!';
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1000);
      } else {
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.isLoading = false;
      this.errorMessage = 'Erro no login com Google';
      console.error('Erro no login com Google:', error);
    }
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
