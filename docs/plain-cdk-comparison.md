# Plain CDK comparison

The README example written with plain CDK constructs (`sfn.*` / `tasks.*`), formatted with Prettier at
100 columns: **120 non-blank lines**, against **64** for `FlowWorkflow`.

It still lacks what `FlowWorkflow` adds on top: synth-time validation, payload warnings, the runtime
envelope with `keepInline`, and grants scoped to the workflow prefix (this version grants the whole
`flow/orders/*` prefix by hand).

```ts
const retry = {
  errors: [
    'States.TaskFailed',
    'Lambda.ServiceException',
    'Lambda.TooManyRequestsException',
    'Lambda.SdkClientException',
  ],
  maxAttempts: 3,
  interval: Duration.seconds(2),
  backoffRate: 2,
  jitterStrategy: sfn.JitterType.FULL,
};
const payloadBucket = new s3.Bucket(this, 'PayloadBucket', {
  encryption: s3.BucketEncryption.S3_MANAGED,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  enforceSSL: true,
  lifecycleRules: [{ prefix: 'flow/', expiration: Duration.days(7) }],
});
for (const fn of [validateFn, priceFn, notifyFn]) {
  payloadBucket.grantReadWrite(fn, 'flow/orders/*');
  fn.addEnvironment('PAYLOAD_BUCKET', payloadBucket.bucketName);
  fn.addEnvironment('PAYLOAD_THRESHOLD_KB', '200');
}
const notifyFailure = tasks.SnsPublish.jsonata(this, 'NotifyFailure', {
  topic: alertTopic,
  message: sfn.TaskInput.fromText('{% $string($states.input) %}'),
  outputs: '{% $states.input %}',
});
const flowFailed = sfn.Fail.jsonata(this, 'FlowFailed', {
  error: '{% $states.input.Error %}',
  cause: '{% $states.input.Cause %}',
});
notifyFailure.next(flowFailed);
const failed = sfn.Fail.jsonata(this, 'Failed', { error: 'OrderFailed' });
const validate = tasks.LambdaInvoke.jsonata(this, 'Validate', {
  lambdaFunction: validateFn,
  payloadResponseOnly: true,
  taskTimeout: sfn.Timeout.duration(Duration.minutes(2)),
  payload: sfn.TaskInput.fromText(
    '{% { "$flow": { "execution": $states.context.Execution.Name, "step": $states.context.State.Name }, "data": $states.input } %}',
  ),
  outputs:
    '{% $exists($states.result.`$flowRef`) ? $merge([$states.result.`$keep`, { "$flowRef": $states.result.`$flowRef` }]) : $states.result %}',
});
validate.addRetry(retry).addCatch(notifyFailure);
const getPrice = tasks.LambdaInvoke.jsonata(this, 'GetPrice', {
  lambdaFunction: priceFn,
  payloadResponseOnly: true,
  taskTimeout: sfn.Timeout.duration(Duration.minutes(2)),
  payload: sfn.TaskInput.fromText(
    '{% { "$flow": { "execution": $states.context.Execution.Name, "step": $states.context.State.Name, "keepInline": ["total"] }, "data": $states.input } %}',
  ),
  outputs:
    '{% $exists($states.result.`$flowRef`) ? $merge([$states.result.`$keep`, { "$flowRef": $states.result.`$flowRef` }]) : $states.result %}',
});
getPrice.addRetry(retry);
const getStock = new tasks.CallAwsService(this, 'GetStock', {
  service: 'dynamodb',
  action: 'getItem',
  iamResources: [stockTable.tableArn],
  iamAction: 'dynamodb:GetItem',
  parameters: { TableName: stockTable.tableName, Key: { sku: { S: '{% $states.input.sku %}' } } },
  queryLanguage: sfn.QueryLanguage.JSONATA,
  taskTimeout: sfn.Timeout.duration(Duration.minutes(2)),
});
getStock.addRetry(retry);
const enrich = sfn.Parallel.jsonata(this, 'Enrich', {
  outputs: '{% { "pricing": $states.result[0], "stock": $states.result[1] } %}',
});
enrich
  .branch(getPrice)
  .branch(getStock)
  .addRetry(retry)
  .addCatch(failed, { errors: ['States.ALL'] });
const ship = tasks.EventBridgePutEvents.jsonata(this, 'Ship', {
  entries: [
    {
      source: 'orders',
      detailType: 'OrderReady',
      detail: sfn.TaskInput.fromText('{% $states.input %}'),
    },
  ],
  taskTimeout: sfn.Timeout.duration(Duration.minutes(2)),
});
ship.addRetry(retry).addCatch(notifyFailure);
const coolOff = sfn.Wait.jsonata(this, 'CoolOff', {
  time: sfn.WaitTime.duration(Duration.seconds(300)),
});
const approval = tasks.LambdaInvoke.jsonata(this, 'Approval', {
  lambdaFunction: notifyFn,
  integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
  taskTimeout: sfn.Timeout.duration(Duration.days(2)),
  payload: sfn.TaskInput.fromText(
    '{% { "$flow": { "execution": $states.context.Execution.Name }, "data": $merge([$states.input, { "taskToken": $states.context.Task.Token }]) } %}',
  ),
});
approval.addRetry(retry).addCatch(notifyFailure);
const route = sfn.Choice.jsonata(this, 'Route')
  .when(sfn.Condition.jsonata('{% $states.input.pricing.total > 1000 %}'), approval)
  .otherwise(ship);
approval.next(coolOff);
coolOff.next(ship);
const logGroup = new logs.LogGroup(this, 'Logs', { retention: logs.RetentionDays.ONE_MONTH });
const stateMachine = new sfn.StateMachine(this, 'OrderFlow', {
  queryLanguage: sfn.QueryLanguage.JSONATA,
  definitionBody: sfn.DefinitionBody.fromChainable(validate.next(enrich).next(route)),
  tracingEnabled: true,
  logs: { destination: logGroup, level: sfn.LogLevel.ERROR },
});
for (const [id, metric] of [
  ['Failed', stateMachine.metricFailed()],
  ['TimedOut', stateMachine.metricTimedOut()],
] as const) {
  new cloudwatch.Alarm(this, `${id}Alarm`, {
    metric,
    threshold: 1,
    evaluationPeriods: 1,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  }).addAlarmAction(new actions.SnsAction(alertTopic));
}
```
