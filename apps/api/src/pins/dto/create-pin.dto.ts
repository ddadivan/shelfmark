import type { CreatePinRequest } from '@shelfmark/contracts';
import { PinRefDto } from './pin-ref.dto';

export class CreatePinDto extends PinRefDto implements CreatePinRequest {}
