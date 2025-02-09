import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import SidebarService from 'src/services/sidebar.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './app-sidebar.component.html',
  styleUrls: ['./app-sidebar.component.css']
})
export default class AppSidebarComponent implements OnInit {
  private router = inject(Router);
  private sidebarService = inject(SidebarService);
  sidebarVisible = false;

  ngOnInit(): void {
    this.sidebarService.isOpen.subscribe((isOpen) => {
      this.sidebarVisible = isOpen;
    });
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
