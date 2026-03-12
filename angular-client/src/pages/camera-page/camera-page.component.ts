import { Component, ElementRef, OnInit, inject, viewChild } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SelectChangeEvent, Select } from 'primeng/select';
import { urls } from 'src/api/urls';
import { getAllVideos } from 'src/api/video.api';
import APIService from 'src/services/api.service';
import MediaMTXWebRTCReader from 'src/utils/MediaMTXReader';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import TypographyComponent from 'src/components/typography/typography.component';

@Component({
  selector: 'camera-page',
  templateUrl: './camera-page.component.html',
  styleUrl: './camera-page.component.css',
  standalone: true,
  imports: [Select, ReactiveFormsModule, FormsModule, TypographyComponent]
})
export class CameraPageComponent implements OnInit {
  private serverService = inject(APIService);
  private messageService = inject(MessageService);

  url = 'http://192.168.100.11:8889/frontcam/';
  urlAvailable = false;
  liveStream = true;

  selectedVideoName: string = 'Live Stream';
  playbackVideoUrl?: string;
  videoUrls: string[] = ['Live Stream'];
  videoUrlsIsLoading: boolean = true;

  remoteVideo = viewChild<ElementRef<HTMLVideoElement>>('remoteVideo');
  playbackVideoRef = viewChild.required<ElementRef<HTMLVideoElement>>('playbackVideo');

  async ngOnInit(): Promise<void> {
    this.urlAvailable = await this.checkConnection();
    new MediaMTXWebRTCReader({
      url: new URL('whep', this.url),
      onError: console.log,
      onTrack: (e) => {
        const video = this.remoteVideo();
        if (video) {
          [video.nativeElement.srcObject] = e.streams;
        }
      }
    });

    const videosQueryResponse = this.serverService.query<string[]>(() => getAllVideos(), { queryKey: ['videos'] });
    videosQueryResponse.error.subscribe((error) => {
      error && this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    });
    videosQueryResponse.isLoading.subscribe((isLoading) => {
      this.videoUrlsIsLoading = isLoading;
    });
    videosQueryResponse.data.subscribe((data) => {
      if (data) this.videoUrls = data.concat('Live Stream');
    });
  }

  checkConnection = (): Promise<boolean> =>
    fetch(this.url, { method: 'HEAD' })
      .then(() => true)
      .catch(() => false);

  onVideoSelected = (videoName: string) => {
    this.playbackVideoUrl = urls.getVideo(videoName);
    this.selectedVideoName = videoName;
    this.liveStream = false;
    // Wait for Angular to update the DOM
    setTimeout(() => {
      const videoEl = this.playbackVideoRef().nativeElement;
      videoEl.load(); // This reloads the new <source> inside the <video>
      videoEl.play();
    });
  };

  onLiveStreamSelected = () => {
    this.selectedVideoName = 'Live Stream';
    this.playbackVideoUrl = undefined;
    this.liveStream = true;
  };

  onDropdownChange = (event: SelectChangeEvent) => {
    if (event.value === 'Live Stream') {
      this.onLiveStreamSelected();
    } else {
      this.onVideoSelected(event.value);
    }
  };
}
