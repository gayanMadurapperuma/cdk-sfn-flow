import { memoryS3 } from "./s3-mock";
import {
  ENV_PAYLOAD_BUCKET,
  ENV_PAYLOAD_MODE,
  ENV_PAYLOAD_PREFIX,
  ENV_PAYLOAD_THRESHOLD_KB,
  flowPayloadMiddleware,
  flowSettings,
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
      { bucket: "payloads", mode: "s3", key: "flow/orders/in.json" },
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

  test("direct invocations are a passthrough even when the env vars are set", async () => {
    configure("s3");
    const handler = withPayload(async (event: unknown) => ({ got: event }));
    // A reference in a direct event is data: it is neither resolved nor rejected.
    const event = { $flowRef: { bucket: "payloads", key: "flow/x", size: 1 } };

    await expect(handler(event, {})).resolves.toEqual({ got: event });
    expect(s3.mock.calls()).toHaveLength(0);
  });

  test("takes the settings from the envelope, without env vars", async () => {
    const stored = await offload(
      { v: 1 },
      { bucket: "payloads", mode: "s3", key: "flow/orders/in.json" },
    );
    const handler = withPayload(async (event: { v: number }) => ({
      v: event.v + 1,
    }));
    const flow = { ...envelope(stored).$flow, bucket: "payloads" };

    const always = await handler(
      { $flow: { ...flow, mode: "s3" }, data: stored },
      {},
    );
    expect(always).toMatchObject({
      $flowRef: {
        bucket: "payloads",
        key: expect.stringMatching(/^flow\/orders\/exec-1\/Score\//),
      },
    });
    // auto with the default 200 KB threshold keeps the small output inline.
    await expect(
      handler({ $flow: { ...flow, mode: "auto" }, data: stored }, {}),
    ).resolves.toEqual({ v: 2 });
    await expect(
      handler(
        { $flow: { ...flow, mode: "auto", thresholdKb: 0 }, data: stored },
        {},
      ),
    ).resolves.toHaveProperty("$flowRef");
  });

  test("envelope settings win over the env vars", async () => {
    configure("s3");
    process.env[ENV_PAYLOAD_BUCKET] = "stale";
    const handler = withPayload(async () => ({ ok: true }));
    const result = await handler(
      {
        $flow: { prefix: "flow/billing", bucket: "billing", mode: "s3" },
        data: {},
      },
      {},
    );
    expect(result).toMatchObject({
      $flowRef: {
        bucket: "billing",
        key: expect.stringMatching(/^flow\/billing\//),
      },
    });
  });

  test("an envelope without any settings is unwrapped and not offloaded", async () => {
    const handler = withPayload(async (event: { v: number }) => event.v + 1);
    await expect(handler(envelope({ v: 1 }), {})).resolves.toBe(2);
    expect(s3.mock.calls()).toHaveLength(0);
  });

  test("rejects input references outside the workflow's payload bucket and root prefix", async () => {
    configure("s3");
    const handler = withPayload(async (event: unknown) => event);
    await offload(
      { a: 1 },
      { bucket: "payloads", mode: "s3", key: "private/a" },
    );
    await offload({ b: 2 }, { bucket: "other", mode: "s3", key: "flow/b" });

    await expect(
      handler(
        envelope({ $flowRef: { bucket: "other", key: "flow/b", size: 1 } }),
        {},
      ),
    ).rejects.toThrow("'other' is not an allowed payload bucket");
    await expect(
      handler(
        envelope({
          $flowRef: { bucket: "payloads", key: "private/a", size: 1 },
        }),
        {},
      ),
    ).rejects.toThrow("the key is outside the allowed prefixes (flow/)");
    // Another workflow's prefix in the same bucket is readable (shared-bucket subflows).
    const parent = await offload(
      { c: 3 },
      { bucket: "payloads", mode: "s3", key: "flow/parent/c.json" },
    );
    await expect(handler(envelope(parent), {})).resolves.toMatchObject({
      $flowRef: expect.anything(),
    });
  });

  test("allowedBuckets admits references into another bucket", async () => {
    configure("auto");
    const parent = await offload(
      { c: 3 },
      { bucket: "parent-payloads", mode: "s3", key: "flow/parent/c.json" },
    );
    const handler = withPayload(async (event: { c: number }) => event.c, {
      allowedBuckets: ["parent-payloads"],
    });
    await expect(handler(envelope(parent), {})).resolves.toBe(3);
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
    expect(() => flowSettings({ bucket: "b", mode: "always" }, {})).toThrow(
      "$flow.mode must be 's3' or 'auto'",
    );
    expect(() =>
      flowSettings({ bucket: "b", mode: "auto", thresholdKb: -1 }, {}),
    ).toThrow("$flow.thresholdKb must be a non-negative number");
  });
});

describe("flowPayloadMiddleware", () => {
  test("resolves in before and offloads in after", async () => {
    configure("s3");
    const stored = await offload(
      { order: "big" },
      { bucket: "payloads", mode: "s3", key: "flow/orders/in.json" },
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

  test("does nothing for a direct invocation, even with env vars", async () => {
    configure("s3");
    const middleware = flowPayloadMiddleware();
    const request: MiddyRequest = { event: { a: 1 }, response: { b: 2 } };
    await middleware.before(request);
    await middleware.after(request);
    expect(request).toEqual({ event: { a: 1 }, response: { b: 2 } });
    expect(s3.mock.calls()).toHaveLength(0);
  });

  test("does nothing without env vars or an envelope", async () => {
    const middleware = flowPayloadMiddleware();
    const request: MiddyRequest = { event: { a: 1 }, response: { b: 2 } };
    await middleware.before(request);
    await middleware.after(request);
    expect(request).toEqual({ event: { a: 1 }, response: { b: 2 } });
  });
});
