import { Controller, Get } from '@nestjs/common';
import { AllowAnonymous } from './allow-anonymous.decorator';

/** The integration's AuthGuard reads this key with `reflector.getAllAndOverride('PUBLIC', ...)`. */
const GUARD_METADATA_KEY = 'PUBLIC';

@Controller('x')
class SampleController {
  @AllowAnonymous()
  @Get('open')
  open(): string {
    return 'open';
  }

  @Get('closed')
  closed(): string {
    return 'closed';
  }
}

describe('AllowAnonymous', () => {
  it('sets the metadata key the integration guard reads', () => {
    expect(Reflect.getMetadata(GUARD_METADATA_KEY, SampleController.prototype.open)).toBe(true);
  });

  it('leaves other routes closed', () => {
    expect(
      Reflect.getMetadata(GUARD_METADATA_KEY, SampleController.prototype.closed),
    ).toBeUndefined();
  });
});
