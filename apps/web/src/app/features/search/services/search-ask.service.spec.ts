import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ViewportService } from '../../../core/layout/viewport.service';
import { AskInbox } from '../../ai/services/ask-inbox.service';
import { AskPanelService } from '../../ai/services/ask-panel.service';
import { SearchAskService } from './search-ask.service';

function setup(compact: boolean) {
  const inbox = { put: vi.fn() };
  const panel = { open: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      { provide: ViewportService, useValue: { compact: signal(compact) } },
      { provide: AskInbox, useValue: inbox },
      { provide: AskPanelService, useValue: panel },
    ],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  return { inbox, panel, navigate, service: TestBed.inject(SearchAskService) };
}

describe('SearchAskService', () => {
  it('opens the Ask panel with the question when the header is there', async () => {
    const { panel, navigate, service } = setup(false);

    await service.ask('which jackets did I save?');

    expect(panel.open).toHaveBeenCalledWith('which jackets did I save?');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('hands the question to the full-screen Ask page in the mobile shell', async () => {
    const { inbox, panel, navigate, service } = setup(true);

    await service.ask('which jackets did I save?');

    expect(inbox.put).toHaveBeenCalledWith('which jackets did I save?');
    expect(navigate).toHaveBeenCalledWith('/ask');
    expect(panel.open).not.toHaveBeenCalled();
  });
});
