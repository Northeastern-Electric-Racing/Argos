import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-pop-up-toast',
  templateUrl: './pop-up-toast.component.html',
  styleUrls: ['./pop-up-toast.component.css']
})
export class PopUpToastComponent implements OnInit {
  @Input() message: string = 'No data found.';
  @Input() isVisible: boolean = false;

  ngOnInit(): void {
  }
}
