/**
 * Generic use-case (application service) contract following Clean
 * Architecture. Each use case represents a single application-level
 * intent (Command or Query in the CQRS sense).
 */
export interface IUseCase<TRequest, TResponse> {
  execute(request: TRequest): Promise<TResponse>;
}
