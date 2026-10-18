/**
 * How a task waits for the called service.
 */
export enum TaskPattern {
  /** Call the service and continue as soon as it responds. */
  REQUEST_RESPONSE = "REQUEST_RESPONSE",
  /** Wait for the job to complete (`.sync`). */
  SYNC = "SYNC",
  /**
   * Wait until a task token is returned (`.waitForTaskToken`). The token is injected
   * into the payload as `taskToken`.
   */
  CALLBACK = "CALLBACK",
}
