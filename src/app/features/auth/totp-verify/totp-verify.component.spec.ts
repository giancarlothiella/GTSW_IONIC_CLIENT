import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TotpVerifyComponent } from './totp-verify.component';

describe('TotpVerifyComponent', () => {
  let component: TotpVerifyComponent;
  let fixture: ComponentFixture<TotpVerifyComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [TotpVerifyComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TotpVerifyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
