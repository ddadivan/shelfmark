/** The step caption of `ui-view-menu` ("4 / 6"): a ready text, or built from the step and the step count. */
export type ViewMenuStepText = string | ((step: number, steps: number) => string);
