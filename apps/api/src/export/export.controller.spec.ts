import { Readable } from 'node:stream';
import type { AuthUser } from '@shelfmark/contracts';
import { EXPORT_FORMAT } from '@shelfmark/contracts';
import type { Response } from 'express';
import { ExportController } from './export.controller';
import type { ExportService } from './export.service';
import { EXPORT_CONTENT_TYPE } from './models/export-content-type.const';

function setup(): { controller: ExportController; body: Readable; res: FakeResponse } {
  const body = Readable.from(['x']);
  const service = {
    prepare: async () => ({
      filename: 'shelfmark-2026-01-01.json',
      contentType: EXPORT_CONTENT_TYPE.Json,
      body,
    }),
  } as unknown as ExportService;
  return { controller: new ExportController(service), body, res: new FakeResponse() };
}

class FakeResponse {
  headers: Record<string, string> = {};
  writableFinished = false;
  private closeHandler: (() => void) | undefined;

  set(headers: Record<string, string>): void {
    Object.assign(this.headers, headers);
  }

  on(event: string, handler: () => void): void {
    if (event === 'close') this.closeHandler = handler;
  }

  close(): void {
    this.closeHandler?.();
  }
}

const USER = { id: 'user-id' } as AuthUser;

describe('ExportController abort handling', () => {
  it('destroys the source stream when the client aborts', async () => {
    const { controller, body, res } = setup();
    await controller.export(USER, { format: EXPORT_FORMAT.Json }, res as unknown as Response);
    expect(res.headers['Cache-Control']).toBe('no-store');
    res.close();
    expect(body.destroyed).toBe(true);
  });

  it('leaves a finished response alone', async () => {
    const { controller, body, res } = setup();
    await controller.export(USER, { format: EXPORT_FORMAT.Json }, res as unknown as Response);
    res.writableFinished = true;
    res.close();
    expect(body.destroyed).toBe(false);
  });
});
