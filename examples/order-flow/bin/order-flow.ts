#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { OrderFlowStack } from "../lib/order-flow-stack";

const app = new App();
new OrderFlowStack(app, "OrderFlowExample", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
