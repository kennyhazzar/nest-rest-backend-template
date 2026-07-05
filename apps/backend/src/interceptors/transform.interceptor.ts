import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

type PaginatedResponse = {
  data: unknown[];
  meta: Record<string, unknown>;
};

function isPaginatedResponse(value: unknown): value is PaginatedResponse {
  if (!value || typeof value !== 'object') return false;

  const response = value as Partial<PaginatedResponse>;

  return Array.isArray(response.data) && !!response.meta && typeof response.meta === 'object';
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((value) => {
        if (value === null || value === undefined) return { data: null };

        // Paginated responses already have the API envelope shape: { data: [...], meta: {...} }.
        if (isPaginatedResponse(value)) return value;

        return { data: value };
      }),
    );
  }
}
