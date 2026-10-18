import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";

/** An in-memory S3 behind aws-sdk-client-mock. */
export function memoryS3() {
  const objects = new Map<string, string>();
  const mock = mockClient(S3Client);
  mock.on(PutObjectCommand).callsFake((input) => {
    objects.set(`${input.Bucket}/${input.Key}`, String(input.Body));
    return {};
  });
  mock.on(GetObjectCommand).callsFake((input) => {
    const body = objects.get(`${input.Bucket}/${input.Key}`);
    if (body === undefined) throw new Error(`NoSuchKey ${input.Key}`);
    return { Body: { transformToString: async () => body } };
  });
  return { mock, objects };
}
