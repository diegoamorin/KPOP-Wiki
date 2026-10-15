export type Value =
  string | number | boolean | null | Value[] | { [key: string]: Value };
export type Linkage = { type: string; id: string };
export type Resource = Linkage & {
  attributes: Record<string, Value>;
  relationships?: Record<string, { data: Linkage | Linkage[] | null }>;
  links?: Record<string, string>;
};
export type Document = {
  data: Resource | Resource[];
  included?: Resource[];
  meta?: { total: number; page: number; limit: number; pages: number };
  errors?: {
    status?: string;
    detail?: string;
    title?: string;
    source?: { pointer?: string };
  }[];
};
export type User = import("./generated").components["schemas"]["UserDto"];
export type TokenPair =
  import("./generated").components["schemas"]["TokenPairDto"];
export type Snapshot = {
  kind: string;
  fields: Record<string, Value>;
  components: Record<string, Record<string, Value>>;
};
export type Schema = {
  type?: string;
  $ref?: string;
  title?: string;
  description?: string;
  nullable?: boolean;
  format?: string;
  enum?: (string | number | boolean)[];
  required?: string[];
  properties?: Record<string, Schema>;
  items?: Schema;
  additionalProperties?: boolean | Schema;
  oneOf?: Schema[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
};
export type Operation = {
  id: string;
  method: string;
  path: string;
  summary: string;
  protected: boolean;
  body?: Schema;
  contentType?: string;
  parameters: {
    name: string;
    in: string;
    required?: boolean;
    schema: Schema;
  }[];
  group: string;
};
