import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AllowAnonymous } from '../common/auth/allow-anonymous.decorator';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  // Anonymous on purpose: uptime probes and the deploy smoke check have no session.
  @AllowAnonymous()
  // Never rate-limited: probes poll it from fixed addresses.
  @SkipThrottle()
  @Get()
  @ApiOkResponse({ type: HealthResponseDto })
  check(): HealthResponseDto {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
