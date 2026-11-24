/** A Shelfmark answer that was not 2xx: its status and the `message` of its JSON body, if any. */
export class WorkerHttpError extends Error {
  constructor(
    readonly status: number,
    readonly serverMessage: string,
  ) {
    super(`Shelfmark answered ${status}`);
    this.name = 'WorkerHttpError';
  }
}
