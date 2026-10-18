import {
  isFlowEnvelope,
  offloadOutput,
  payloadSettings,
  resolveInput,
  WithPayloadOptions,
} from "./with-payload";

/** The parts of a Middy request this middleware uses. */
export interface MiddyRequest {
  event: unknown;
  response?: unknown;
  internal?: Record<string, unknown>;
}

/** A Middy middleware object. */
export interface MiddyMiddleware {
  before: (request: MiddyRequest) => Promise<void>;
  after: (request: MiddyRequest) => Promise<void>;
}

const FLOW_KEY = "cdk-sfn-flow:context";

/**
 * Middy middleware equivalent to `withPayload`: resolves references in `before`
 * and offloads the response in `after`.
 */
export function flowPayloadMiddleware(
  options: WithPayloadOptions = {},
): MiddyMiddleware {
  return {
    before: async (request) => {
      if (!payloadSettings() && !isFlowEnvelope(request.event)) {
        return;
      }
      const { input, flow } = await resolveInput(request.event, options);
      request.event = input;
      request.internal = { ...request.internal, [FLOW_KEY]: flow };
    },
    after: async (request) => {
      const settings = payloadSettings();
      if (!settings) return;
      const flow = request.internal?.[FLOW_KEY] as Parameters<
        typeof offloadOutput
      >[2];
      request.response = await offloadOutput(
        request.response,
        settings,
        flow,
        options,
      );
    },
  };
}
