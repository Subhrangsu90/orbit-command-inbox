import { z } from "zod";

export const localSearchOperatorSchema = z.enum([
  "equals",
  "contains",
  "startsWith",
  "endsWith",
  "in",
  "gt",
  "gte",
  "lt",
  "lte",
  "before",
  "after",
  "between",
]);

export const localSearchFilterSchema = z.object({
  field: z.string().min(1),
  operator: localSearchOperatorSchema,
  value: z.union([
    z.string(),
    z.number(),
    z.array(z.string()),
    z.array(z.number()),
  ]),
});

export const localEntitySchema = z.object({
  id: z.string(),
  entityId: z.string(),
  data: z.record(z.string(), z.unknown()),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const localSearchOutputSchema = z.object({
  rows: z.array(localEntitySchema),
  source: z.literal("corsair-local-db"),
});

export function toLocalSearchValue(
  operator: string,
  value: string | number | string[] | number[],
) {
  if (operator === "equals") return value;
  if (operator === "before" || operator === "after") {
    return { [operator]: new Date(String(value)) };
  }
  if (operator === "between" && Array.isArray(value)) {
    return { between: value.map((item) => new Date(String(item))) };
  }
  return { [operator]: value };
}

export function serializeLocalEntity(row: {
  id: string;
  entity_id: string;
  data: unknown;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}) {
  return {
    id: row.id,
    entityId: row.entity_id,
    data: (row.data ?? {}) as Record<string, unknown>,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

export async function executeLocalSearch(
  entityClient: any,
  input: {
    filters: Array<{
      field: string;
      operator: string;
      value: string | number | string[] | number[];
    }>;
    limit: number;
    offset: number;
  }
) {
  const entityFilters: Record<string, unknown> = {};
  const dataFilters: Record<string, unknown> = {};

  for (const filter of input.filters) {
    const target = filter.field === "entity_id" ? entityFilters : dataFilters;
    const field = filter.field === "entity_id" ? "entity_id" : filter.field;
    target[field] = toLocalSearchValue(filter.operator, filter.value);
  }

  const rows = await entityClient.search({
    ...entityFilters,
    data: dataFilters,
    limit: input.limit,
    offset: input.offset,
  } as never);

  return {
    rows: (rows || []).map(serializeLocalEntity),
    source: "corsair-local-db" as const,
  };
}
