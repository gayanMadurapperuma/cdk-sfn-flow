import { withPayload } from "cdk-sfn-flow-runtime";

/**
 * Requests manual approval. The workflow waits until someone calls SendTaskSuccess
 * with `taskToken` (for example from an approval UI).
 */
export const handler = withPayload(async (event: { taskToken: string; pricing?: { total?: number } }) => {
  console.log(JSON.stringify({ message: "approval requested", total: event.pricing?.total, taskToken: event.taskToken }));
  return { requested: true };
});
