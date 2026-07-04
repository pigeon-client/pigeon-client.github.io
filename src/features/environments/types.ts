export interface Environment {
  id?: number;
  name: string;
  variables: Record<string, string>;
}
