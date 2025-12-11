import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('demoVideo') demoVideoRef!: ElementRef<HTMLVideoElement>;

  email = '';
  password = '';
  error = '';
  loading = false;
  showSplash = true;
  showContent = false;
  isLoggingIn = false;

  // Video player properties
  videoSource = 'demo-video.mp4'; // Place your video in the public folder
  isPlaying = false;
  isMuted = true;
  showControls = true;
  videoProgress = 0;
  currentTime = 0;
  duration = 0;
  currentScene = 'VendorIQ Demo';

  // Fallback animated preview
  showFallback = false;
  currentPreviewScene = 1;
  private previewInterval: any;

  // Scene markers (in seconds)
  sceneMarkers = [
    { time: 0, label: 'Step 1: Secure Login' },
    { time: 15, label: 'Step 2: Dashboard Overview' },
    { time: 50, label: 'Step 3: Vendor List' },
    { time: 75, label: 'Step 4: Vendor Profile' },
    { time: 105, label: 'Step 5: Navigation & Logout' },
  ];

  private controlsTimeout: any;

  constructor(private router: Router) {}

  ngOnInit() {
    // Show splash screen animation
    setTimeout(() => {
      this.showSplash = false;
      setTimeout(() => {
        this.showContent = true;
      }, 300);
    }, 2500);
  }

  ngAfterViewInit() {
    // Auto-play video when content is visible (muted for autoplay policy)
    setTimeout(() => {
      if (this.demoVideoRef?.nativeElement) {
        this.demoVideoRef.nativeElement.play().catch(() => {
          // Autoplay was prevented or video not available, show fallback
          console.log('Autoplay prevented, showing animated fallback');
          this.showFallback = true;
          this.startPreviewAnimation();
        });
      }
    }, 3000);
  }

  ngOnDestroy() {
    clearInterval(this.previewInterval);
    clearTimeout(this.controlsTimeout);
  }

  // Start animated preview fallback
  private startPreviewAnimation() {
    this.currentPreviewScene = 1;
    this.previewInterval = setInterval(() => {
      this.currentPreviewScene = (this.currentPreviewScene % 4) + 1;
      // Update scene label for fallback
      const sceneLabels = [
        'Step 1: Secure Login',
        'Step 2: Dashboard Overview',
        'Step 3: Vendor List',
        'Step 4: Vendor Profile',
      ];
      this.currentScene = sceneLabels[this.currentPreviewScene - 1];
    }, 3000);
  }

  // Handle video error
  onVideoError() {
    console.log('Video failed to load, showing animated fallback');
    this.showFallback = true;
    this.startPreviewAnimation();
  }

  // Video control methods
  togglePlayPause() {
    const video = this.demoVideoRef?.nativeElement;
    if (!video) return;

    if (video.paused) {
      video.play();
      this.isPlaying = true;
    } else {
      video.pause();
      this.isPlaying = false;
    }
    this.resetControlsTimeout();
  }

  toggleMute() {
    const video = this.demoVideoRef?.nativeElement;
    if (!video) return;

    this.isMuted = !this.isMuted;
    video.muted = this.isMuted;
    this.resetControlsTimeout();
  }

  toggleFullscreen() {
    const video = this.demoVideoRef?.nativeElement;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
    this.resetControlsTimeout();
  }

  seekVideo(event: MouseEvent) {
    const video = this.demoVideoRef?.nativeElement;
    if (!video) return;

    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    video.currentTime = percentage * video.duration;
    this.resetControlsTimeout();
  }

  onTimeUpdate(event: Event) {
    const video = event.target as HTMLVideoElement;
    this.currentTime = video.currentTime;
    this.videoProgress = (video.currentTime / video.duration) * 100;

    // Update current scene based on time
    for (let i = this.sceneMarkers.length - 1; i >= 0; i--) {
      if (video.currentTime >= this.sceneMarkers[i].time) {
        this.currentScene = this.sceneMarkers[i].label;
        break;
      }
    }
  }

  onVideoLoaded(event: Event) {
    const video = event.target as HTMLVideoElement;
    this.duration = video.duration;
    this.isPlaying = !video.paused;
    this.showFallback = false;
    clearInterval(this.previewInterval);
  }

  formatTime(seconds: number): string {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  resetControlsTimeout() {
    this.showControls = true;
    clearTimeout(this.controlsTimeout);
    this.controlsTimeout = setTimeout(() => {
      if (this.isPlaying) {
        this.showControls = false;
      }
    }, 3000);
  }

  onLogin() {
    this.error = '';
    this.loading = true;
    this.isLoggingIn = true;

    setTimeout(() => {
      const validEmail = 'admin';
      const validPassword = 'admin';

      if (this.email === validEmail && this.password === validPassword) {
        // Success animation before redirect
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1000);
      } else {
        this.loading = false;
        this.isLoggingIn = false;
        this.error = 'Invalid credentials — try admin / admin';
      }
    }, 1500);
  }
}
