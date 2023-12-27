import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RequiredModulesService } from './services/required-modules.service';
import { FileService } from './services/file.service';
import { BluetoothService } from './services/bluetooth.service';
import { HomeComponent } from './pages/home/home.component';
import { SerialComponent } from './pages/serial/serial.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [AppComponent, HomeComponent, SerialComponent],
  imports: [BrowserModule, AppRoutingModule, FormsModule],
  providers: [RequiredModulesService, FileService, BluetoothService],
  bootstrap: [AppComponent],
})
export class AppModule {}
