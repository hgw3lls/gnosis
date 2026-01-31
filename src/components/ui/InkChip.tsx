import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

type InkChipProps = HTMLAttributes<HTMLSpanElement> & {
  plate?: string;
};

const InkChip = ({ className, plate, style, ...props }: InkChipProps) => (
  <span
    className={cn(
      'inline-flex items-center gap-2 border-rule2 border-ink px-2 py-1 text-[10px] uppercase tracking-[0.3em]',
      'bg-paper text-ink',
      className,
    )}
    style={
      plate
        ? {
            borderColor: plate,
            boxShadow: `0 0 0 1px ${plate} inset`,
            ...style,
          }
        : style
    }
    {...props}
  />
);

export default InkChip;
