import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { IconComponent } from '@shelfmark/ui';
import { LANDING_AGENT_ROLES } from '../../models/landing-agent-roles.const';
import { LANDING_LINKS } from '../../models/landing-links.const';

/** "How it's built": the stack, the eight agent roles and links to the code and decision log. */
@Component({
  selector: 'app-landing-built',
  imports: [TranslocoPipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { id: 'how' },
  templateUrl: './landing-built.component.html',
  styleUrl: './landing-built.component.scss',
})
export class LandingBuiltComponent {
  protected readonly agents = LANDING_AGENT_ROLES;
  protected readonly LANDING_LINKS = LANDING_LINKS;
}
