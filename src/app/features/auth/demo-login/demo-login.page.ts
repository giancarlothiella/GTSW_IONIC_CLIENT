import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
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
export class DemoLoginPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private queryParamsSub: Subscription | undefined;

  error = '';

  ngOnInit() {
    // Use observable queryParams to handle tab reuse (same tab, new login params)
    this.queryParamsSub = this.route.queryParams.subscribe(async (params) => {
      const token = params['token'];
      const data = params['data'];

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
    });
  }

  ngOnDestroy() {
    this.queryParamsSub?.unsubscribe();
  }
}
