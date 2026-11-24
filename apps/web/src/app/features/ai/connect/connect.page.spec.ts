import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DialogService, ToastService } from '@shelfmark/ui';
import { axeViolations } from '../../../../testing/axe';
import { fakeMcpApi } from '../../../../testing/fake-mcp-api';
import { AuthStore } from '../../../core/auth/auth.store';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import ConnectPage from './connect.page';
import { MCP_API } from './models/mcp-api.const';
import { MCP_SERVER_URL } from './models/mcp-server-url.const';

describe('ConnectPage', () => {
  it('shows the title, the lead with the Pro mark and the groups, without axe violations', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideTranslocoForTest(),
        { provide: MCP_API, useValue: fakeMcpApi({ available: true, items: [] }) },
        { provide: MCP_SERVER_URL, useValue: 'https://shelfmark.example/api/mcp' },
        { provide: DialogService, useValue: { confirm: vi.fn(), open: vi.fn() } },
        { provide: ToastService, useValue: { show: vi.fn() } },
        { provide: AuthStore, useValue: { user: signal({ name: 'Ada', isDemo: false }) } },
      ],
    });
    await loadEnglish();
    const fixture = TestBed.createComponent(ConnectPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain('Connect your assistant');
    expect(element.querySelector('.connect-page__lead')?.textContent).toContain('Pro');
    expect(element.textContent).toContain('How to connect');
    expect(await axeViolations(element)).toEqual([]);
  });
});
