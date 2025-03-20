import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VideoService {
  private videoElement: HTMLVideoElement | null = null;

  setVideoElement(video: HTMLVideoElement) {
    this.videoElement = video;
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  async enterPictureInPicture() {
    if (this.videoElement && document.pictureInPictureEnabled) {
      try {
        await this.videoElement.requestPictureInPicture();
      } catch (err) {
        console.error('Failed to enter PiP mode:', err);
      }
    }
  }

  async exitPictureInPicture() {
    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch (err) {
        console.error('Failed to exit PiP mode:', err);
      }
    }
  }
}
