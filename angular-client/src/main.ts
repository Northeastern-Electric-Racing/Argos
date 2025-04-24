import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { registerLicense } from '@syncfusion/ej2-base';

// Register Syncfusion license key
registerLicense('ORg4AjUWIQA/Gnt2XFhhQlJHfVpdX2dWfFN0QHNbdVt3flBDcC0sT3RfQFhjTXxXdkFjWnpcc3FVRGteWA==');

import { AppModule } from './app/app.module';

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));
