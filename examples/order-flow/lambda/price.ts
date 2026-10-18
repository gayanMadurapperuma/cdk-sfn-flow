import { withPayload } from "cdk-sfn-flow-runtime";

interface ValidatedOrder {
  orderId: string;
  sku: string;
  quantity: number;
  lines: unknown[];
}

const UNIT_PRICE = 12.5;

/** Prices the order. Its input may arrive as an S3 reference; withPayload resolves it. */
export const handler = withPayload(async (order: ValidatedOrder) => ({
  orderId: order.orderId,
  lineCount: order.lines.length,
  total: order.quantity * UNIT_PRICE,
}));
