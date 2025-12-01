import { Directive, EventEmitter, HostListener, OnDestroy, OnInit, Output } from '@angular/core';
import { BehaviorSubject, fromEvent, ReplaySubject } from 'rxjs';
import { filter, map, take, takeUntil } from 'rxjs/operators';

/**
 * This directive exposes a special variant of the 'focusout' event. The regular 'focusout' event has a quirk:
 * Imagine the user clicks on some button on the page. This triggers the following events in the following order:
 * mousedown, focusout, mouseup. But the focusout event handler might change the layout of the website so that
 * the button on which the mousedown event occurred moves around. This leads to no mouseup event registered on
 * that button. Therefore a click event is also not registered because a click event consists of
 * a mousedown AND a mouseup event on that button. In order to fix that problem, this directive exposes a delayed focusout
 * event that is triggered AFTER the mousedown and mouseup events. When the delayed focusout event handler changes
 * positions of buttons, click events are still registered as you would expect.
 */
@Directive({
  selector: '[appDelayedFocusout]'
})
export class DelayedFocusoutDirective implements OnInit, OnDestroy {

  @Output() delayedFocusout = new EventEmitter<boolean>();
  isMouseDownSubject = new BehaviorSubject(false);

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  ngOnInit(): void {
    fromEvent(document.body, 'mousedown').pipe(takeUntil(this.destroyed$))
      .subscribe(() => this.isMouseDownSubject.next(true));
    fromEvent(document.body, 'mouseup').pipe(takeUntil(this.destroyed$))
      .subscribe(() => this.isMouseDownSubject.next(false));
  }

  @HostListener('focusout') onFocusout() {
    // If the mouse is currently down, we subscribe to the the event of
    // 'mouse being released' to then trigger the delayed focusout.
    // If the mouse is currently not down, we can trigger the delayed focusout immediately.
    if (this.isMouseDown()) {
      this.mouseRelease().subscribe(() => {
        // This code is executed once the mouse has been released.
        this.delayedFocusout.emit(true);
      });
    } else {
      this.delayedFocusout.emit(true);
    }
  }

  /**
   * Emits the value true once the mouse has been released and then completes.
   * Also completes when the mouse is not released but this directive is being destroyed.
   */
  mouseRelease() {
    return this.isMouseDownSubject.pipe(
      // Just negate isDown to get the value isReleased.
      takeUntil(this.destroyed$),
      map(isDown => !isDown),
      // Only proceed when the the mouse is released.
      filter(isReleased => isReleased),
      take(1)
    );
  }

  isMouseDown() {
    return this.isMouseDownSubject.value;
  }

  ngOnDestroy() {
      this.destroyed$.next(true);
      this.destroyed$.complete();
  }
}