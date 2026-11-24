import type { LandingImage } from './landing-image.interface';

const DIR = '/media/landing/';

/**
 * The pictures of the landing and sign-in drawings: app assets, because the CSP allows images
 * from the app's own origin only (`img-src 'self'`). Video stills are 480 x 270, screenshots
 * 480 x 240, shoes 480 x 480, clothes 384 x 480.
 */
export const LANDING_IMAGES = {
  angular: { src: `${DIR}angular100.webp`, width: 480, height: 270 },
  typescript: { src: `${DIR}typescript100.webp`, width: 480, height: 270 },
  nihilism: { src: `${DIR}nihilism.webp`, width: 480, height: 270 },
  neural: { src: `${DIR}neural-network.webp`, width: 480, height: 270 },
  microservices: { src: `${DIR}microservices.webp`, width: 480, height: 270 },
  excalidraw: { src: `${DIR}excalidraw.webp`, width: 480, height: 240 },
  runners: { src: `${DIR}tree-runners.webp`, width: 480, height: 480 },
  dasher: { src: `${DIR}tree-dasher.webp`, width: 480, height: 480 },
  jacket: { src: `${DIR}ojai-jacket.webp`, width: 384, height: 480 },
  shirt: { src: `${DIR}crater-shirt.webp`, width: 384, height: 480 },
} as const satisfies Record<string, LandingImage>;
