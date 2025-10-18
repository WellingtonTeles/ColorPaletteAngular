import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ColorPaletteComponent } from './color-palette/color-palette.component';
import { WardrobeComponent } from './wardrobe/wardrobe.component';
import { ClientsComponent } from './clients/clients.component';
import { ProfileComponent } from './profile/profile.component';
import { LookTipsComponent } from './look-tips/look-tips.component';
import { IncluirFotoComponent } from './incluir-foto/incluir-foto.component';
import { TestImageSearchComponent } from './components/test-image-search/test-image-search.component';
import { AuthGuard } from './guards/auth.guard';
import { SavedLooksComponent } from './saved-looks/saved-looks.component';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'paleta-cores', component: ColorPaletteComponent, canActivate: [AuthGuard] },
  { path: 'guarda-roupa', component: WardrobeComponent, canActivate: [AuthGuard] },
  { path: 'clientes', component: ClientsComponent, canActivate: [AuthGuard] },
  { path: 'perfil', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: 'dicas-look', component: LookTipsComponent, canActivate: [AuthGuard] },
  { path: 'incluir-foto', component: IncluirFotoComponent, canActivate: [AuthGuard] },
  { path: 'meus-looks', component: SavedLooksComponent, canActivate: [AuthGuard] },
  { path: 'test-image-search', component: TestImageSearchComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
