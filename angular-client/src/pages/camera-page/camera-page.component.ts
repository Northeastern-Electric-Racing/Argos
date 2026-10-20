import { Component, ElementRef, OnInit, inject, viewChild, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzSelectModule } from 'ng-zorro-antd/select';
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
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [NzSelectModule, ReactiveFormsModule, FormsModule, TypographyComponent]
})
export class CameraPageComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private serverService = inject(APIService);
  private notification = inject(NzNotificationService);

  url = 'http://192.168.100.11:8889/frontcam/';
  urlAvailable = false;
  liveStream = true;

  selectedVideoName: string = 'Live Stream';
  playbackVideoUrl?: string;
  videoUrls: string[] = ['Live Stream'];
  videoUrlsIsLoading: boolean = true;

  remoteVideo = viewChild<ElementRef<HTMLVideoElement>>('remoteVideo');
  playbackVideoRef = viewChild<ElementRef<HTMLVideoElement>>('playbackVideo');

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
    videosQueryResponse.error.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
      if (error) this.notification.create('error', 'Error', error.message);
    });
    videosQueryResponse.isLoading.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isLoading) => {
      this.videoUrlsIsLoading = isLoading;
    });
    videosQueryResponse.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
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
      const videoEl = this.playbackVideoRef()?.nativeElement;
      if (!videoEl) return;
      videoEl.load(); // This reloads the new <source> inside the <video>
      videoEl.play();
    });
  };

  onLiveStreamSelected = () => {
    this.selectedVideoName = 'Live Stream';
    this.playbackVideoUrl = undefined;
    this.liveStream = true;
  };

  onDropdownChange = (videoName: string) => {
    if (videoName === 'Live Stream') {
      this.onLiveStreamSelected();
    } else {
      this.onVideoSelected(videoName);
    }
  };
}
