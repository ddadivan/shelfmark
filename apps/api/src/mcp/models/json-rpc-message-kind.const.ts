/** What a POSTed JSON-RPC message turned out to be (`parseMessage`). */
export const JSON_RPC_MESSAGE_KIND = {
  Request: 'request',
  Notification: 'notification',
  /** A client's response to a server request: there are none in this server, so it is accepted (202). */
  Response: 'response',
  /** Not a valid message: answered with the error in `response`. */
  Invalid: 'invalid',
} as const;
