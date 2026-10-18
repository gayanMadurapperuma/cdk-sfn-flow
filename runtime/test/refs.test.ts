import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { memoryS3 } from "./s3-mock";
import { isFlowRef, jsonSize, offload, resolveRefs } from "../src";

describe("offload and resolveRefs", () => {
  let s3: ReturnType<typeof memoryS3>;
  beforeEach(() => {
    s3 = memoryS3();
  });
  afterEach(() => s3.mock.restore());

  test("round-trips a payload through S3", async () => {
    const value = { order: { id: "42", lines: [1, 2, 3] }, status: "ok" };
    const ref = await offload(value, {
      bucket: "b",
      mode: "s3",
      keyPrefix: "flow/orders/exec/Step",
      keepInline: ["status", "missing"],
    });

    expect(isFlowRef(ref)).toBe(true);
    expect(ref).toEqual({
      $flowRef: {
        bucket: "b",
        key: expect.stringMatching(
          /^flow\/orders\/exec\/Step\/[0-9a-f-]{36}\.json$/,
        ),
        size: jsonSize(value),
      },
      $keep: { status: "ok" },
    });
    await expect(resolveRefs(ref)).resolves.toEqual(value);
  });

  test("auto mode offloads only above the threshold", async () => {
    const thresholdKb = 1;
    // {"x":"..."} is 8 bytes plus the string.
    const exactly = { x: "a".repeat(1024 - 8) };
    const over = { x: "a".repeat(1024 - 7) };
    expect(jsonSize(exactly)).toBe(1024);

    await expect(
      offload(exactly, { bucket: "b", mode: "auto", thresholdKb }),
    ).resolves.toBe(exactly);
    const ref = await offload(over, { bucket: "b", mode: "auto", thresholdKb });
    expect(isFlowRef(ref)).toBe(true);
    expect(s3.objects.size).toBe(1);
  });

  test("auto mode defaults to a 200 KB threshold; s3 mode always offloads", async () => {
    await expect(
      offload({ small: true }, { bucket: "b", mode: "auto" }),
    ).resolves.toEqual({ small: true });
    expect(
      isFlowRef(
        await offload(
          { small: true },
          { bucket: "b", mode: "s3", key: "fixed.json" },
        ),
      ),
    ).toBe(true);
    expect([...s3.objects.keys()]).toEqual(["b/fixed.json"]);
  });

  test("never offloads undefined; scalars and arrays have an empty $keep", async () => {
    await expect(
      offload(undefined, { bucket: "b", mode: "s3" }),
    ).resolves.toBeUndefined();
    const ref = await offload([1, 2], {
      bucket: "b",
      mode: "s3",
      keepInline: ["length"],
    });
    expect(ref).toMatchObject({ $keep: {} });
    await expect(resolveRefs(ref)).resolves.toEqual([1, 2]);
  });

  test("resolves nested references (parallel-merged objects and map arrays)", async () => {
    const pricing = await offload(
      { total: 1200 },
      { bucket: "b", mode: "s3", keepInline: ["total"] },
    );
    const stock = await offload({ qty: 3 }, { bucket: "b", mode: "s3" });
    const items = [
      await offload({ n: 1 }, { bucket: "b", mode: "s3" }),
      { n: 2 },
    ];
    const merged = {
      pricing: { ...(pricing as object), total: 1200 },
      stock,
      items,
      other: null,
      flag: true,
    };

    await expect(resolveRefs(merged)).resolves.toEqual({
      pricing: { total: 1200 },
      stock: { qty: 3 },
      items: [{ n: 1 }, { n: 2 }],
      other: null,
      flag: true,
    });
  });

  test("resolves references whose payload contains references", async () => {
    const inner = await offload({ deep: "value" }, { bucket: "b", mode: "s3" });
    const outer = await offload({ inner }, { bucket: "b", mode: "s3" });
    await expect(resolveRefs(outer)).resolves.toEqual({
      inner: { deep: "value" },
    });
  });

  test("values without references are returned unchanged", async () => {
    const value = { a: [1, { b: "c" }], d: "e", f: 1 };
    await expect(resolveRefs(value)).resolves.toEqual(value);
    await expect(resolveRefs("text")).resolves.toBe("text");
    expect(isFlowRef({ $flowRef: "nope" })).toBe(false);
    expect(isFlowRef([{}])).toBe(false);
    expect(s3.mock.calls()).toHaveLength(0);
  });

  test("uses an injected client", async () => {
    const client = new S3Client({});
    await offload({ a: 1 }, { bucket: "b", mode: "s3", key: "k.json", client });
    await expect(
      resolveRefs(
        { $flowRef: { bucket: "b", key: "k.json", size: 7 } },
        { client },
      ),
    ).resolves.toEqual({ a: 1 });
  });
});

test("fails clearly when the stored object has no body", async () => {
  const mock = mockClient(S3Client);
  mock.on(GetObjectCommand).resolves({});
  await expect(
    resolveRefs({ $flowRef: { bucket: "b", key: "k", size: 1 } }),
  ).rejects.toThrow("s3://b/k has no body");
  mock.restore();
});
