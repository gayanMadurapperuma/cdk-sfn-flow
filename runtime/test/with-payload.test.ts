import { ENV_PAYLOAD_BUCKET, ENV_PAYLOAD_MODE, withPayload } from "../src";

describe("withPayload", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env[ENV_PAYLOAD_BUCKET];
    delete process.env[ENV_PAYLOAD_MODE];
  });

  afterAll(() => {
    process.env = env;
  });

  test("passes input and output through unchanged without env vars", async () => {
    const input = { orderId: "42", items: [1, 2, 3] };
    const handler = withPayload(
      async (event: typeof input, context: { name: string }) => ({
        ...event,
        by: context.name,
      }),
    );

    await expect(handler(input, { name: "fn" })).resolves.toEqual({
      ...input,
      by: "fn",
    });
  });

  test("rejects payload modes this version cannot handle", async () => {
    process.env[ENV_PAYLOAD_BUCKET] = "bucket";
    process.env[ENV_PAYLOAD_MODE] = "s3";
    const handler = withPayload(async (event: unknown) => event);

    await expect(handler({}, {})).rejects.toThrow(/not supported/);
  });
});
