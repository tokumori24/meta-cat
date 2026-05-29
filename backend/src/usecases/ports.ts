export type RuntimeStatusSource = {
  now(): Date;
  uptimeSeconds(): number;
};
