import { memoryS3 } from "./s3-mock";
import {
  ENV_PAYLOAD_BUCKET,
  ENV_PAYLOAD_MODE,
  ENV_PAYLOAD_PREFIX,
  ENV_PAYLOAD_THRESHOLD_KB,
  flowPayloadMiddleware,
  isFlowRef,
  MiddyRequest,
  offload,
  payloadSettings,
  withPayload,
} from "../src";

const env = process.env;
let s3: ReturnType<typeof memoryS3>;

beforeEach(() => {
  process.env = { ...env };
  for (const name of [
    ENV_PAYLOAD_BUCKET,
    ENV_PAYLOAD_MODE,
    ENV_PAYLOAD_PREFIX,
    ENV_PAYLOAD_THRESHOLD_KB,
  ]) {
    delete process.env[name];
  }
  s3 = memoryS3();
});
afterEach(() => s3.mock.restore());
afterAll(() => {
  process.env = env;
});

function configure(mode: "s3" | "auto", thresholdKb?: number) {
  process.env[ENV_PAYLOAD_BUCKET] = "payloads";
  process.env[ENV_PAYLOAD_MODE] = mode;
  process.env[ENV_PAYLOAD_PREFIX] = "flow/orders";
  if (thresholdKb !== undefined) {
    process.env[ENV_PAYLOAD_THRESHOLD_KB] = String(thresholdKb);
  }
}

const envelope = (data: unknown, keepInline: string[] = []) => ({
  $flow: {
    prefix: "flow/orders",
    execution: "exec-1",
    step: "Score",
    keepInline,
  },
  data,
});

describe("withPayload", () => {
  test("is a passthrough without env vars or an envelope", async () => {
    const handler = withPayload(
      async (event: { a: number }, context: { name: string }) => ({
        ...event,
        by: context.name,
      }),
    );
    await expect(handler({ a: 1 }, { name: "fn" })).resolves.toEqual({
      a: 1,
      by: "fn",
    });
    expect(s3.mock.calls()).toHaveLength(0);
  });

  test("s3 mode resolves input references and always offloads the output", async () => {
    configure("s3");
    const stored = await offload(
      { order: "big" },
      { bucket: "payloads", mode: "s3", key: "in.json" },
    );
    const handler = withPayload(
      async (event: { order: string }) => ({
        seen: event.order,
        status: "done",
      }),
      {
        keepInline: ["status"],
      },
    );

    const result = await handler(envelope(stored, ["seen"]), {});

    expect(result).toMatchObject({
      $flowRef: {
        bucket: "payloads",
        key: expect.stringMatching(/^flow\/orders\/exec-1\/Score\/.+\.json$/),
      },
      $keep: { status: "done", seen: "big" },
    });
    expect(
      JSON.parse(
        s3.objects.get(
          `payloads/${(result as { $flowRef: { key: string } }).$flowRef.key}`,
        )!,
      ),
    ).toEqual({
      seen: "big",
      status: "done",
    });
  });

  test("auto mode offloads only outputs above the threshold", async () => {
    configure("auto", 1);
    const handler = withPayload(async (size: number) => ({
      data: "x".repeat(size),
    }));
    await expect(handler(envelope(10), {})).resolves.toEqual({
      data: "x".repeat(10),
    });
    expect(isFlowRef(await handler(envelope(2000), {}))).toBe(true);
  });

  test("offloads without an envelope using the env prefix", async () => {
    configure("s3");
    const result = await withPayload(async () => ({ ok: true }))(
      { plain: true },
      {},
    );
    expect((result as { $flowRef: { key: string } }).$flowRef.key).toMatch(
      /^flow\/orders\/[0-9a-f-]+\.json$/,
    );
  });

  test("unwraps an envelope and resolves references even without env vars", async () => {
    const stored = await offload(
      { v: 1 },
      { bucket: "payloads", mode: "s3", key: "in.json" },
    );
    const handler = withPayload(async (event: { v: number }) => event.v + 1);
    await expect(handler(envelope(stored), {})).resolves.toBe(2);
  });

  test("rejects invalid settings", () => {
    process.env[ENV_PAYLOAD_BUCKET] = "b";
    process.env[ENV_PAYLOAD_MODE] = "always";
    expect(() => payloadSettings()).toThrow(
      "FLOW_PAYLOAD_MODE must be 's3' or 'auto'",
    );
    process.env[ENV_PAYLOAD_MODE] = "auto";
    process.env[ENV_PAYLOAD_THRESHOLD_KB] = "-1";
    expect(() => payloadSettings()).toThrow(
      "FLOW_PAYLOAD_THRESHOLD_KB must be a non-negative number",
    );
  });
});

describe("flowPayloadMiddleware", () => {
  test("resolves in before and offloads in after", async () => {
    configure("s3");
    const stored = await offload(
      { order: "big" },
      { bucket: "payloads", mode: "s3", key: "in.json" },
    );
    const middleware = flowPayloadMiddleware({ keepInline: ["status"] });
    const request: MiddyRequest = { event: envelope(stored) };

    await middleware.before(request);
    expect(request.event).toEqual({ order: "big" });

    request.response = { status: "done", big: true };
    await middleware.after(request);
    expect(request.response).toMatchObject({
      $flowRef: { key: expect.stringContaining("flow/orders/exec-1/Score/") },
      $keep: { status: "done" },
    });
  });

  test("does nothing without env vars or an envelope", async () => {
    const middleware = flowPayloadMiddleware();
    const request: MiddyRequest = { event: { a: 1 }, response: { b: 2 } };
    await middleware.before(request);
    await middleware.after(request);
    expect(request).toEqual({ event: { a: 1 }, response: { b: 2 } });
  });
});
