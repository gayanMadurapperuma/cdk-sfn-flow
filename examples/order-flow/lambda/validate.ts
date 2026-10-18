import { withPayload } from "cdk-sfn-flow-runtime";

interface Order {
  orderId: string;
  sku: string;
  quantity: number;
  /** Number of synthetic order lines to generate (to exercise large payloads). */
  lineCount?: number;
}

/**
 * Validates the order and expands it into order lines. With a large `lineCount`
 * the output exceeds 256 KB and is offloaded to S3 by `withPayload` (AUTO mode).
 */
export const handler = withPayload(async (order: Order) => {
  if (!order.orderId || !order.sku || !(order.quantity > 0)) {
    throw new Error("InvalidOrder");
  }
  const lines = Array.from({ length: order.lineCount ?? 1 }, (_, i) => ({
    line: i + 1,
    sku: order.sku,
    note: `line ${i + 1} of order ${order.orderId}`.padEnd(80, "."),
  }));
  return { ...order, lines, validatedAt: new Date().toISOString() };
});
