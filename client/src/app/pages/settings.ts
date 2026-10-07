import { Component, inject } from '@angular/core';
import { Auth } from '../auth';

@Component({
  selector: 'app-settings',
  template: `
    <h1>Settings</h1>
    @if (auth.user(); as u) {
      <dl class="card profile">
        <dt>Name</dt><dd>{{ u.name }}</dd>
        <dt>Email</dt><dd>{{ u.email }}</dd>
        <dt>Demo role</dt><dd>{{ u.demoRole }}</dd>
        <dt>Time zone</dt><dd>All dates are stored and shown in UTC.</dd>
      </dl>
      <p class="muted">This is a demo workspace with fictional data. Roles are set per project;
        "demo role" shows whether you manage at least one project.</p>
    }
  `,
})
export class SettingsPage {
  protected auth = inject(Auth);
}
