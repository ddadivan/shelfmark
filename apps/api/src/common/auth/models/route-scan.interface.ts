import type { FoundController } from './found-controller.interface';
import type { FoundRoute } from './found-route.interface';

export interface RouteScan {
  controllers: FoundController[];
  routes: FoundRoute[];
}
