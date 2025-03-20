import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import MediaMTXWebRTCReader from 'src/utils/MediaMTXReader';
@Component({
  selector: 'camera-page',
  templateUrl: './camera-page.component.html',
  styleUrl: './camera-page.component.css'
})
export class CameraPageComponent implements OnInit {
  url = 'http://192.168.100.11:8889/frontcam/';
  urlAvailable = false;

  @ViewChild('remoteVideo') remoteVideo?: ElementRef<HTMLVideoElement>;

  async ngOnInit(): Promise<void> {
    this.urlAvailable = await this.checkConnection();
    console.log(window.location.href);
    new MediaMTXWebRTCReader({
      url: new URL('whep', this.url),
      onError: console.log,
      onTrack: (e) => {
        console.log(e);
        if (this.remoteVideo) {
          [this.remoteVideo.nativeElement.srcObject] = e.streams;
        }
      }
    });
  }

  checkConnection = (): Promise<boolean> =>
    fetch(this.url, { method: 'HEAD' })
      .then(() => true)
      .catch(() => false);
}
