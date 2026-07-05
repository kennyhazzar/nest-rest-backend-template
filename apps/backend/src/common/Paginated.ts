import { ApiProperty } from '@nestjs/swagger';
import { Type } from '@nestjs/common';

export class PaginatedMetaDto {
  @ApiProperty({ description: 'Total number of matching records', example: 142 })
  total!: number;

  @ApiProperty({ description: 'Current page number (1-based)', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Number of items per page', example: 20 })
  per_page!: number;

  @ApiProperty({ description: 'Total number of pages', example: 8 })
  pages!: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    pages: number;
  };
}

export function buildPaginated<T>(data: T[], total: number, page = 1, perPage = 20): PaginatedResult<T> {
  return {
    data,
    meta: {
      total,
      page,
      per_page: perPage,
      pages: perPage > 0 ? Math.ceil(total / perPage) : 1,
    },
  };
}

export function toSqlPagination(page = 1, perPage = 20): { limit: number; offset: number } {
  return { limit: perPage, offset: (page - 1) * perPage };
}

export function Paginated<T>(classRef: Type<T>) {
  abstract class PaginatedType {
    @ApiProperty({ type: [classRef] })
    data!: T[];

    @ApiProperty({ type: PaginatedMetaDto })
    meta!: PaginatedMetaDto;
  }

  return PaginatedType;
}
