import { Module } from '@nestjs/common';
import { HealthModule } from '../health/health.module';
import { MonitoringModule } from '../monitoring/monitoring.module';

@Module({ imports: [HealthModule, MonitoringModule] })
export class AppModule {}
