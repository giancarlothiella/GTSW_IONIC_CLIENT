import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-demo-login',
  standalone: true,
  imports: [CommonModule, IonContent],
  template: `
    <ion-content class="ion-padding ion-text-center">
      <div style="margin-top: 40vh;">
        @if (error) {
          <p style="color: var(--ion-color-danger);">{{ error }}</p>
        } @else {
          <p>Loading demo...</p>
        }
      </div>
    </ion-content>
  `
})
export class DemoLoginPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  error = '';

  async ngOnInit() {
    const token = this.route.snapshot.queryParams['token'];
    const data = this.route.snapshot.queryParams['data'];

    if (token && data) {
      try {
        const userData = JSON.parse(atob(data));
        await this.authService.saveDemoAuthData(token, userData);
        this.router.navigate(['/home']);
      } catch (err) {
        this.error = 'Invalid demo login data';
        console.error('Demo login error:', err);
      }
    } else {
      this.router.navigate(['/login']);
    }
  }
}
