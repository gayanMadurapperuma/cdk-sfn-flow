/**
 * The kind of a step.
 */
export enum StepType {
  TASK = "TASK",
  WAIT = "WAIT",
  CHOICE = "CHOICE",
  PARALLEL = "PARALLEL",
  MAP = "MAP",
  PASS = "PASS",
  SUCCEED = "SUCCEED",
  FAIL = "FAIL",
  SUBFLOW = "SUBFLOW",
  RAW = "RAW",
}
