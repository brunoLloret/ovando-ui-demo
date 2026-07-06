/** The run-form controllers, split across the First Node and Telling rooms. */
export interface Controllers {
  seed: string;
  partner: string;
  scale: number;
  format: string;
  pov: string;
  words: number;
}

export const DEFAULT_CONTROLLERS: Controllers = {
  seed: "",
  partner: "",
  scale: 3,
  format: "linear",
  pov: "",
  words: 200,
};
