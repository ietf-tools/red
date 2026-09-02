/**
 * One button of a `DensityToggle`: the value it selects, the accessible label announced for it and
 * shown on hover, and the Iconify-style name of the icon it draws (see `resolveGraphicsIcon`).
 */
export type DensityOption<T extends string> = {
  value: T
  label: string
  icon: string
}
