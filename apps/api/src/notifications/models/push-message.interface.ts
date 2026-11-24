/**
 * The JSON a push carries, in the shape the Angular service worker (`ngsw`) shows by itself:
 * `notification` with title, body, icon, tag and `data.onActionClick` (what a click opens).
 * Text only; the worker renders it as a system notification, never as HTML.
 */
export interface PushMessage {
  notification: {
    title: string;
    body: string;
    icon: string;
    tag: string;
    data: {
      onActionClick: {
        default: { operation: 'navigateLastFocusedOrOpen'; url: string };
      };
    };
  };
}
