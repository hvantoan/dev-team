export class BridgeError extends Error {
  constructor(
    message: string,
    readonly exitCode: number,
  ) {
    super(message);
    this.name = 'BridgeError';
  }
}

/** Bad config, spec, project or agent. CLI exit 2. */
export class UsageError extends BridgeError {
  constructor(message: string) {
    super(message, 2);
    this.name = 'UsageError';
  }
}

/** The watcher socket is absent or refused. CLI exit 4. */
export class UnavailableError extends BridgeError {
  constructor(message: string) {
    super(message, 4);
    this.name = 'UnavailableError';
  }
}

/** A duplicate request id was submitted. CLI exit 3. */
export class DuplicateError extends BridgeError {
  constructor(message: string) {
    super(message, 3);
    this.name = 'DuplicateError';
  }
}
