import type { Result } from './result';

/**
 * A UseCase encapsulates a single business operation. It takes an input DTO,
 * runs validation + side-effects, and returns a Result.
 *
 * Keep use-cases thin — they orchestrate repositories and services but own
 * no persistence logic themselves. This makes them trivial to unit-test
 * with in-memory fakes.
 */
export interface UseCase<Input, Output> {
  execute(input: Input): Promise<Result<Output>>;
}
