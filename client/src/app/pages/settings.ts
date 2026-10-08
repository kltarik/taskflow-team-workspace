import { Component, inject } from '@angular/core';
import { Auth } from '../auth';
import { Avatar } from '../ui';

@Component({
  selector: 'app-settings',
  imports: [Avatar],
  template: `
    <header class="page-head">
      <div>
        <h1>Settings</h1>
        <p class="muted">Your demo profile.</p>
      </div>
    </header>
    @if (auth.user(); as u) {
      <section class="panel profile-panel">
        <div class="profile-head">
          <app-avatar class="lg" [name]="u.name" />
          <div><strong>{{ u.name }}</strong><p class="muted">{{ u.email }}</p></div>
        </div>
        <dl class="profile">
          <dt>Demo role</dt><dd class="cap">{{ u.demoRole }}</dd>
          <dt>Time zone</dt><dd>All dates are stored and shown in UTC.</dd>
        </dl>
      </section>
      <p class="muted note">This is a demo workspace with fictional data. Roles are set per project;
        "demo role" shows whether you manage at least one project.</p>
    }
  `,
})
export class SettingsPage {
  protected auth = inject(Auth);
}
