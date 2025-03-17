import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'camera-page',
  templateUrl: './camera-page.component.html',
  styleUrl: './camera-page.component.css'
})
export class CameraPageComponent implements OnInit {
  url = 'http://192.168.100.11:8889/frontcam/';
  urlAvailable = false;
  async ngOnInit(): Promise<void> {
    this.urlAvailable = await this.checkConnection();
  }

  checkConnection = (): Promise<boolean> =>
    fetch(this.url, { method: 'HEAD' })
      .then(() => true)
      .catch(() => false);
}
