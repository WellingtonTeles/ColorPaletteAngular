import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ColorPaletteComponent } from './color-palette/color-palette.component';

// Firebase imports
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { environment } from '../environments/environment';
import { WardrobeComponent } from './wardrobe/wardrobe.component';
import { ClientsComponent } from './clients/clients.component';
import { ProfileComponent } from './profile/profile.component';
import { PaletteGalleryComponent } from './palette-gallery/palette-gallery.component';
import { LookTipsComponent } from './look-tips/look-tips.component';
import { IncluirFotoComponent } from './incluir-foto/incluir-foto.component';
import { TestImageSearchComponent } from './components/test-image-search/test-image-search.component';
import { SavedLooksComponent } from './saved-looks/saved-looks.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    DashboardComponent,
    ColorPaletteComponent,
    WardrobeComponent,
    ClientsComponent,
    ProfileComponent,
    PaletteGalleryComponent,
    LookTipsComponent,
    IncluirFotoComponent,
    TestImageSearchComponent,
    SavedLooksComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAuthModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
