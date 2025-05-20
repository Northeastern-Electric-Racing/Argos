import { Component } from '@angular/core';
import { ProgressSpinner } from 'primeng/progressspinner';

/**
 * Loading Page Component to display while loading information from the backend.
 */
@Component({
    selector: 'loading-page',
    templateUrl: './loading-page.component.html',
    styleUrls: ['./loading-page.component.css'],
    standalone: true,
    imports: [ProgressSpinner]
})
export default class LoadingPageComponent {}
