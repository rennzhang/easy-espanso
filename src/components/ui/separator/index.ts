import { type VariantProps, cva } from 'class-variance-authority';

export { default as Separator } from './Separator.vue';

export const separatorVariants = cva(
  'shrink-0 bg-border',
  {
    variants: {
      orientation: {
        horizontal: 'h-[1px] w-full',
        vertical: 'h-full w-[1px]'
      }
    },
    defaultVariants: {
      orientation: 'horizontal'
    }
  }
);

export type SeparatorVariants = VariantProps<typeof separatorVariants>; 