import { Component, HostListener, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { interval, map, Observable, startWith } from 'rxjs';
import { startNewRun } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import SidebarService from 'src/services/sidebar.service';
import Storage from 'src/services/storage.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-nav-bar',
  templateUrl: './app-nav-bar.component.html',
  styleUrls: ['./app-nav-bar.component.css']
})
export class AppNavBarComponent implements OnInit {
  private storage = inject(Storage);
  private serverService = inject(APIService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private sidebarService = inject(SidebarService);
  // Set selected route to current URL path
  selectedRoute: string = window.location.pathname;
  sidebarVisible = false;
  isMobile = false;

  ngOnInit(): void {
    this.sidebarService.isOpen.subscribe((isOpen) => {
      this.sidebarVisible = isOpen;
    });
    this.selectedRoute = window.location.pathname;
    this.isMobile = window.innerWidth <= 768;
  }

  // on resize, set the screen width
  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.isMobile = window.innerWidth <= 768;
  }
  newRunIsLoading = false;
  time$: Observable<Date> = interval(1000).pipe(
    startWith(0),
    map(() => new Date())
  );

  onStartNewRun = () => {
    const runsQueryResponse = this.serverService.query(() => startNewRun(), { invalidates: ['runs'] });
    runsQueryResponse.isLoading.subscribe((isLoading: boolean) => {
      this.newRunIsLoading = isLoading;
    });
    runsQueryResponse.error.subscribe((error) => {
      error && this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    });
  };

  navItems: NavItem[] = [
    { label: 'Home', route: '/landing', icon: 'home' },
    { label: 'Charging', route: '/charging', icon: 'ev_station' },
    { label: 'Graph', route: '/graph', icon: 'bar_chart' },
    { label: 'Map', route: '/map', icon: 'map' }
  ];

  navigateTo(route: string): void {
    this.selectedRoute = route;
    this.router.navigate([route]);
  }
}
