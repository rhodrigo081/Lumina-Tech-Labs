import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TestNoticeModalComponent } from './shared/test-notice-modal.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TestNoticeModalComponent],
  template: '<router-outlet /><ecm-test-notice-modal />',
})
export class AppComponent {}
