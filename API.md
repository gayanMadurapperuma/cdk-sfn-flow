# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### FlowWorkflow <a name="FlowWorkflow" id="cdk-sfn-flow.FlowWorkflow"></a>

A Step Functions state machine generated from a behaviour-level config.

#### Initializers <a name="Initializers" id="cdk-sfn-flow.FlowWorkflow.Initializer"></a>

```typescript
import { FlowWorkflow } from 'cdk-sfn-flow'

new FlowWorkflow(scope: Construct, id: string, props: FlowWorkflowProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.FlowWorkflow.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#cdk-sfn-flow.FlowWorkflow.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#cdk-sfn-flow.FlowWorkflow.Initializer.parameter.props">props</a></code> | <code><a href="#cdk-sfn-flow.FlowWorkflowProps">FlowWorkflowProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="cdk-sfn-flow.FlowWorkflow.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="cdk-sfn-flow.FlowWorkflow.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="cdk-sfn-flow.FlowWorkflow.Initializer.parameter.props"></a>

- *Type:* <a href="#cdk-sfn-flow.FlowWorkflowProps">FlowWorkflowProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#cdk-sfn-flow.FlowWorkflow.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#cdk-sfn-flow.FlowWorkflow.with">with</a></code> | Applies one or more mixins to this construct. |

---

##### `toString` <a name="toString" id="cdk-sfn-flow.FlowWorkflow.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `with` <a name="with" id="cdk-sfn-flow.FlowWorkflow.with"></a>

```typescript
public with(mixins: ...IMixin[]): IConstruct
```

Applies one or more mixins to this construct.

Mixins are applied in order. The list of constructs is captured at the
start of the call, so constructs added by a mixin will not be visited.
Use multiple `with()` calls if subsequent mixins should apply to added
constructs.

###### `mixins`<sup>Required</sup> <a name="mixins" id="cdk-sfn-flow.FlowWorkflow.with.parameter.mixins"></a>

- *Type:* ...constructs.IMixin[]

The mixins to apply.

---

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#cdk-sfn-flow.FlowWorkflow.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="cdk-sfn-flow.FlowWorkflow.isConstruct"></a>

```typescript
import { FlowWorkflow } from 'cdk-sfn-flow'

FlowWorkflow.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="cdk-sfn-flow.FlowWorkflow.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.FlowWorkflow.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#cdk-sfn-flow.FlowWorkflow.property.role">role</a></code> | <code>aws-cdk-lib.aws_iam.IRole</code> | The execution role of the state machine. |
| <code><a href="#cdk-sfn-flow.FlowWorkflow.property.stateMachine">stateMachine</a></code> | <code>aws-cdk-lib.aws_stepfunctions.StateMachine</code> | The generated state machine. |
| <code><a href="#cdk-sfn-flow.FlowWorkflow.property.workflowType">workflowType</a></code> | <code><a href="#cdk-sfn-flow.WorkflowType">WorkflowType</a></code> | The workflow type. |
| <code><a href="#cdk-sfn-flow.FlowWorkflow.property.logGroup">logGroup</a></code> | <code>aws-cdk-lib.aws_logs.ILogGroup</code> | The execution log group, unless logging is off. |

---

##### `node`<sup>Required</sup> <a name="node" id="cdk-sfn-flow.FlowWorkflow.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `role`<sup>Required</sup> <a name="role" id="cdk-sfn-flow.FlowWorkflow.property.role"></a>

```typescript
public readonly role: IRole;
```

- *Type:* aws-cdk-lib.aws_iam.IRole

The execution role of the state machine.

---

##### `stateMachine`<sup>Required</sup> <a name="stateMachine" id="cdk-sfn-flow.FlowWorkflow.property.stateMachine"></a>

```typescript
public readonly stateMachine: StateMachine;
```

- *Type:* aws-cdk-lib.aws_stepfunctions.StateMachine

The generated state machine.

---

##### `workflowType`<sup>Required</sup> <a name="workflowType" id="cdk-sfn-flow.FlowWorkflow.property.workflowType"></a>

```typescript
public readonly workflowType: WorkflowType;
```

- *Type:* <a href="#cdk-sfn-flow.WorkflowType">WorkflowType</a>

The workflow type.

---

##### `logGroup`<sup>Optional</sup> <a name="logGroup" id="cdk-sfn-flow.FlowWorkflow.property.logGroup"></a>

```typescript
public readonly logGroup: ILogGroup;
```

- *Type:* aws-cdk-lib.aws_logs.ILogGroup

The execution log group, unless logging is off.

---


## Structs <a name="Structs" id="Structs"></a>

### CatchConfig <a name="CatchConfig" id="cdk-sfn-flow.CatchConfig"></a>

Routes errors raised by a step to another step in the same scope.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.CatchConfig.Initializer"></a>

```typescript
import { CatchConfig } from 'cdk-sfn-flow'

const catchConfig: CatchConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.CatchConfig.property.next">next</a></code> | <code>string</code> | Id of the step to continue with. |
| <code><a href="#cdk-sfn-flow.CatchConfig.property.assign">assign</a></code> | <code>{[ key: string ]: string}</code> | JSONata variables to assign when the error is caught. |
| <code><a href="#cdk-sfn-flow.CatchConfig.property.errors">errors</a></code> | <code>string[]</code> | Errors to catch. |
| <code><a href="#cdk-sfn-flow.CatchConfig.property.output">output</a></code> | <code>string</code> | JSONata output passed to the `next` step. |

---

##### `next`<sup>Required</sup> <a name="next" id="cdk-sfn-flow.CatchConfig.property.next"></a>

```typescript
public readonly next: string;
```

- *Type:* string

Id of the step to continue with.

It must be in the same scope (top level, branch or map iterator).

---

##### `assign`<sup>Optional</sup> <a name="assign" id="cdk-sfn-flow.CatchConfig.property.assign"></a>

```typescript
public readonly assign: {[ key: string ]: string};
```

- *Type:* {[ key: string ]: string}
- *Default:* no variables

JSONata variables to assign when the error is caught.

---

##### `errors`<sup>Optional</sup> <a name="errors" id="cdk-sfn-flow.CatchConfig.property.errors"></a>

```typescript
public readonly errors: string[];
```

- *Type:* string[]
- *Default:* ["States.ALL"]

Errors to catch.

---

##### `output`<sup>Optional</sup> <a name="output" id="cdk-sfn-flow.CatchConfig.property.output"></a>

```typescript
public readonly output: string;
```

- *Type:* string
- *Default:* the error output (`$states.errorOutput`)

JSONata output passed to the `next` step.

---

### ChoiceBranch <a name="ChoiceBranch" id="cdk-sfn-flow.ChoiceBranch"></a>

A conditional branch of a `Step.choice`.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.ChoiceBranch.Initializer"></a>

```typescript
import { ChoiceBranch } from 'cdk-sfn-flow'

const choiceBranch: ChoiceBranch = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.ChoiceBranch.property.next">next</a></code> | <code>string</code> | Id of the step to run when the condition is true. |
| <code><a href="#cdk-sfn-flow.ChoiceBranch.property.when">when</a></code> | <code>string</code> | JSONata condition, e.g. `{% $states.input.total > 1000 %}`. |
| <code><a href="#cdk-sfn-flow.ChoiceBranch.property.assign">assign</a></code> | <code>{[ key: string ]: string}</code> | JSONata variables to assign when this branch is taken. |
| <code><a href="#cdk-sfn-flow.ChoiceBranch.property.comment">comment</a></code> | <code>string</code> | A human-readable description of the branch. |
| <code><a href="#cdk-sfn-flow.ChoiceBranch.property.output">output</a></code> | <code>string</code> | JSONata output passed to `next` when this branch is taken. |

---

##### `next`<sup>Required</sup> <a name="next" id="cdk-sfn-flow.ChoiceBranch.property.next"></a>

```typescript
public readonly next: string;
```

- *Type:* string

Id of the step to run when the condition is true.

---

##### `when`<sup>Required</sup> <a name="when" id="cdk-sfn-flow.ChoiceBranch.property.when"></a>

```typescript
public readonly when: string;
```

- *Type:* string

JSONata condition, e.g. `{% $states.input.total > 1000 %}`.

---

##### `assign`<sup>Optional</sup> <a name="assign" id="cdk-sfn-flow.ChoiceBranch.property.assign"></a>

```typescript
public readonly assign: {[ key: string ]: string};
```

- *Type:* {[ key: string ]: string}
- *Default:* no variables

JSONata variables to assign when this branch is taken.

---

##### `comment`<sup>Optional</sup> <a name="comment" id="cdk-sfn-flow.ChoiceBranch.property.comment"></a>

```typescript
public readonly comment: string;
```

- *Type:* string
- *Default:* no comment

A human-readable description of the branch.

---

##### `output`<sup>Optional</sup> <a name="output" id="cdk-sfn-flow.ChoiceBranch.property.output"></a>

```typescript
public readonly output: string;
```

- *Type:* string
- *Default:* the choice input

JSONata output passed to `next` when this branch is taken.

---

### ChoiceStepProps <a name="ChoiceStepProps" id="cdk-sfn-flow.ChoiceStepProps"></a>

Properties for `Step.choice`. A choice is terminal: it has no implicit next step.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.ChoiceStepProps.Initializer"></a>

```typescript
import { ChoiceStepProps } from 'cdk-sfn-flow'

const choiceStepProps: ChoiceStepProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.ChoiceStepProps.property.branches">branches</a></code> | <code><a href="#cdk-sfn-flow.ChoiceBranch">ChoiceBranch</a>[]</code> | Branches, evaluated in order. |
| <code><a href="#cdk-sfn-flow.ChoiceStepProps.property.otherwise">otherwise</a></code> | <code>string</code> | Id of the step to run when no branch matches. |
| <code><a href="#cdk-sfn-flow.ChoiceStepProps.property.assign">assign</a></code> | <code>{[ key: string ]: string}</code> | JSONata variables to assign. |
| <code><a href="#cdk-sfn-flow.ChoiceStepProps.property.comment">comment</a></code> | <code>string</code> | A human-readable description of the step. |
| <code><a href="#cdk-sfn-flow.ChoiceStepProps.property.output">output</a></code> | <code>string</code> | JSONata expression for the step output. |

---

##### `branches`<sup>Required</sup> <a name="branches" id="cdk-sfn-flow.ChoiceStepProps.property.branches"></a>

```typescript
public readonly branches: ChoiceBranch[];
```

- *Type:* <a href="#cdk-sfn-flow.ChoiceBranch">ChoiceBranch</a>[]

Branches, evaluated in order.

---

##### `otherwise`<sup>Required</sup> <a name="otherwise" id="cdk-sfn-flow.ChoiceStepProps.property.otherwise"></a>

```typescript
public readonly otherwise: string;
```

- *Type:* string

Id of the step to run when no branch matches.

---

##### `assign`<sup>Optional</sup> <a name="assign" id="cdk-sfn-flow.ChoiceStepProps.property.assign"></a>

```typescript
public readonly assign: {[ key: string ]: string};
```

- *Type:* {[ key: string ]: string}
- *Default:* no variables

JSONata variables to assign.

---

##### `comment`<sup>Optional</sup> <a name="comment" id="cdk-sfn-flow.ChoiceStepProps.property.comment"></a>

```typescript
public readonly comment: string;
```

- *Type:* string
- *Default:* no comment

A human-readable description of the step.

---

##### `output`<sup>Optional</sup> <a name="output" id="cdk-sfn-flow.ChoiceStepProps.property.output"></a>

```typescript
public readonly output: string;
```

- *Type:* string
- *Default:* the choice input

JSONata expression for the step output.

---

### DefaultsConfig <a name="DefaultsConfig" id="cdk-sfn-flow.DefaultsConfig"></a>

Defaults applied to every `task`, `parallel`, `map` and `subflow` step.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.DefaultsConfig.Initializer"></a>

```typescript
import { DefaultsConfig } from 'cdk-sfn-flow'

const defaultsConfig: DefaultsConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.DefaultsConfig.property.catchErrors">catchErrors</a></code> | <code><a href="#cdk-sfn-flow.CatchConfig">CatchConfig</a>[]</code> | Default error routing for top-level steps without their own `catchErrors`. |
| <code><a href="#cdk-sfn-flow.DefaultsConfig.property.disableRetry">disableRetry</a></code> | <code>boolean</code> | Turns off retries for all steps unless a step sets `disableRetry: false`. |
| <code><a href="#cdk-sfn-flow.DefaultsConfig.property.retry">retry</a></code> | <code><a href="#cdk-sfn-flow.RetryConfig">RetryConfig</a></code> | Default retry. |
| <code><a href="#cdk-sfn-flow.DefaultsConfig.property.timeout">timeout</a></code> | <code>aws-cdk-lib.Duration</code> | Default timeout for `task` and `subflow` steps. |

---

##### `catchErrors`<sup>Optional</sup> <a name="catchErrors" id="cdk-sfn-flow.DefaultsConfig.property.catchErrors"></a>

```typescript
public readonly catchErrors: CatchConfig[];
```

- *Type:* <a href="#cdk-sfn-flow.CatchConfig">CatchConfig</a>[]
- *Default:* no catch, unless `alarms.topic` is set (then a global notify-and-fail catch is generated)

Default error routing for top-level steps without their own `catchErrors`.

Targets must be top-level step ids. Failures inside a parallel branch or map
iterator surface on the enclosing step and are caught there.

---

##### `disableRetry`<sup>Optional</sup> <a name="disableRetry" id="cdk-sfn-flow.DefaultsConfig.property.disableRetry"></a>

```typescript
public readonly disableRetry: boolean;
```

- *Type:* boolean
- *Default:* false

Turns off retries for all steps unless a step sets `disableRetry: false`.

---

##### `retry`<sup>Optional</sup> <a name="retry" id="cdk-sfn-flow.DefaultsConfig.property.retry"></a>

```typescript
public readonly retry: RetryConfig;
```

- *Type:* <a href="#cdk-sfn-flow.RetryConfig">RetryConfig</a>
- *Default:* the built-in retry (see `RetryConfig`)

Default retry.

Per-step `retry` fields override it.

---

##### `timeout`<sup>Optional</sup> <a name="timeout" id="cdk-sfn-flow.DefaultsConfig.property.timeout"></a>

```typescript
public readonly timeout: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* no timeout

Default timeout for `task` and `subflow` steps.

---

### EcsRunTaskInvokeProps <a name="EcsRunTaskInvokeProps" id="cdk-sfn-flow.EcsRunTaskInvokeProps"></a>

Properties for `Invoke.ecsRunTask`.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.EcsRunTaskInvokeProps.Initializer"></a>

```typescript
import { EcsRunTaskInvokeProps } from 'cdk-sfn-flow'

const ecsRunTaskInvokeProps: EcsRunTaskInvokeProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.EcsRunTaskInvokeProps.property.cluster">cluster</a></code> | <code>aws-cdk-lib.aws_ecs.ICluster</code> | The cluster to run the task on. |
| <code><a href="#cdk-sfn-flow.EcsRunTaskInvokeProps.property.taskDefinition">taskDefinition</a></code> | <code>aws-cdk-lib.aws_ecs.TaskDefinition</code> | The task definition to run. |
| <code><a href="#cdk-sfn-flow.EcsRunTaskInvokeProps.property.assignPublicIp">assignPublicIp</a></code> | <code>boolean</code> | Assign a public IP address (Fargate). |
| <code><a href="#cdk-sfn-flow.EcsRunTaskInvokeProps.property.containerOverrides">containerOverrides</a></code> | <code>aws-cdk-lib.aws_stepfunctions_tasks.ContainerOverride[]</code> | Container overrides. |
| <code><a href="#cdk-sfn-flow.EcsRunTaskInvokeProps.property.launchTarget">launchTarget</a></code> | <code>aws-cdk-lib.aws_stepfunctions_tasks.IEcsLaunchTarget</code> | Where to run the task. |
| <code><a href="#cdk-sfn-flow.EcsRunTaskInvokeProps.property.securityGroups">securityGroups</a></code> | <code>aws-cdk-lib.aws_ec2.ISecurityGroup[]</code> | Security groups for awsvpc networking. |
| <code><a href="#cdk-sfn-flow.EcsRunTaskInvokeProps.property.subnets">subnets</a></code> | <code>aws-cdk-lib.aws_ec2.SubnetSelection</code> | Subnets for awsvpc networking. |

---

##### `cluster`<sup>Required</sup> <a name="cluster" id="cdk-sfn-flow.EcsRunTaskInvokeProps.property.cluster"></a>

```typescript
public readonly cluster: ICluster;
```

- *Type:* aws-cdk-lib.aws_ecs.ICluster

The cluster to run the task on.

---

##### `taskDefinition`<sup>Required</sup> <a name="taskDefinition" id="cdk-sfn-flow.EcsRunTaskInvokeProps.property.taskDefinition"></a>

```typescript
public readonly taskDefinition: TaskDefinition;
```

- *Type:* aws-cdk-lib.aws_ecs.TaskDefinition

The task definition to run.

---

##### `assignPublicIp`<sup>Optional</sup> <a name="assignPublicIp" id="cdk-sfn-flow.EcsRunTaskInvokeProps.property.assignPublicIp"></a>

```typescript
public readonly assignPublicIp: boolean;
```

- *Type:* boolean
- *Default:* false

Assign a public IP address (Fargate).

---

##### `containerOverrides`<sup>Optional</sup> <a name="containerOverrides" id="cdk-sfn-flow.EcsRunTaskInvokeProps.property.containerOverrides"></a>

```typescript
public readonly containerOverrides: ContainerOverride[];
```

- *Type:* aws-cdk-lib.aws_stepfunctions_tasks.ContainerOverride[]
- *Default:* none

Container overrides.

Environment values may be JSONata expressions.

---

##### `launchTarget`<sup>Optional</sup> <a name="launchTarget" id="cdk-sfn-flow.EcsRunTaskInvokeProps.property.launchTarget"></a>

```typescript
public readonly launchTarget: IEcsLaunchTarget;
```

- *Type:* aws-cdk-lib.aws_stepfunctions_tasks.IEcsLaunchTarget
- *Default:* Fargate, latest platform version

Where to run the task.

---

##### `securityGroups`<sup>Optional</sup> <a name="securityGroups" id="cdk-sfn-flow.EcsRunTaskInvokeProps.property.securityGroups"></a>

```typescript
public readonly securityGroups: ISecurityGroup[];
```

- *Type:* aws-cdk-lib.aws_ec2.ISecurityGroup[]
- *Default:* a new security group

Security groups for awsvpc networking.

---

##### `subnets`<sup>Optional</sup> <a name="subnets" id="cdk-sfn-flow.EcsRunTaskInvokeProps.property.subnets"></a>

```typescript
public readonly subnets: SubnetSelection;
```

- *Type:* aws-cdk-lib.aws_ec2.SubnetSelection
- *Default:* private subnets of the cluster's VPC

Subnets for awsvpc networking.

---

### EventBridgeInvokeProps <a name="EventBridgeInvokeProps" id="cdk-sfn-flow.EventBridgeInvokeProps"></a>

Properties for `Invoke.eventBridge`.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.EventBridgeInvokeProps.Initializer"></a>

```typescript
import { EventBridgeInvokeProps } from 'cdk-sfn-flow'

const eventBridgeInvokeProps: EventBridgeInvokeProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.EventBridgeInvokeProps.property.detailExpr">detailExpr</a></code> | <code>string</code> | JSONata expression for the event detail. |
| <code><a href="#cdk-sfn-flow.EventBridgeInvokeProps.property.detailType">detailType</a></code> | <code>string</code> | The event detail type. |
| <code><a href="#cdk-sfn-flow.EventBridgeInvokeProps.property.source">source</a></code> | <code>string</code> | The event source. |
| <code><a href="#cdk-sfn-flow.EventBridgeInvokeProps.property.bus">bus</a></code> | <code>aws-cdk-lib.aws_events.IEventBus</code> | The event bus. |

---

##### `detailExpr`<sup>Required</sup> <a name="detailExpr" id="cdk-sfn-flow.EventBridgeInvokeProps.property.detailExpr"></a>

```typescript
public readonly detailExpr: string;
```

- *Type:* string

JSONata expression for the event detail.

---

##### `detailType`<sup>Required</sup> <a name="detailType" id="cdk-sfn-flow.EventBridgeInvokeProps.property.detailType"></a>

```typescript
public readonly detailType: string;
```

- *Type:* string

The event detail type.

---

##### `source`<sup>Required</sup> <a name="source" id="cdk-sfn-flow.EventBridgeInvokeProps.property.source"></a>

```typescript
public readonly source: string;
```

- *Type:* string

The event source.

---

##### `bus`<sup>Optional</sup> <a name="bus" id="cdk-sfn-flow.EventBridgeInvokeProps.property.bus"></a>

```typescript
public readonly bus: IEventBus;
```

- *Type:* aws-cdk-lib.aws_events.IEventBus
- *Default:* the account's default event bus

The event bus.

---

### FailStepProps <a name="FailStepProps" id="cdk-sfn-flow.FailStepProps"></a>

Properties for `Step.fail`.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.FailStepProps.Initializer"></a>

```typescript
import { FailStepProps } from 'cdk-sfn-flow'

const failStepProps: FailStepProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.FailStepProps.property.error">error</a></code> | <code>string</code> | Error name, or a JSONata expression that evaluates to one. |
| <code><a href="#cdk-sfn-flow.FailStepProps.property.cause">cause</a></code> | <code>string</code> | Error cause, or a JSONata expression that evaluates to one. |
| <code><a href="#cdk-sfn-flow.FailStepProps.property.comment">comment</a></code> | <code>string</code> | A human-readable description of the step. |

---

##### `error`<sup>Required</sup> <a name="error" id="cdk-sfn-flow.FailStepProps.property.error"></a>

```typescript
public readonly error: string;
```

- *Type:* string

Error name, or a JSONata expression that evaluates to one.

---

##### `cause`<sup>Optional</sup> <a name="cause" id="cdk-sfn-flow.FailStepProps.property.cause"></a>

```typescript
public readonly cause: string;
```

- *Type:* string
- *Default:* no cause

Error cause, or a JSONata expression that evaluates to one.

---

##### `comment`<sup>Optional</sup> <a name="comment" id="cdk-sfn-flow.FailStepProps.property.comment"></a>

```typescript
public readonly comment: string;
```

- *Type:* string
- *Default:* no comment

A human-readable description of the step.

---

### FlowWorkflowProps <a name="FlowWorkflowProps" id="cdk-sfn-flow.FlowWorkflowProps"></a>

Properties for a `FlowWorkflow`.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.FlowWorkflowProps.Initializer"></a>

```typescript
import { FlowWorkflowProps } from 'cdk-sfn-flow'

const flowWorkflowProps: FlowWorkflowProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.FlowWorkflowProps.property.steps">steps</a></code> | <code><a href="#cdk-sfn-flow.Step">Step</a>[]</code> | The steps, run in array order unless `next` says otherwise. |
| <code><a href="#cdk-sfn-flow.FlowWorkflowProps.property.defaults">defaults</a></code> | <code><a href="#cdk-sfn-flow.DefaultsConfig">DefaultsConfig</a></code> | Retry, catch and timeout defaults for `task`, `parallel`, `map` and `subflow` steps. |
| <code><a href="#cdk-sfn-flow.FlowWorkflowProps.property.logging">logging</a></code> | <code><a href="#cdk-sfn-flow.LoggingConfig">LoggingConfig</a></code> | Execution logging. |
| <code><a href="#cdk-sfn-flow.FlowWorkflowProps.property.name">name</a></code> | <code>string</code> | The state machine name. |
| <code><a href="#cdk-sfn-flow.FlowWorkflowProps.property.timeout">timeout</a></code> | <code>aws-cdk-lib.Duration</code> | Maximum execution time. |
| <code><a href="#cdk-sfn-flow.FlowWorkflowProps.property.tracing">tracing</a></code> | <code>boolean</code> | Enable X-Ray tracing. |
| <code><a href="#cdk-sfn-flow.FlowWorkflowProps.property.workflowType">workflowType</a></code> | <code><a href="#cdk-sfn-flow.WorkflowType">WorkflowType</a></code> | The workflow type. |

---

##### `steps`<sup>Required</sup> <a name="steps" id="cdk-sfn-flow.FlowWorkflowProps.property.steps"></a>

```typescript
public readonly steps: Step[];
```

- *Type:* <a href="#cdk-sfn-flow.Step">Step</a>[]

The steps, run in array order unless `next` says otherwise.

---

##### `defaults`<sup>Optional</sup> <a name="defaults" id="cdk-sfn-flow.FlowWorkflowProps.property.defaults"></a>

```typescript
public readonly defaults: DefaultsConfig;
```

- *Type:* <a href="#cdk-sfn-flow.DefaultsConfig">DefaultsConfig</a>
- *Default:* built-in retry, no catch, no timeout

Retry, catch and timeout defaults for `task`, `parallel`, `map` and `subflow` steps.

---

##### `logging`<sup>Optional</sup> <a name="logging" id="cdk-sfn-flow.FlowWorkflowProps.property.logging"></a>

```typescript
public readonly logging: LoggingConfig;
```

- *Type:* <a href="#cdk-sfn-flow.LoggingConfig">LoggingConfig</a>
- *Default:* ERROR level, no execution data, 30-day retention

Execution logging.

---

##### `name`<sup>Optional</sup> <a name="name" id="cdk-sfn-flow.FlowWorkflowProps.property.name"></a>

```typescript
public readonly name: string;
```

- *Type:* string
- *Default:* a name is generated by CloudFormation

The state machine name.

---

##### `timeout`<sup>Optional</sup> <a name="timeout" id="cdk-sfn-flow.FlowWorkflowProps.property.timeout"></a>

```typescript
public readonly timeout: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* no timeout (STANDARD: one year, EXPRESS: five minutes)

Maximum execution time.

---

##### `tracing`<sup>Optional</sup> <a name="tracing" id="cdk-sfn-flow.FlowWorkflowProps.property.tracing"></a>

```typescript
public readonly tracing: boolean;
```

- *Type:* boolean
- *Default:* true

Enable X-Ray tracing.

---

##### `workflowType`<sup>Optional</sup> <a name="workflowType" id="cdk-sfn-flow.FlowWorkflowProps.property.workflowType"></a>

```typescript
public readonly workflowType: WorkflowType;
```

- *Type:* <a href="#cdk-sfn-flow.WorkflowType">WorkflowType</a>
- *Default:* WorkflowType.STANDARD

The workflow type.

---

### HttpInvokeOptions <a name="HttpInvokeOptions" id="cdk-sfn-flow.HttpInvokeOptions"></a>

Options for `Invoke.http`. Values may be literals or JSONata expressions.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.HttpInvokeOptions.Initializer"></a>

```typescript
import { HttpInvokeOptions } from 'cdk-sfn-flow'

const httpInvokeOptions: HttpInvokeOptions = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.HttpInvokeOptions.property.body">body</a></code> | <code>string</code> | Request body. |
| <code><a href="#cdk-sfn-flow.HttpInvokeOptions.property.headers">headers</a></code> | <code>string</code> | Request headers (a JSONata expression that evaluates to an object). |
| <code><a href="#cdk-sfn-flow.HttpInvokeOptions.property.path">path</a></code> | <code>string</code> | Path appended to the URL (after a `/`). |
| <code><a href="#cdk-sfn-flow.HttpInvokeOptions.property.queryParameters">queryParameters</a></code> | <code>string</code> | Query parameters (a JSONata expression that evaluates to an object). |

---

##### `body`<sup>Optional</sup> <a name="body" id="cdk-sfn-flow.HttpInvokeOptions.property.body"></a>

```typescript
public readonly body: string;
```

- *Type:* string
- *Default:* no body

Request body.

---

##### `headers`<sup>Optional</sup> <a name="headers" id="cdk-sfn-flow.HttpInvokeOptions.property.headers"></a>

```typescript
public readonly headers: string;
```

- *Type:* string
- *Default:* no extra headers

Request headers (a JSONata expression that evaluates to an object).

---

##### `path`<sup>Optional</sup> <a name="path" id="cdk-sfn-flow.HttpInvokeOptions.property.path"></a>

```typescript
public readonly path: string;
```

- *Type:* string
- *Default:* the last path segment of `url`

Path appended to the URL (after a `/`).

---

##### `queryParameters`<sup>Optional</sup> <a name="queryParameters" id="cdk-sfn-flow.HttpInvokeOptions.property.queryParameters"></a>

```typescript
public readonly queryParameters: string;
```

- *Type:* string
- *Default:* none

Query parameters (a JSONata expression that evaluates to an object).

---

### LoggingConfig <a name="LoggingConfig" id="cdk-sfn-flow.LoggingConfig"></a>

Execution logging configuration.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.LoggingConfig.Initializer"></a>

```typescript
import { LoggingConfig } from 'cdk-sfn-flow'

const loggingConfig: LoggingConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.LoggingConfig.property.destination">destination</a></code> | <code>aws-cdk-lib.aws_logs.ILogGroup</code> | Log to an existing log group instead of creating one. |
| <code><a href="#cdk-sfn-flow.LoggingConfig.property.includeData">includeData</a></code> | <code>boolean</code> | Include execution input and output in the logs. |
| <code><a href="#cdk-sfn-flow.LoggingConfig.property.level">level</a></code> | <code>aws-cdk-lib.aws_stepfunctions.LogLevel</code> | What to log. |
| <code><a href="#cdk-sfn-flow.LoggingConfig.property.removalPolicy">removalPolicy</a></code> | <code>aws-cdk-lib.RemovalPolicy</code> | Removal policy of the generated log group. |
| <code><a href="#cdk-sfn-flow.LoggingConfig.property.retention">retention</a></code> | <code>aws-cdk-lib.aws_logs.RetentionDays</code> | Retention of the generated log group. |

---

##### `destination`<sup>Optional</sup> <a name="destination" id="cdk-sfn-flow.LoggingConfig.property.destination"></a>

```typescript
public readonly destination: ILogGroup;
```

- *Type:* aws-cdk-lib.aws_logs.ILogGroup
- *Default:* a log group is created

Log to an existing log group instead of creating one.

---

##### `includeData`<sup>Optional</sup> <a name="includeData" id="cdk-sfn-flow.LoggingConfig.property.includeData"></a>

```typescript
public readonly includeData: boolean;
```

- *Type:* boolean
- *Default:* false

Include execution input and output in the logs.

---

##### `level`<sup>Optional</sup> <a name="level" id="cdk-sfn-flow.LoggingConfig.property.level"></a>

```typescript
public readonly level: LogLevel;
```

- *Type:* aws-cdk-lib.aws_stepfunctions.LogLevel
- *Default:* LogLevel.ERROR

What to log.

`LogLevel.OFF` disables logging and no log group is created.

---

##### `removalPolicy`<sup>Optional</sup> <a name="removalPolicy" id="cdk-sfn-flow.LoggingConfig.property.removalPolicy"></a>

```typescript
public readonly removalPolicy: RemovalPolicy;
```

- *Type:* aws-cdk-lib.RemovalPolicy
- *Default:* RemovalPolicy.RETAIN

Removal policy of the generated log group.

---

##### `retention`<sup>Optional</sup> <a name="retention" id="cdk-sfn-flow.LoggingConfig.property.retention"></a>

```typescript
public readonly retention: RetentionDays;
```

- *Type:* aws-cdk-lib.aws_logs.RetentionDays
- *Default:* RetentionDays.ONE_MONTH

Retention of the generated log group.

---

### PassStepProps <a name="PassStepProps" id="cdk-sfn-flow.PassStepProps"></a>

Properties for `Step.pass`.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.PassStepProps.Initializer"></a>

```typescript
import { PassStepProps } from 'cdk-sfn-flow'

const passStepProps: PassStepProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.PassStepProps.property.assign">assign</a></code> | <code>{[ key: string ]: string}</code> | JSONata variables to assign, by name. |
| <code><a href="#cdk-sfn-flow.PassStepProps.property.comment">comment</a></code> | <code>string</code> | A human-readable description of the step. |
| <code><a href="#cdk-sfn-flow.PassStepProps.property.next">next</a></code> | <code>string</code> | Id of the step that runs next, or `"end"` to end the current step list. |
| <code><a href="#cdk-sfn-flow.PassStepProps.property.output">output</a></code> | <code>string</code> | JSONata expression for the step output. |

---

##### `assign`<sup>Optional</sup> <a name="assign" id="cdk-sfn-flow.PassStepProps.property.assign"></a>

```typescript
public readonly assign: {[ key: string ]: string};
```

- *Type:* {[ key: string ]: string}
- *Default:* no variables

JSONata variables to assign, by name.

---

##### `comment`<sup>Optional</sup> <a name="comment" id="cdk-sfn-flow.PassStepProps.property.comment"></a>

```typescript
public readonly comment: string;
```

- *Type:* string
- *Default:* no comment

A human-readable description of the step.

---

##### `next`<sup>Optional</sup> <a name="next" id="cdk-sfn-flow.PassStepProps.property.next"></a>

```typescript
public readonly next: string;
```

- *Type:* string
- *Default:* the following step in the list, or the end of the list for the last step

Id of the step that runs next, or `"end"` to end the current step list.

---

##### `output`<sup>Optional</sup> <a name="output" id="cdk-sfn-flow.PassStepProps.property.output"></a>

```typescript
public readonly output: string;
```

- *Type:* string
- *Default:* the state's default output

JSONata expression for the step output.

---

### RawStepProps <a name="RawStepProps" id="cdk-sfn-flow.RawStepProps"></a>

Properties for `Step.raw`.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.RawStepProps.Initializer"></a>

```typescript
import { RawStepProps } from 'cdk-sfn-flow'

const rawStepProps: RawStepProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.RawStepProps.property.next">next</a></code> | <code>string</code> | Id of the step that runs after the chain's end states, or `"end"`. |

---

##### `next`<sup>Optional</sup> <a name="next" id="cdk-sfn-flow.RawStepProps.property.next"></a>

```typescript
public readonly next: string;
```

- *Type:* string
- *Default:* the following step in the list

Id of the step that runs after the chain's end states, or `"end"`.

---

### ResilientStepProps <a name="ResilientStepProps" id="cdk-sfn-flow.ResilientStepProps"></a>

Retry and catch fields for steps that call other services.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.ResilientStepProps.Initializer"></a>

```typescript
import { ResilientStepProps } from 'cdk-sfn-flow'

const resilientStepProps: ResilientStepProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.ResilientStepProps.property.assign">assign</a></code> | <code>{[ key: string ]: string}</code> | JSONata variables to assign, by name. |
| <code><a href="#cdk-sfn-flow.ResilientStepProps.property.comment">comment</a></code> | <code>string</code> | A human-readable description of the step. |
| <code><a href="#cdk-sfn-flow.ResilientStepProps.property.next">next</a></code> | <code>string</code> | Id of the step that runs next, or `"end"` to end the current step list. |
| <code><a href="#cdk-sfn-flow.ResilientStepProps.property.output">output</a></code> | <code>string</code> | JSONata expression for the step output. |
| <code><a href="#cdk-sfn-flow.ResilientStepProps.property.catchErrors">catchErrors</a></code> | <code><a href="#cdk-sfn-flow.CatchConfig">CatchConfig</a>[]</code> | Error routing for this step. |
| <code><a href="#cdk-sfn-flow.ResilientStepProps.property.disableRetry">disableRetry</a></code> | <code>boolean</code> | Turns off retries for this step. |
| <code><a href="#cdk-sfn-flow.ResilientStepProps.property.retry">retry</a></code> | <code><a href="#cdk-sfn-flow.RetryConfig">RetryConfig</a></code> | Retry configuration, merged over `defaults.retry`. |

---

##### `assign`<sup>Optional</sup> <a name="assign" id="cdk-sfn-flow.ResilientStepProps.property.assign"></a>

```typescript
public readonly assign: {[ key: string ]: string};
```

- *Type:* {[ key: string ]: string}
- *Default:* no variables

JSONata variables to assign, by name.

---

##### `comment`<sup>Optional</sup> <a name="comment" id="cdk-sfn-flow.ResilientStepProps.property.comment"></a>

```typescript
public readonly comment: string;
```

- *Type:* string
- *Default:* no comment

A human-readable description of the step.

---

##### `next`<sup>Optional</sup> <a name="next" id="cdk-sfn-flow.ResilientStepProps.property.next"></a>

```typescript
public readonly next: string;
```

- *Type:* string
- *Default:* the following step in the list, or the end of the list for the last step

Id of the step that runs next, or `"end"` to end the current step list.

---

##### `output`<sup>Optional</sup> <a name="output" id="cdk-sfn-flow.ResilientStepProps.property.output"></a>

```typescript
public readonly output: string;
```

- *Type:* string
- *Default:* the state's default output

JSONata expression for the step output.

---

##### `catchErrors`<sup>Optional</sup> <a name="catchErrors" id="cdk-sfn-flow.ResilientStepProps.property.catchErrors"></a>

```typescript
public readonly catchErrors: CatchConfig[];
```

- *Type:* <a href="#cdk-sfn-flow.CatchConfig">CatchConfig</a>[]
- *Default:* defaults.catchErrors (top-level steps only)

Error routing for this step.

Replaces `defaults.catchErrors`.

---

##### `disableRetry`<sup>Optional</sup> <a name="disableRetry" id="cdk-sfn-flow.ResilientStepProps.property.disableRetry"></a>

```typescript
public readonly disableRetry: boolean;
```

- *Type:* boolean
- *Default:* defaults.disableRetry

Turns off retries for this step.

---

##### `retry`<sup>Optional</sup> <a name="retry" id="cdk-sfn-flow.ResilientStepProps.property.retry"></a>

```typescript
public readonly retry: RetryConfig;
```

- *Type:* <a href="#cdk-sfn-flow.RetryConfig">RetryConfig</a>
- *Default:* defaults.retry

Retry configuration, merged over `defaults.retry`.

---

### RetryConfig <a name="RetryConfig" id="cdk-sfn-flow.RetryConfig"></a>

Retry configuration for a step.

Unset fields fall back to `defaults.retry`,
then to the built-in default.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.RetryConfig.Initializer"></a>

```typescript
import { RetryConfig } from 'cdk-sfn-flow'

const retryConfig: RetryConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.RetryConfig.property.attempts">attempts</a></code> | <code>number</code> | Maximum number of retry attempts. |
| <code><a href="#cdk-sfn-flow.RetryConfig.property.backoffRate">backoffRate</a></code> | <code>number</code> | Multiplier applied to the delay after each attempt. |
| <code><a href="#cdk-sfn-flow.RetryConfig.property.errors">errors</a></code> | <code>string[]</code> | Errors to retry. |
| <code><a href="#cdk-sfn-flow.RetryConfig.property.interval">interval</a></code> | <code>aws-cdk-lib.Duration</code> | Delay before the first retry. |
| <code><a href="#cdk-sfn-flow.RetryConfig.property.jitter">jitter</a></code> | <code>aws-cdk-lib.aws_stepfunctions.JitterType</code> | Jitter strategy. |
| <code><a href="#cdk-sfn-flow.RetryConfig.property.maxDelay">maxDelay</a></code> | <code>aws-cdk-lib.Duration</code> | Upper bound for the delay between attempts. |

---

##### `attempts`<sup>Optional</sup> <a name="attempts" id="cdk-sfn-flow.RetryConfig.property.attempts"></a>

```typescript
public readonly attempts: number;
```

- *Type:* number
- *Default:* 3

Maximum number of retry attempts.

---

##### `backoffRate`<sup>Optional</sup> <a name="backoffRate" id="cdk-sfn-flow.RetryConfig.property.backoffRate"></a>

```typescript
public readonly backoffRate: number;
```

- *Type:* number
- *Default:* 2

Multiplier applied to the delay after each attempt.

---

##### `errors`<sup>Optional</sup> <a name="errors" id="cdk-sfn-flow.RetryConfig.property.errors"></a>

```typescript
public readonly errors: string[];
```

- *Type:* string[]
- *Default:* States.TaskFailed, Lambda.ServiceException, Lambda.TooManyRequestsException, Lambda.SdkClientException

Errors to retry.

---

##### `interval`<sup>Optional</sup> <a name="interval" id="cdk-sfn-flow.RetryConfig.property.interval"></a>

```typescript
public readonly interval: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* Duration.seconds(2)

Delay before the first retry.

---

##### `jitter`<sup>Optional</sup> <a name="jitter" id="cdk-sfn-flow.RetryConfig.property.jitter"></a>

```typescript
public readonly jitter: JitterType;
```

- *Type:* aws-cdk-lib.aws_stepfunctions.JitterType
- *Default:* JitterType.FULL

Jitter strategy.

---

##### `maxDelay`<sup>Optional</sup> <a name="maxDelay" id="cdk-sfn-flow.RetryConfig.property.maxDelay"></a>

```typescript
public readonly maxDelay: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* no maximum

Upper bound for the delay between attempts.

---

### SdkInvokeProps <a name="SdkInvokeProps" id="cdk-sfn-flow.SdkInvokeProps"></a>

Properties for `Invoke.sdk`.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.SdkInvokeProps.Initializer"></a>

```typescript
import { SdkInvokeProps } from 'cdk-sfn-flow'

const sdkInvokeProps: SdkInvokeProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.SdkInvokeProps.property.action">action</a></code> | <code>string</code> | The API action, camelCase as in the SDK (e.g. `getObject`). |
| <code><a href="#cdk-sfn-flow.SdkInvokeProps.property.iamResources">iamResources</a></code> | <code>string[]</code> | Resource ARNs the action is granted on. |
| <code><a href="#cdk-sfn-flow.SdkInvokeProps.property.service">service</a></code> | <code>string</code> | The AWS SDK service name, lower case (e.g. `s3`, `dynamodb`, `secretsmanager`). |
| <code><a href="#cdk-sfn-flow.SdkInvokeProps.property.iamAction">iamAction</a></code> | <code>string</code> | The IAM action, when it does not follow `service:Action`. |
| <code><a href="#cdk-sfn-flow.SdkInvokeProps.property.paramsExpr">paramsExpr</a></code> | <code>string</code> | JSONata expression for the API parameters. |

---

##### `action`<sup>Required</sup> <a name="action" id="cdk-sfn-flow.SdkInvokeProps.property.action"></a>

```typescript
public readonly action: string;
```

- *Type:* string

The API action, camelCase as in the SDK (e.g. `getObject`).

---

##### `iamResources`<sup>Required</sup> <a name="iamResources" id="cdk-sfn-flow.SdkInvokeProps.property.iamResources"></a>

```typescript
public readonly iamResources: string[];
```

- *Type:* string[]

Resource ARNs the action is granted on.

---

##### `service`<sup>Required</sup> <a name="service" id="cdk-sfn-flow.SdkInvokeProps.property.service"></a>

```typescript
public readonly service: string;
```

- *Type:* string

The AWS SDK service name, lower case (e.g. `s3`, `dynamodb`, `secretsmanager`).

---

##### `iamAction`<sup>Optional</sup> <a name="iamAction" id="cdk-sfn-flow.SdkInvokeProps.property.iamAction"></a>

```typescript
public readonly iamAction: string;
```

- *Type:* string
- *Default:* `<service>:<Action>`

The IAM action, when it does not follow `service:Action`.

---

##### `paramsExpr`<sup>Optional</sup> <a name="paramsExpr" id="cdk-sfn-flow.SdkInvokeProps.property.paramsExpr"></a>

```typescript
public readonly paramsExpr: string;
```

- *Type:* string
- *Default:* no parameters

JSONata expression for the API parameters.

---

### SnsInvokeOptions <a name="SnsInvokeOptions" id="cdk-sfn-flow.SnsInvokeOptions"></a>

Options for `Invoke.sns`.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.SnsInvokeOptions.Initializer"></a>

```typescript
import { SnsInvokeOptions } from 'cdk-sfn-flow'

const snsInvokeOptions: SnsInvokeOptions = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.SnsInvokeOptions.property.messageGroupId">messageGroupId</a></code> | <code>string</code> | Message group id (FIFO topics). |
| <code><a href="#cdk-sfn-flow.SnsInvokeOptions.property.subject">subject</a></code> | <code>string</code> | Message subject (email subscriptions). |

---

##### `messageGroupId`<sup>Optional</sup> <a name="messageGroupId" id="cdk-sfn-flow.SnsInvokeOptions.property.messageGroupId"></a>

```typescript
public readonly messageGroupId: string;
```

- *Type:* string
- *Default:* none

Message group id (FIFO topics).

---

##### `subject`<sup>Optional</sup> <a name="subject" id="cdk-sfn-flow.SnsInvokeOptions.property.subject"></a>

```typescript
public readonly subject: string;
```

- *Type:* string
- *Default:* none

Message subject (email subscriptions).

---

### SqsInvokeOptions <a name="SqsInvokeOptions" id="cdk-sfn-flow.SqsInvokeOptions"></a>

Options for `Invoke.sqs`.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.SqsInvokeOptions.Initializer"></a>

```typescript
import { SqsInvokeOptions } from 'cdk-sfn-flow'

const sqsInvokeOptions: SqsInvokeOptions = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.SqsInvokeOptions.property.delay">delay</a></code> | <code>aws-cdk-lib.Duration</code> | Delivery delay. |
| <code><a href="#cdk-sfn-flow.SqsInvokeOptions.property.messageDeduplicationId">messageDeduplicationId</a></code> | <code>string</code> | Message deduplication id (FIFO queues without content-based deduplication). |
| <code><a href="#cdk-sfn-flow.SqsInvokeOptions.property.messageGroupId">messageGroupId</a></code> | <code>string</code> | Message group id (FIFO queues). |

---

##### `delay`<sup>Optional</sup> <a name="delay" id="cdk-sfn-flow.SqsInvokeOptions.property.delay"></a>

```typescript
public readonly delay: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* the queue's default delay

Delivery delay.

---

##### `messageDeduplicationId`<sup>Optional</sup> <a name="messageDeduplicationId" id="cdk-sfn-flow.SqsInvokeOptions.property.messageDeduplicationId"></a>

```typescript
public readonly messageDeduplicationId: string;
```

- *Type:* string
- *Default:* none

Message deduplication id (FIFO queues without content-based deduplication).

---

##### `messageGroupId`<sup>Optional</sup> <a name="messageGroupId" id="cdk-sfn-flow.SqsInvokeOptions.property.messageGroupId"></a>

```typescript
public readonly messageGroupId: string;
```

- *Type:* string
- *Default:* none

Message group id (FIFO queues).

---

### StepBaseProps <a name="StepBaseProps" id="cdk-sfn-flow.StepBaseProps"></a>

Fields shared by every step.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.StepBaseProps.Initializer"></a>

```typescript
import { StepBaseProps } from 'cdk-sfn-flow'

const stepBaseProps: StepBaseProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.StepBaseProps.property.assign">assign</a></code> | <code>{[ key: string ]: string}</code> | JSONata variables to assign, by name. |
| <code><a href="#cdk-sfn-flow.StepBaseProps.property.comment">comment</a></code> | <code>string</code> | A human-readable description of the step. |
| <code><a href="#cdk-sfn-flow.StepBaseProps.property.next">next</a></code> | <code>string</code> | Id of the step that runs next, or `"end"` to end the current step list. |
| <code><a href="#cdk-sfn-flow.StepBaseProps.property.output">output</a></code> | <code>string</code> | JSONata expression for the step output. |

---

##### `assign`<sup>Optional</sup> <a name="assign" id="cdk-sfn-flow.StepBaseProps.property.assign"></a>

```typescript
public readonly assign: {[ key: string ]: string};
```

- *Type:* {[ key: string ]: string}
- *Default:* no variables

JSONata variables to assign, by name.

---

##### `comment`<sup>Optional</sup> <a name="comment" id="cdk-sfn-flow.StepBaseProps.property.comment"></a>

```typescript
public readonly comment: string;
```

- *Type:* string
- *Default:* no comment

A human-readable description of the step.

---

##### `next`<sup>Optional</sup> <a name="next" id="cdk-sfn-flow.StepBaseProps.property.next"></a>

```typescript
public readonly next: string;
```

- *Type:* string
- *Default:* the following step in the list, or the end of the list for the last step

Id of the step that runs next, or `"end"` to end the current step list.

---

##### `output`<sup>Optional</sup> <a name="output" id="cdk-sfn-flow.StepBaseProps.property.output"></a>

```typescript
public readonly output: string;
```

- *Type:* string
- *Default:* the state's default output

JSONata expression for the step output.

---

### SucceedStepProps <a name="SucceedStepProps" id="cdk-sfn-flow.SucceedStepProps"></a>

Properties for `Step.succeed`.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.SucceedStepProps.Initializer"></a>

```typescript
import { SucceedStepProps } from 'cdk-sfn-flow'

const succeedStepProps: SucceedStepProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.SucceedStepProps.property.comment">comment</a></code> | <code>string</code> | A human-readable description of the step. |
| <code><a href="#cdk-sfn-flow.SucceedStepProps.property.output">output</a></code> | <code>string</code> | JSONata expression for the workflow (or branch) output. |

---

##### `comment`<sup>Optional</sup> <a name="comment" id="cdk-sfn-flow.SucceedStepProps.property.comment"></a>

```typescript
public readonly comment: string;
```

- *Type:* string
- *Default:* no comment

A human-readable description of the step.

---

##### `output`<sup>Optional</sup> <a name="output" id="cdk-sfn-flow.SucceedStepProps.property.output"></a>

```typescript
public readonly output: string;
```

- *Type:* string
- *Default:* the step input

JSONata expression for the workflow (or branch) output.

---

### TaskStepProps <a name="TaskStepProps" id="cdk-sfn-flow.TaskStepProps"></a>

Properties for `Step.task`.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.TaskStepProps.Initializer"></a>

```typescript
import { TaskStepProps } from 'cdk-sfn-flow'

const taskStepProps: TaskStepProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.TaskStepProps.property.assign">assign</a></code> | <code>{[ key: string ]: string}</code> | JSONata variables to assign, by name. |
| <code><a href="#cdk-sfn-flow.TaskStepProps.property.comment">comment</a></code> | <code>string</code> | A human-readable description of the step. |
| <code><a href="#cdk-sfn-flow.TaskStepProps.property.next">next</a></code> | <code>string</code> | Id of the step that runs next, or `"end"` to end the current step list. |
| <code><a href="#cdk-sfn-flow.TaskStepProps.property.output">output</a></code> | <code>string</code> | JSONata expression for the step output. |
| <code><a href="#cdk-sfn-flow.TaskStepProps.property.catchErrors">catchErrors</a></code> | <code><a href="#cdk-sfn-flow.CatchConfig">CatchConfig</a>[]</code> | Error routing for this step. |
| <code><a href="#cdk-sfn-flow.TaskStepProps.property.disableRetry">disableRetry</a></code> | <code>boolean</code> | Turns off retries for this step. |
| <code><a href="#cdk-sfn-flow.TaskStepProps.property.retry">retry</a></code> | <code><a href="#cdk-sfn-flow.RetryConfig">RetryConfig</a></code> | Retry configuration, merged over `defaults.retry`. |
| <code><a href="#cdk-sfn-flow.TaskStepProps.property.invoke">invoke</a></code> | <code><a href="#cdk-sfn-flow.Invoke">Invoke</a></code> | The service to call. |
| <code><a href="#cdk-sfn-flow.TaskStepProps.property.heartbeat">heartbeat</a></code> | <code>aws-cdk-lib.Duration</code> | Heartbeat timeout, mainly for callback tasks. |
| <code><a href="#cdk-sfn-flow.TaskStepProps.property.input">input</a></code> | <code>string</code> | JSONata payload for targets that take one (Lambda). |
| <code><a href="#cdk-sfn-flow.TaskStepProps.property.keepInline">keepInline</a></code> | <code>string[]</code> | Output fields that must stay inline when the payload strategy offloads this task's output to S3, for example fields read by a later `choice`. |
| <code><a href="#cdk-sfn-flow.TaskStepProps.property.pattern">pattern</a></code> | <code><a href="#cdk-sfn-flow.TaskPattern">TaskPattern</a></code> | How the task waits for the service. |
| <code><a href="#cdk-sfn-flow.TaskStepProps.property.timeout">timeout</a></code> | <code>aws-cdk-lib.Duration</code> | Task timeout. |

---

##### `assign`<sup>Optional</sup> <a name="assign" id="cdk-sfn-flow.TaskStepProps.property.assign"></a>

```typescript
public readonly assign: {[ key: string ]: string};
```

- *Type:* {[ key: string ]: string}
- *Default:* no variables

JSONata variables to assign, by name.

---

##### `comment`<sup>Optional</sup> <a name="comment" id="cdk-sfn-flow.TaskStepProps.property.comment"></a>

```typescript
public readonly comment: string;
```

- *Type:* string
- *Default:* no comment

A human-readable description of the step.

---

##### `next`<sup>Optional</sup> <a name="next" id="cdk-sfn-flow.TaskStepProps.property.next"></a>

```typescript
public readonly next: string;
```

- *Type:* string
- *Default:* the following step in the list, or the end of the list for the last step

Id of the step that runs next, or `"end"` to end the current step list.

---

##### `output`<sup>Optional</sup> <a name="output" id="cdk-sfn-flow.TaskStepProps.property.output"></a>

```typescript
public readonly output: string;
```

- *Type:* string
- *Default:* the state's default output

JSONata expression for the step output.

---

##### `catchErrors`<sup>Optional</sup> <a name="catchErrors" id="cdk-sfn-flow.TaskStepProps.property.catchErrors"></a>

```typescript
public readonly catchErrors: CatchConfig[];
```

- *Type:* <a href="#cdk-sfn-flow.CatchConfig">CatchConfig</a>[]
- *Default:* defaults.catchErrors (top-level steps only)

Error routing for this step.

Replaces `defaults.catchErrors`.

---

##### `disableRetry`<sup>Optional</sup> <a name="disableRetry" id="cdk-sfn-flow.TaskStepProps.property.disableRetry"></a>

```typescript
public readonly disableRetry: boolean;
```

- *Type:* boolean
- *Default:* defaults.disableRetry

Turns off retries for this step.

---

##### `retry`<sup>Optional</sup> <a name="retry" id="cdk-sfn-flow.TaskStepProps.property.retry"></a>

```typescript
public readonly retry: RetryConfig;
```

- *Type:* <a href="#cdk-sfn-flow.RetryConfig">RetryConfig</a>
- *Default:* defaults.retry

Retry configuration, merged over `defaults.retry`.

---

##### `invoke`<sup>Required</sup> <a name="invoke" id="cdk-sfn-flow.TaskStepProps.property.invoke"></a>

```typescript
public readonly invoke: Invoke;
```

- *Type:* <a href="#cdk-sfn-flow.Invoke">Invoke</a>

The service to call.

---

##### `heartbeat`<sup>Optional</sup> <a name="heartbeat" id="cdk-sfn-flow.TaskStepProps.property.heartbeat"></a>

```typescript
public readonly heartbeat: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* no heartbeat

Heartbeat timeout, mainly for callback tasks.

---

##### `input`<sup>Optional</sup> <a name="input" id="cdk-sfn-flow.TaskStepProps.property.input"></a>

```typescript
public readonly input: string;
```

- *Type:* string
- *Default:* "{% $states.input %}"

JSONata payload for targets that take one (Lambda).

---

##### `keepInline`<sup>Optional</sup> <a name="keepInline" id="cdk-sfn-flow.TaskStepProps.property.keepInline"></a>

```typescript
public readonly keepInline: string[];
```

- *Type:* string[]
- *Default:* none

Output fields that must stay inline when the payload strategy offloads this task's output to S3, for example fields read by a later `choice`.

---

##### `pattern`<sup>Optional</sup> <a name="pattern" id="cdk-sfn-flow.TaskStepProps.property.pattern"></a>

```typescript
public readonly pattern: TaskPattern;
```

- *Type:* <a href="#cdk-sfn-flow.TaskPattern">TaskPattern</a>
- *Default:* TaskPattern.REQUEST_RESPONSE

How the task waits for the service.

---

##### `timeout`<sup>Optional</sup> <a name="timeout" id="cdk-sfn-flow.TaskStepProps.property.timeout"></a>

```typescript
public readonly timeout: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* defaults.timeout

Task timeout.

---

### WaitStepProps <a name="WaitStepProps" id="cdk-sfn-flow.WaitStepProps"></a>

Properties for `Step.wait`. Set exactly one of `seconds`, `secondsExpr` or `untilExpr`.

#### Initializer <a name="Initializer" id="cdk-sfn-flow.WaitStepProps.Initializer"></a>

```typescript
import { WaitStepProps } from 'cdk-sfn-flow'

const waitStepProps: WaitStepProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.WaitStepProps.property.assign">assign</a></code> | <code>{[ key: string ]: string}</code> | JSONata variables to assign, by name. |
| <code><a href="#cdk-sfn-flow.WaitStepProps.property.comment">comment</a></code> | <code>string</code> | A human-readable description of the step. |
| <code><a href="#cdk-sfn-flow.WaitStepProps.property.next">next</a></code> | <code>string</code> | Id of the step that runs next, or `"end"` to end the current step list. |
| <code><a href="#cdk-sfn-flow.WaitStepProps.property.output">output</a></code> | <code>string</code> | JSONata expression for the step output. |
| <code><a href="#cdk-sfn-flow.WaitStepProps.property.seconds">seconds</a></code> | <code>number</code> | Fixed number of seconds to wait. |
| <code><a href="#cdk-sfn-flow.WaitStepProps.property.secondsExpr">secondsExpr</a></code> | <code>string</code> | JSONata expression that evaluates to the number of seconds to wait. |
| <code><a href="#cdk-sfn-flow.WaitStepProps.property.untilExpr">untilExpr</a></code> | <code>string</code> | JSONata expression that evaluates to an ISO-8601 timestamp to wait until. |

---

##### `assign`<sup>Optional</sup> <a name="assign" id="cdk-sfn-flow.WaitStepProps.property.assign"></a>

```typescript
public readonly assign: {[ key: string ]: string};
```

- *Type:* {[ key: string ]: string}
- *Default:* no variables

JSONata variables to assign, by name.

---

##### `comment`<sup>Optional</sup> <a name="comment" id="cdk-sfn-flow.WaitStepProps.property.comment"></a>

```typescript
public readonly comment: string;
```

- *Type:* string
- *Default:* no comment

A human-readable description of the step.

---

##### `next`<sup>Optional</sup> <a name="next" id="cdk-sfn-flow.WaitStepProps.property.next"></a>

```typescript
public readonly next: string;
```

- *Type:* string
- *Default:* the following step in the list, or the end of the list for the last step

Id of the step that runs next, or `"end"` to end the current step list.

---

##### `output`<sup>Optional</sup> <a name="output" id="cdk-sfn-flow.WaitStepProps.property.output"></a>

```typescript
public readonly output: string;
```

- *Type:* string
- *Default:* the state's default output

JSONata expression for the step output.

---

##### `seconds`<sup>Optional</sup> <a name="seconds" id="cdk-sfn-flow.WaitStepProps.property.seconds"></a>

```typescript
public readonly seconds: number;
```

- *Type:* number
- *Default:* not set

Fixed number of seconds to wait.

---

##### `secondsExpr`<sup>Optional</sup> <a name="secondsExpr" id="cdk-sfn-flow.WaitStepProps.property.secondsExpr"></a>

```typescript
public readonly secondsExpr: string;
```

- *Type:* string
- *Default:* not set

JSONata expression that evaluates to the number of seconds to wait.

---

##### `untilExpr`<sup>Optional</sup> <a name="untilExpr" id="cdk-sfn-flow.WaitStepProps.property.untilExpr"></a>

```typescript
public readonly untilExpr: string;
```

- *Type:* string
- *Default:* not set

JSONata expression that evaluates to an ISO-8601 timestamp to wait until.

---

## Classes <a name="Classes" id="Classes"></a>

### Invoke <a name="Invoke" id="cdk-sfn-flow.Invoke"></a>

The service a `Step.task` calls.


#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#cdk-sfn-flow.Invoke.dynamoDelete">dynamoDelete</a></code> | DynamoDB DeleteItem. |
| <code><a href="#cdk-sfn-flow.Invoke.dynamoGet">dynamoGet</a></code> | DynamoDB GetItem. |
| <code><a href="#cdk-sfn-flow.Invoke.dynamoPut">dynamoPut</a></code> | DynamoDB PutItem. |
| <code><a href="#cdk-sfn-flow.Invoke.dynamoQuery">dynamoQuery</a></code> | DynamoDB Query (through the AWS SDK integration). |
| <code><a href="#cdk-sfn-flow.Invoke.dynamoUpdate">dynamoUpdate</a></code> | DynamoDB UpdateItem. |
| <code><a href="#cdk-sfn-flow.Invoke.ecsRunTask">ecsRunTask</a></code> | Runs an ECS task. |
| <code><a href="#cdk-sfn-flow.Invoke.eventBridge">eventBridge</a></code> | Puts an EventBridge event with a JSONata detail. |
| <code><a href="#cdk-sfn-flow.Invoke.http">http</a></code> | Calls an HTTPS endpoint through an EventBridge connection. |
| <code><a href="#cdk-sfn-flow.Invoke.lambda">lambda</a></code> | Invoke a Lambda function. |
| <code><a href="#cdk-sfn-flow.Invoke.sdk">sdk</a></code> | Calls any AWS API through the AWS SDK integration, granting exactly `service:Action`. |
| <code><a href="#cdk-sfn-flow.Invoke.sns">sns</a></code> | Publishes an SNS message with a JSONata body. |
| <code><a href="#cdk-sfn-flow.Invoke.sqs">sqs</a></code> | Sends an SQS message with a JSONata body. |

---

##### `dynamoDelete` <a name="dynamoDelete" id="cdk-sfn-flow.Invoke.dynamoDelete"></a>

```typescript
import { Invoke } from 'cdk-sfn-flow'

Invoke.dynamoDelete(table: ITable, paramsExpr: string)
```

DynamoDB DeleteItem.

`paramsExpr` is merged with `TableName`.

###### `table`<sup>Required</sup> <a name="table" id="cdk-sfn-flow.Invoke.dynamoDelete.parameter.table"></a>

- *Type:* aws-cdk-lib.aws_dynamodb.ITable

---

###### `paramsExpr`<sup>Required</sup> <a name="paramsExpr" id="cdk-sfn-flow.Invoke.dynamoDelete.parameter.paramsExpr"></a>

- *Type:* string

---

##### `dynamoGet` <a name="dynamoGet" id="cdk-sfn-flow.Invoke.dynamoGet"></a>

```typescript
import { Invoke } from 'cdk-sfn-flow'

Invoke.dynamoGet(table: ITable, paramsExpr: string)
```

DynamoDB GetItem.

`paramsExpr` is merged with `TableName`, e.g.
`{% { "Key": { "sku": { "S": $states.input.sku } } } %}`.

###### `table`<sup>Required</sup> <a name="table" id="cdk-sfn-flow.Invoke.dynamoGet.parameter.table"></a>

- *Type:* aws-cdk-lib.aws_dynamodb.ITable

---

###### `paramsExpr`<sup>Required</sup> <a name="paramsExpr" id="cdk-sfn-flow.Invoke.dynamoGet.parameter.paramsExpr"></a>

- *Type:* string

---

##### `dynamoPut` <a name="dynamoPut" id="cdk-sfn-flow.Invoke.dynamoPut"></a>

```typescript
import { Invoke } from 'cdk-sfn-flow'

Invoke.dynamoPut(table: ITable, paramsExpr: string)
```

DynamoDB PutItem.

`paramsExpr` is merged with `TableName`.

###### `table`<sup>Required</sup> <a name="table" id="cdk-sfn-flow.Invoke.dynamoPut.parameter.table"></a>

- *Type:* aws-cdk-lib.aws_dynamodb.ITable

---

###### `paramsExpr`<sup>Required</sup> <a name="paramsExpr" id="cdk-sfn-flow.Invoke.dynamoPut.parameter.paramsExpr"></a>

- *Type:* string

---

##### `dynamoQuery` <a name="dynamoQuery" id="cdk-sfn-flow.Invoke.dynamoQuery"></a>

```typescript
import { Invoke } from 'cdk-sfn-flow'

Invoke.dynamoQuery(table: ITable, paramsExpr: string)
```

DynamoDB Query (through the AWS SDK integration).

`paramsExpr` is merged with
`TableName`; Query is granted on the table and its indexes.

###### `table`<sup>Required</sup> <a name="table" id="cdk-sfn-flow.Invoke.dynamoQuery.parameter.table"></a>

- *Type:* aws-cdk-lib.aws_dynamodb.ITable

---

###### `paramsExpr`<sup>Required</sup> <a name="paramsExpr" id="cdk-sfn-flow.Invoke.dynamoQuery.parameter.paramsExpr"></a>

- *Type:* string

---

##### `dynamoUpdate` <a name="dynamoUpdate" id="cdk-sfn-flow.Invoke.dynamoUpdate"></a>

```typescript
import { Invoke } from 'cdk-sfn-flow'

Invoke.dynamoUpdate(table: ITable, paramsExpr: string)
```

DynamoDB UpdateItem.

`paramsExpr` is merged with `TableName`.

###### `table`<sup>Required</sup> <a name="table" id="cdk-sfn-flow.Invoke.dynamoUpdate.parameter.table"></a>

- *Type:* aws-cdk-lib.aws_dynamodb.ITable

---

###### `paramsExpr`<sup>Required</sup> <a name="paramsExpr" id="cdk-sfn-flow.Invoke.dynamoUpdate.parameter.paramsExpr"></a>

- *Type:* string

---

##### `ecsRunTask` <a name="ecsRunTask" id="cdk-sfn-flow.Invoke.ecsRunTask"></a>

```typescript
import { Invoke } from 'cdk-sfn-flow'

Invoke.ecsRunTask(props: EcsRunTaskInvokeProps)
```

Runs an ECS task.

Use `TaskPattern.SYNC` to wait for it to stop.

###### `props`<sup>Required</sup> <a name="props" id="cdk-sfn-flow.Invoke.ecsRunTask.parameter.props"></a>

- *Type:* <a href="#cdk-sfn-flow.EcsRunTaskInvokeProps">EcsRunTaskInvokeProps</a>

---

##### `eventBridge` <a name="eventBridge" id="cdk-sfn-flow.Invoke.eventBridge"></a>

```typescript
import { Invoke } from 'cdk-sfn-flow'

Invoke.eventBridge(props: EventBridgeInvokeProps)
```

Puts an EventBridge event with a JSONata detail.

###### `props`<sup>Required</sup> <a name="props" id="cdk-sfn-flow.Invoke.eventBridge.parameter.props"></a>

- *Type:* <a href="#cdk-sfn-flow.EventBridgeInvokeProps">EventBridgeInvokeProps</a>

---

##### `http` <a name="http" id="cdk-sfn-flow.Invoke.http"></a>

```typescript
import { Invoke } from 'cdk-sfn-flow'

Invoke.http(connection: IConnection, url: string, method: string, options?: HttpInvokeOptions)
```

Calls an HTTPS endpoint through an EventBridge connection.

###### `connection`<sup>Required</sup> <a name="connection" id="cdk-sfn-flow.Invoke.http.parameter.connection"></a>

- *Type:* aws-cdk-lib.aws_events.IConnection

the connection that holds the credentials.

---

###### `url`<sup>Required</sup> <a name="url" id="cdk-sfn-flow.Invoke.http.parameter.url"></a>

- *Type:* string

the https URL, or a JSONata expression.

---

###### `method`<sup>Required</sup> <a name="method" id="cdk-sfn-flow.Invoke.http.parameter.method"></a>

- *Type:* string

the HTTP method, or a JSONata expression.

---

###### `options`<sup>Optional</sup> <a name="options" id="cdk-sfn-flow.Invoke.http.parameter.options"></a>

- *Type:* <a href="#cdk-sfn-flow.HttpInvokeOptions">HttpInvokeOptions</a>

---

##### `lambda` <a name="lambda" id="cdk-sfn-flow.Invoke.lambda"></a>

```typescript
import { Invoke } from 'cdk-sfn-flow'

Invoke.lambda(fn: IFunction)
```

Invoke a Lambda function.

The task output is the function's return value.

###### `fn`<sup>Required</sup> <a name="fn" id="cdk-sfn-flow.Invoke.lambda.parameter.fn"></a>

- *Type:* aws-cdk-lib.aws_lambda.IFunction

---

##### `sdk` <a name="sdk" id="cdk-sfn-flow.Invoke.sdk"></a>

```typescript
import { Invoke } from 'cdk-sfn-flow'

Invoke.sdk(props: SdkInvokeProps)
```

Calls any AWS API through the AWS SDK integration, granting exactly `service:Action`.

###### `props`<sup>Required</sup> <a name="props" id="cdk-sfn-flow.Invoke.sdk.parameter.props"></a>

- *Type:* <a href="#cdk-sfn-flow.SdkInvokeProps">SdkInvokeProps</a>

---

##### `sns` <a name="sns" id="cdk-sfn-flow.Invoke.sns"></a>

```typescript
import { Invoke } from 'cdk-sfn-flow'

Invoke.sns(topic: ITopic, messageExpr: string, options?: SnsInvokeOptions)
```

Publishes an SNS message with a JSONata body.

###### `topic`<sup>Required</sup> <a name="topic" id="cdk-sfn-flow.Invoke.sns.parameter.topic"></a>

- *Type:* aws-cdk-lib.aws_sns.ITopic

---

###### `messageExpr`<sup>Required</sup> <a name="messageExpr" id="cdk-sfn-flow.Invoke.sns.parameter.messageExpr"></a>

- *Type:* string

---

###### `options`<sup>Optional</sup> <a name="options" id="cdk-sfn-flow.Invoke.sns.parameter.options"></a>

- *Type:* <a href="#cdk-sfn-flow.SnsInvokeOptions">SnsInvokeOptions</a>

---

##### `sqs` <a name="sqs" id="cdk-sfn-flow.Invoke.sqs"></a>

```typescript
import { Invoke } from 'cdk-sfn-flow'

Invoke.sqs(queue: IQueue, bodyExpr: string, options?: SqsInvokeOptions)
```

Sends an SQS message with a JSONata body.

###### `queue`<sup>Required</sup> <a name="queue" id="cdk-sfn-flow.Invoke.sqs.parameter.queue"></a>

- *Type:* aws-cdk-lib.aws_sqs.IQueue

---

###### `bodyExpr`<sup>Required</sup> <a name="bodyExpr" id="cdk-sfn-flow.Invoke.sqs.parameter.bodyExpr"></a>

- *Type:* string

---

###### `options`<sup>Optional</sup> <a name="options" id="cdk-sfn-flow.Invoke.sqs.parameter.options"></a>

- *Type:* <a href="#cdk-sfn-flow.SqsInvokeOptions">SqsInvokeOptions</a>

---



### Step <a name="Step" id="cdk-sfn-flow.Step"></a>

A step of a `FlowWorkflow`.

Create steps with the static factory methods.


#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#cdk-sfn-flow.Step.choice">choice</a></code> | Branches on JSONata conditions. |
| <code><a href="#cdk-sfn-flow.Step.fail">fail</a></code> | Ends the workflow (or branch) with an error. |
| <code><a href="#cdk-sfn-flow.Step.pass">pass</a></code> | Transforms data or assigns variables without calling a service. |
| <code><a href="#cdk-sfn-flow.Step.raw">raw</a></code> | Escape hatch: embeds hand-written CDK states. |
| <code><a href="#cdk-sfn-flow.Step.succeed">succeed</a></code> | Ends the current step list successfully. |
| <code><a href="#cdk-sfn-flow.Step.task">task</a></code> | Calls a service (Lambda, DynamoDB, SQS, ...). |
| <code><a href="#cdk-sfn-flow.Step.wait">wait</a></code> | Waits for a fixed time, a computed number of seconds, or until a timestamp. |

---

##### `choice` <a name="choice" id="cdk-sfn-flow.Step.choice"></a>

```typescript
import { Step } from 'cdk-sfn-flow'

Step.choice(id: string, props: ChoiceStepProps)
```

Branches on JSONata conditions.

Terminal: every path is given explicitly.

###### `id`<sup>Required</sup> <a name="id" id="cdk-sfn-flow.Step.choice.parameter.id"></a>

- *Type:* string

---

###### `props`<sup>Required</sup> <a name="props" id="cdk-sfn-flow.Step.choice.parameter.props"></a>

- *Type:* <a href="#cdk-sfn-flow.ChoiceStepProps">ChoiceStepProps</a>

---

##### `fail` <a name="fail" id="cdk-sfn-flow.Step.fail"></a>

```typescript
import { Step } from 'cdk-sfn-flow'

Step.fail(id: string, props: FailStepProps)
```

Ends the workflow (or branch) with an error.

###### `id`<sup>Required</sup> <a name="id" id="cdk-sfn-flow.Step.fail.parameter.id"></a>

- *Type:* string

---

###### `props`<sup>Required</sup> <a name="props" id="cdk-sfn-flow.Step.fail.parameter.props"></a>

- *Type:* <a href="#cdk-sfn-flow.FailStepProps">FailStepProps</a>

---

##### `pass` <a name="pass" id="cdk-sfn-flow.Step.pass"></a>

```typescript
import { Step } from 'cdk-sfn-flow'

Step.pass(id: string, props?: PassStepProps)
```

Transforms data or assigns variables without calling a service.

###### `id`<sup>Required</sup> <a name="id" id="cdk-sfn-flow.Step.pass.parameter.id"></a>

- *Type:* string

---

###### `props`<sup>Optional</sup> <a name="props" id="cdk-sfn-flow.Step.pass.parameter.props"></a>

- *Type:* <a href="#cdk-sfn-flow.PassStepProps">PassStepProps</a>

---

##### `raw` <a name="raw" id="cdk-sfn-flow.Step.raw"></a>

```typescript
import { Step } from 'cdk-sfn-flow'

Step.raw(id: string, chainable: IChainable, props?: RawStepProps)
```

Escape hatch: embeds hand-written CDK states.

The chain must use JSONata
(or set its own query language). It is referenced by `id`; its states keep their own names.

###### `id`<sup>Required</sup> <a name="id" id="cdk-sfn-flow.Step.raw.parameter.id"></a>

- *Type:* string

---

###### `chainable`<sup>Required</sup> <a name="chainable" id="cdk-sfn-flow.Step.raw.parameter.chainable"></a>

- *Type:* aws-cdk-lib.aws_stepfunctions.IChainable

---

###### `props`<sup>Optional</sup> <a name="props" id="cdk-sfn-flow.Step.raw.parameter.props"></a>

- *Type:* <a href="#cdk-sfn-flow.RawStepProps">RawStepProps</a>

---

##### `succeed` <a name="succeed" id="cdk-sfn-flow.Step.succeed"></a>

```typescript
import { Step } from 'cdk-sfn-flow'

Step.succeed(id: string, props?: SucceedStepProps)
```

Ends the current step list successfully.

###### `id`<sup>Required</sup> <a name="id" id="cdk-sfn-flow.Step.succeed.parameter.id"></a>

- *Type:* string

---

###### `props`<sup>Optional</sup> <a name="props" id="cdk-sfn-flow.Step.succeed.parameter.props"></a>

- *Type:* <a href="#cdk-sfn-flow.SucceedStepProps">SucceedStepProps</a>

---

##### `task` <a name="task" id="cdk-sfn-flow.Step.task"></a>

```typescript
import { Step } from 'cdk-sfn-flow'

Step.task(id: string, props: TaskStepProps)
```

Calls a service (Lambda, DynamoDB, SQS, ...).

###### `id`<sup>Required</sup> <a name="id" id="cdk-sfn-flow.Step.task.parameter.id"></a>

- *Type:* string

---

###### `props`<sup>Required</sup> <a name="props" id="cdk-sfn-flow.Step.task.parameter.props"></a>

- *Type:* <a href="#cdk-sfn-flow.TaskStepProps">TaskStepProps</a>

---

##### `wait` <a name="wait" id="cdk-sfn-flow.Step.wait"></a>

```typescript
import { Step } from 'cdk-sfn-flow'

Step.wait(id: string, props: WaitStepProps)
```

Waits for a fixed time, a computed number of seconds, or until a timestamp.

###### `id`<sup>Required</sup> <a name="id" id="cdk-sfn-flow.Step.wait.parameter.id"></a>

- *Type:* string

---

###### `props`<sup>Required</sup> <a name="props" id="cdk-sfn-flow.Step.wait.parameter.props"></a>

- *Type:* <a href="#cdk-sfn-flow.WaitStepProps">WaitStepProps</a>

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-sfn-flow.Step.property.id">id</a></code> | <code>string</code> | The step id. |
| <code><a href="#cdk-sfn-flow.Step.property.type">type</a></code> | <code><a href="#cdk-sfn-flow.StepType">StepType</a></code> | The kind of step. |

---

##### `id`<sup>Required</sup> <a name="id" id="cdk-sfn-flow.Step.property.id"></a>

```typescript
public readonly id: string;
```

- *Type:* string

The step id.

It is also the state name.

---

##### `type`<sup>Required</sup> <a name="type" id="cdk-sfn-flow.Step.property.type"></a>

```typescript
public readonly type: StepType;
```

- *Type:* <a href="#cdk-sfn-flow.StepType">StepType</a>

The kind of step.

---



## Enums <a name="Enums" id="Enums"></a>

### StepType <a name="StepType" id="cdk-sfn-flow.StepType"></a>

The kind of a step.

#### Members <a name="Members" id="Members"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#cdk-sfn-flow.StepType.TASK">TASK</a></code> | *No description.* |
| <code><a href="#cdk-sfn-flow.StepType.WAIT">WAIT</a></code> | *No description.* |
| <code><a href="#cdk-sfn-flow.StepType.CHOICE">CHOICE</a></code> | *No description.* |
| <code><a href="#cdk-sfn-flow.StepType.PARALLEL">PARALLEL</a></code> | *No description.* |
| <code><a href="#cdk-sfn-flow.StepType.MAP">MAP</a></code> | *No description.* |
| <code><a href="#cdk-sfn-flow.StepType.PASS">PASS</a></code> | *No description.* |
| <code><a href="#cdk-sfn-flow.StepType.SUCCEED">SUCCEED</a></code> | *No description.* |
| <code><a href="#cdk-sfn-flow.StepType.FAIL">FAIL</a></code> | *No description.* |
| <code><a href="#cdk-sfn-flow.StepType.SUBFLOW">SUBFLOW</a></code> | *No description.* |
| <code><a href="#cdk-sfn-flow.StepType.RAW">RAW</a></code> | *No description.* |

---

##### `TASK` <a name="TASK" id="cdk-sfn-flow.StepType.TASK"></a>

---


##### `WAIT` <a name="WAIT" id="cdk-sfn-flow.StepType.WAIT"></a>

---


##### `CHOICE` <a name="CHOICE" id="cdk-sfn-flow.StepType.CHOICE"></a>

---


##### `PARALLEL` <a name="PARALLEL" id="cdk-sfn-flow.StepType.PARALLEL"></a>

---


##### `MAP` <a name="MAP" id="cdk-sfn-flow.StepType.MAP"></a>

---


##### `PASS` <a name="PASS" id="cdk-sfn-flow.StepType.PASS"></a>

---


##### `SUCCEED` <a name="SUCCEED" id="cdk-sfn-flow.StepType.SUCCEED"></a>

---


##### `FAIL` <a name="FAIL" id="cdk-sfn-flow.StepType.FAIL"></a>

---


##### `SUBFLOW` <a name="SUBFLOW" id="cdk-sfn-flow.StepType.SUBFLOW"></a>

---


##### `RAW` <a name="RAW" id="cdk-sfn-flow.StepType.RAW"></a>

---


### TaskPattern <a name="TaskPattern" id="cdk-sfn-flow.TaskPattern"></a>

How a task waits for the called service.

#### Members <a name="Members" id="Members"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#cdk-sfn-flow.TaskPattern.REQUEST_RESPONSE">REQUEST_RESPONSE</a></code> | Call the service and continue as soon as it responds. |
| <code><a href="#cdk-sfn-flow.TaskPattern.SYNC">SYNC</a></code> | Wait for the job to complete (`.sync`). |
| <code><a href="#cdk-sfn-flow.TaskPattern.CALLBACK">CALLBACK</a></code> | Wait until a task token is returned (`.waitForTaskToken`). The token is injected into the payload as `taskToken`. |

---

##### `REQUEST_RESPONSE` <a name="REQUEST_RESPONSE" id="cdk-sfn-flow.TaskPattern.REQUEST_RESPONSE"></a>

Call the service and continue as soon as it responds.

---


##### `SYNC` <a name="SYNC" id="cdk-sfn-flow.TaskPattern.SYNC"></a>

Wait for the job to complete (`.sync`).

---


##### `CALLBACK` <a name="CALLBACK" id="cdk-sfn-flow.TaskPattern.CALLBACK"></a>

Wait until a task token is returned (`.waitForTaskToken`). The token is injected into the payload as `taskToken`.

---


### WorkflowType <a name="WorkflowType" id="cdk-sfn-flow.WorkflowType"></a>

The Step Functions workflow type.

#### Members <a name="Members" id="Members"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#cdk-sfn-flow.WorkflowType.STANDARD">STANDARD</a></code> | Long-running, exactly-once workflows (up to one year). |
| <code><a href="#cdk-sfn-flow.WorkflowType.EXPRESS">EXPRESS</a></code> | High-volume, short-lived workflows (up to five minutes). |

---

##### `STANDARD` <a name="STANDARD" id="cdk-sfn-flow.WorkflowType.STANDARD"></a>

Long-running, exactly-once workflows (up to one year).

---


##### `EXPRESS` <a name="EXPRESS" id="cdk-sfn-flow.WorkflowType.EXPRESS"></a>

High-volume, short-lived workflows (up to five minutes).

---

