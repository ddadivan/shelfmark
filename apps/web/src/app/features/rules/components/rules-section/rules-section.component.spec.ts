import { TestBed } from '@angular/core/testing';
import { MOCK_ID } from '@shelfmark/contracts/testing';
import { RulesStore } from '../../../../stores/rules.store';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { axeViolations } from '../../../../../testing/axe';
import { MockFoldersApi } from '../../../links/mock/mock-folders.api';
import { MockLibraryData } from '../../../links/mock/mock-library-data';
import { FOLDERS_API } from '../../../links/models/folders-api.const';
import { MockRulesApi } from '../../mock/mock-rules.api';
import { RULES_API } from '../../models/rules-api.const';
import { RuleActionsService } from '../../services/rule-actions.service';
import { RulesSectionComponent } from './rules-section.component';

async function setup(rules: MockLibraryData['rules'] = []) {
  const actions = {
    create: vi.fn(() => Promise.resolve(null)),
    edit: vi.fn(() => Promise.resolve(null)),
    delete: vi.fn(),
    applyToExisting: vi.fn(() => Promise.resolve()),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: RULES_API, useClass: MockRulesApi },
      { provide: FOLDERS_API, useClass: MockFoldersApi },
      { provide: RuleActionsService, useValue: actions },
    ],
  });
  await loadEnglish();
  TestBed.inject(MockLibraryData).rules = rules;
  const fixture = TestBed.createComponent(RulesSectionComponent);
  document.body.appendChild(fixture.nativeElement as HTMLElement);
  await TestBed.inject(RulesStore).load();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, actions };
}

const AT = '2026-11-01T00:00:00.000Z';

afterEach(() => {
  document.querySelectorAll('.cdk-overlay-container > *').forEach((node) => node.remove());
});

describe('RulesSectionComponent', () => {
  it('explains rules when there are none and adds one', async () => {
    const { element, actions } = await setup();
    expect(element.querySelector('h2')?.textContent).toContain('Rules');
    expect(element.textContent).toContain('No rules yet.');
    [...element.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Add rule'))
      ?.click();
    expect(actions.create).toHaveBeenCalledWith();
  });

  it('lists each rule by domain with its folder and tags', async () => {
    const { element } = await setup([
      {
        id: 'a',
        domain: 'youtube.com',
        folderId: MOCK_ID.FolderAngular,
        tags: ['video'],
        createdAt: AT,
      },
      { id: 'b', domain: 'arxiv.org', folderId: 'gone-to-trash', tags: ['paper'], createdAt: AT },
    ]);
    const rows = [...element.querySelectorAll<HTMLElement>('.rules__row')].map((row) =>
      row.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(rows[0]).toContain('arxiv.org');
    expect(rows[0]).toContain('paper');
    expect(rows[1]).toContain('youtube.com');
    expect(rows[1]).toContain('Angular');
    expect(rows[1]).toContain('video');
    expect(await axeViolations(element)).toEqual([]);
  });

  it('offers Edit, Apply to existing links and Delete for a rule', async () => {
    const rule = { id: 'a', domain: 'youtube.com', folderId: null, tags: ['video'], createdAt: AT };
    const { element, fixture, actions } = await setup([rule]);
    const open = async () => {
      element
        .querySelector<HTMLButtonElement>('button[aria-label="Actions for youtube.com"]')
        ?.click();
      await fixture.whenStable();
    };
    const item = (label: string) =>
      [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((candidate) =>
        candidate.textContent?.trim().startsWith(label),
      );
    await open();
    item('Edit')?.click();
    await fixture.whenStable();
    expect(actions.edit).toHaveBeenCalledWith(expect.objectContaining({ domain: 'youtube.com' }));
    await open();
    item('Apply to existing links')?.click();
    await fixture.whenStable();
    expect(actions.applyToExisting).toHaveBeenCalled();
    await open();
    item('Delete rule')?.click();
    await fixture.whenStable();
    expect(actions.delete).toHaveBeenCalled();
  });

  it('shows "#tag" under the site and an Edit button on the row (Shelf)', async () => {
    const rule = { id: 'a', domain: 'youtube.com', folderId: null, tags: ['video'], createdAt: AT };
    const { element, actions } = await setup([rule]);

    expect(element.querySelector('.rules__tag')?.textContent?.trim()).toBe('#video');
    element
      .querySelector<HTMLButtonElement>('button[aria-label="Edit the rule for youtube.com"]')
      ?.click();
    expect(actions.edit).toHaveBeenCalledWith(expect.objectContaining({ domain: 'youtube.com' }));
  });
});
