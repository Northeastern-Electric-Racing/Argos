import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import SidebarService from 'src/services/sidebar.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './app-sidebar.component.html',
  styleUrls: ['./app-sidebar.component.css']
})
export default class AppSidebar implements OnInit {
  sidebarVisible = false;

  constructor(
    private router: Router,
    private sidebarService: SidebarService
  ) {}

  ngOnInit(): void {
    this.sidebarService.isOpen.subscribe((isOpen) => {
      this.sidebarVisible = isOpen;
    });
  }

  navigateTo(path: string) {
    console.log('navigation');
    this.router.navigate([path]);
  }
}
