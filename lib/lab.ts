export type SliceAxis = "x" | "y" | "z";
export type Slice = { enabled: boolean; axis: SliceAxis; pos: number; flip: boolean };
export type Tool = "explore" | "scalpel" | "retractor" | "forceps" | "clamp" | "suture";

/** Body-space extents (metres): the model stands on the floor, ~1.72 m tall. */
export const SLICE_RANGE: Record<SliceAxis, [number, number]> = {
  x: [-0.36, 0.36],
  y: [0, 1.75],
  z: [-0.18, 0.18],
};
