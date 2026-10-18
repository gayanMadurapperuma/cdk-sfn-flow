import { Template } from "aws-cdk-lib/assertions";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { newStack } from "./util";
import { PayloadStrategy } from "../src";
import { PayloadStore } from "../src/compiler/payload";

describe("PayloadStore", () => {
  test("defaults to INLINE and creates no bucket until asked", () => {
    const stack = newStack();
    const store = new PayloadStore(new Construct(stack, "S"), "orders", {});
    expect(store.strategy).toBe(PayloadStrategy.INLINE);
    expect(store.offloads).toBe(false);
    expect(store.thresholdKb).toBe(200);
    expect(store.retentionDays).toBe(7);
    expect(store.prefix).toBe("flow/orders");
    expect(store.existingBucket).toBeUndefined();
    expect(stack.node.findAll().some((c) => c instanceof s3.Bucket)).toBe(
      false,
    );
  });

  test("creates an encrypted, private, SSL-only bucket with lifecycle expiry", () => {
    const stack = newStack();
    const store = new PayloadStore(new Construct(stack, "S"), "orders", {
      strategy: PayloadStrategy.AUTO,
      thresholdKb: 100,
      retentionDays: 3,
    });
    expect(store.offloads).toBe(true);
    expect(store.thresholdKb).toBe(100);
    expect(store.bucket()).toBe(store.bucket());
    expect(store.objectsArn()).toContain("flow/orders/*");
    const template = Template.fromStack(stack);
    template.resourceCountIs("AWS::S3::Bucket", 1);
    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          { ServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" } },
        ],
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      LifecycleConfiguration: {
        Rules: [{ ExpirationInDays: 3, Prefix: "flow/", Status: "Enabled" }],
      },
    });
    const policy = template.findResources("AWS::S3::BucketPolicy");
    expect(JSON.stringify(policy)).toContain('"aws:SecureTransport":"false"');
  });

  test("uses a given bucket", () => {
    const stack = newStack();
    const bucket = new s3.Bucket(stack, "Mine");
    const store = new PayloadStore(new Construct(stack, "S"), "orders", {
      bucket,
    });
    expect(store.existingBucket).toBe(bucket);
    expect(store.bucket()).toBe(bucket);
    Template.fromStack(stack).resourceCountIs("AWS::S3::Bucket", 1);
  });
});
