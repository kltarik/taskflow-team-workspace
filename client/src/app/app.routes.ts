import { Routes } from '@angular/router';
import { authGuard } from './auth';
import { DashboardPage } from './pages/dashboard';
import { LoginPage } from './pages/login';
import { ProjectDetailPage } from './pages/project-detail';
import { ProjectsPage } from './pages/projects';
import { SettingsPage } from './pages/settings';
import { TaskDetailPage } from './pages/task-detail';

export const routes: Routes = [
  { path: 'login', component: LoginPage, title: 'Sign in · TaskFlow' },
  {
    path: '',
    canActivateChild: [authGuard], // every page below needs a logged-in user
    children: [
      { path: '', component: DashboardPage, title: 'Dashboard · TaskFlow' },
      { path: 'projects', component: ProjectsPage, title: 'Projects · TaskFlow' },
      { path: 'projects/:id', component: ProjectDetailPage, title: 'Project · TaskFlow' },
      { path: 'tasks/:id', component: TaskDetailPage, title: 'Task · TaskFlow' },
      { path: 'settings', component: SettingsPage, title: 'Settings · TaskFlow' },
    ],
  },
  { path: '**', redirectTo: '' },
];
