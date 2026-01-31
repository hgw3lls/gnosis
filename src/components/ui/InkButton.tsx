import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { focusRing, printInteractive } from '../../styles/ui';

type InkButtonVariant = 'primary' | 'ghost' | 'danger';

type InkButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: InkButtonVariant;
};

const variantStyles: Record<InkButtonVariant, string> = {
  primary: 'border-ink bg-ink text-paper hover:bg-ink/90',
  ghost: 'border-ink bg-paper text-ink hover:bg-ink hover:text-paper',
  danger: 'border-ink-crimson bg-ink-crimson text-paper hover:bg-ink-crimson/90',
};

const InkButton = ({
  className,
  type = 'button',
  variant = 'ghost',
  ...props
}: InkButtonProps) => (
  <button
    type={type}
    className={cn(
      'inline-flex items-center justify-center gap-2 border-rule2 px-3 py-2 text-[11px] uppercase tracking-[0.3em] shadow-print-md',
      'disabled:cursor-not-allowed disabled:opacity-60',
      focusRing,
      printInteractive,
      variantStyles[variant],
      className,
    )}
    {...props}
  />
);

export default InkButton;
