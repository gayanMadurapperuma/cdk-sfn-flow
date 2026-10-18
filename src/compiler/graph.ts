import type { Step } from "../steps/step";
import { END } from "../types";

/** A step list with its path (e.g. `["Enrich", "pricing"]`). */
export interface Scope {
  readonly path: string[];
  readonly steps: Step[];
}

/** All step lists of the tree (workflow, branches, map iterators), depth first. */
export function allScopes(steps: Step[]): Scope[] {
  const scopes: Scope[] = [];
  const visit = (list: Step[], path: string[]) => {
    scopes.push({ path, steps: list });
    for (const step of list) {
      for (const child of step._builder.children()) {
        visit(
          child.steps,
          child.name ? [...path, step.id, child.name] : [...path, step.id],
        );
      }
    }
  };
  visit(steps, []);
  return scopes;
}

/** Every step in the tree. */
export function allSteps(steps: Step[]): Step[] {
  return allScopes(steps).flatMap((s) => s.steps);
}

/**
 * Data-flow predecessors within a scope: steps whose output becomes the input of each
 * step (implicit next, `next` and choice edges; catch edges carry error output and are skipped).
 */
export function dataPredecessors(steps: Step[]): Map<string, Step[]> {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const preds = new Map<string, Step[]>(steps.map((s) => [s.id, []]));
  steps.forEach((step, index) => {
    const builder = step._builder;
    const targets = builder
      .edges()
      .filter((e) => !e.field.startsWith("catchErrors"))
      .map((e) => e.target);
    if (
      !builder.terminal &&
      builder.next === undefined &&
      index + 1 < steps.length
    ) {
      targets.push(steps[index + 1].id);
    }
    for (const target of targets) {
      if (target !== END && byId.has(target)) {
        preds.get(target)!.push(step);
      }
    }
  });
  return preds;
}
