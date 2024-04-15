import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export default class SidebarService {
  public isOpen: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  public openSidebar() {
    this.isOpen.next(true);
  }
}
