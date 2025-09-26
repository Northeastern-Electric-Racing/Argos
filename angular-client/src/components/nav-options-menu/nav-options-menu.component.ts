import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { appRoutes } from 'src/app/app-routing.module';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { RunFormComponent } from '../run-form/run-form.component';

interface MenuItem {
  id: string;
  label: string;
  onclick: () => void;
  icon: string;
}

@Component({
  selector: 'app-nav-options-menu',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './nav-options-menu.component.html',
  styleUrls: ['./nav-options-menu.component.css']
})
export class NavOptionsMenuComponent {
  private router = inject(Router);
  private dialogService = inject(DialogService);

  editRunRef: DynamicDialogRef | undefined;

  openRunForm = () => {
    this.editRunRef = this.dialogService.open(RunFormComponent, {
      width: '550px',
      header: 'Edit Run',
      closable: true,
      closeAriaLabel: 'Close'
    });
  };

  menuItems: MenuItem[] = [
    {
      id: appRoutes.mapRoute(),
      label: 'Map',
      icon: 'map',
      onclick: () => this.navigateTo(appRoutes.mapRoute())
    },
    {
      id: appRoutes.cameraRoute(),
      label: 'Camera',
      icon: 'linked_camera',
      onclick: () => this.navigateTo(appRoutes.cameraRoute())
    },
    {
      id: '',
      label: 'Edit Runs',
      icon: 'edit',
      onclick: this.openRunForm
    },
    {
      id: appRoutes.commandsRoute(),
      label: 'Commands',
      icon: 'electrical_services',
      onclick: () => this.navigateTo(appRoutes.commandsRoute())
    }
  ];

  navigateTo(route: string) {
    this.router.navigate([route]);
  }
}
