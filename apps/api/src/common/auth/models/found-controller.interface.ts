/** Class-level auth markers of a controller found by `scanRoutes`. */
export interface FoundController {
  name: string;
  isPublic: boolean;
  isOptional: boolean;
}
