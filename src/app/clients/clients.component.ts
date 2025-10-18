import { Component } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-clients',
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss']
})
export class ClientsComponent {

  constructor(private location: Location) { }

  goBack(): void {
    this.location.back();
  }

}
