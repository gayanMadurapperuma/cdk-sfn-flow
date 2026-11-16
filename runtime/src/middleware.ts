import {
  FlowContext,
  flowSettings,
  isFlowEnvelope,
  offloadOutput,
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
 * and offloads the response in `after`, for invocations that arrive in an envelope.
 */
export function flowPayloadMiddleware(
  options: WithPayloadOptions = {},
): MiddyMiddleware {
  return {
    before: async (request) => {
      if (!isFlowEnvelope(request.event)) {
        return;
      }
      const { input, flow } = await resolveInput(request.event, options);
      request.event = input;
      request.internal = { ...request.internal, [FLOW_KEY]: flow };
    },
    after: async (request) => {
      // Only invocations that arrived in an envelope are offloaded.
      const flow = request.internal?.[FLOW_KEY] as FlowContext | undefined;
      const settings = flow && flowSettings(flow);
      if (!settings) return;
      request.response = await offloadOutput(
        request.response,
        settings,
        flow,
        options,
      );
    },
  };
}
