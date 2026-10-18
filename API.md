# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### FlowWorkflow <a name="FlowWorkflow" id="cdk-sfn-flow.FlowWorkflow"></a>

A Step Functions state machine generated from a behaviour-level config.

#### Initializers <a name="Initializers" id="cdk-sfn-flow.FlowWorkflow.Initializer"></a>

```typescript
import { FlowWorkflow } from 'cdk-sfn-flow'

new FlowWorkflow(scope: Construct, id: string, props?: FlowWorkflowProps)
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

##### `props`<sup>Optional</sup> <a name="props" id="cdk-sfn-flow.FlowWorkflow.Initializer.parameter.props"></a>

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


## Structs <a name="Structs" id="Structs"></a>

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
| <code><a href="#cdk-sfn-flow.FlowWorkflowProps.property.name">name</a></code> | <code>string</code> | The state machine name. |
| <code><a href="#cdk-sfn-flow.FlowWorkflowProps.property.workflowType">workflowType</a></code> | <code><a href="#cdk-sfn-flow.WorkflowType">WorkflowType</a></code> | The workflow type. |

---

##### `name`<sup>Optional</sup> <a name="name" id="cdk-sfn-flow.FlowWorkflowProps.property.name"></a>

```typescript
public readonly name: string;
```

- *Type:* string
- *Default:* a name is generated by CloudFormation

The state machine name.

---

##### `workflowType`<sup>Optional</sup> <a name="workflowType" id="cdk-sfn-flow.FlowWorkflowProps.property.workflowType"></a>

```typescript
public readonly workflowType: WorkflowType;
```

- *Type:* <a href="#cdk-sfn-flow.WorkflowType">WorkflowType</a>
- *Default:* WorkflowType.STANDARD

The workflow type.

---



## Enums <a name="Enums" id="Enums"></a>

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

