import { Component, ElementRef, OnInit, inject, viewChild, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toast } from '@spartan-ng/brain/sonner';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideVideoOff } from '@ng-icons/lucide';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { urls } from 'src/api/urls';
import { getAllVideos } from 'src/api/video.api';
import APIService from 'src/services/api.service';
import MediaMTXWebRTCReader from 'src/utils/MediaMTXReader';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

@Component({
  selector: 'camera-page',
  templateUrl: './camera-page.component.html',
  styleUrl: './camera-page.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [HlmEmptyImports, HlmSelectImports, NgIcon, ReactiveFormsModule, FormsModule],
  providers: [provideIcons({ lucideVideoOff })]
})
export class CameraPageComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private serverService = inject(APIService);

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
      if (error) toast.error('Error', { description: error.message });
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

  onDropdownChange = (value: string | null | undefined) => {
    if (!value) return;
    if (value === 'Live Stream') {
      this.onLiveStreamSelected();
    } else {
      this.onVideoSelected(value);
    }
  };
}
