import { Module } from '@nestjs/common';
import { MONITORING_SETTINGS } from './models/monitoring-settings.token';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { readMonitoringSettings } from './read-monitoring-settings';

@Module({
  controllers: [MonitoringController],
  providers: [
    MonitoringService,
    { provide: MONITORING_SETTINGS, useFactory: () => readMonitoringSettings() },
  ],
})
export class MonitoringModule {}
