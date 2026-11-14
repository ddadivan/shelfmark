import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ToastAboveDirective } from './toast-above.directive';
import { ToastAreaService } from './toast-area.service';

@Component({
  imports: [ToastAboveDirective],
  template: `<div [appToastAbove]="selector()">
    @if (shown()) {
      <div class="bar"></div>
    }
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {
  readonly selector = signal('.bar');
  readonly shown = signal(false);
}

describe('ToastAboveDirective (#352)', () => {
  function setup(selector: string, shown: boolean) {
    const unregister = vi.fn();
    const service = { registerBar: vi.fn(() => unregister) };
    TestBed.configureTestingModule({
      providers: [{ provide: ToastAreaService, useValue: service }],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.selector.set(selector);
    fixture.componentInstance.shown.set(shown);
    fixture.detectChanges();
    TestBed.tick();
    const host = fixture.nativeElement.querySelector('div') as HTMLElement;
    return { fixture, host, service, unregister };
  }

  it('registers the visible bar inside the host', () => {
    const { host, service } = setup('.bar', true);

    expect(service.registerBar).toHaveBeenCalledExactlyOnceWith(host.querySelector('.bar'));
  });

  it('registers the host itself without a selector', () => {
    const { host, service } = setup('', false);

    expect(service.registerBar).toHaveBeenCalledExactlyOnceWith(host);
  });

  it('waits for the bar when it is not rendered yet, and never measures the host instead', async () => {
    const { fixture, host, service } = setup('.bar', false);
    expect(service.registerBar).not.toHaveBeenCalled();

    fixture.componentInstance.shown.set(true);
    fixture.detectChanges();

    await vi.waitFor(() => {
      expect(service.registerBar).toHaveBeenCalledExactlyOnceWith(host.querySelector('.bar'));
    });
  });

  it('takes the bar back when it goes', () => {
    const { fixture, unregister } = setup('.bar', true);

    fixture.destroy();

    expect(unregister).toHaveBeenCalledOnce();
  });
});
