import type { ComponentPropsWithoutRef, ElementType } from 'react';
import { cn } from '../../utils/cn';

type TypeVariant = 'h1' | 'h2' | 'h3' | 'label' | 'meta' | 'body';

type TypeProps<T extends ElementType> = {
  as?: T;
  variant?: TypeVariant;
} & ComponentPropsWithoutRef<T>;

const variantStyles: Record<TypeVariant, string> = {
  h1: 'text-4xl uppercase tracking-[0.35em] font-grotesk',
  h2: 'text-2xl uppercase tracking-[0.25em] font-grotesk',
  h3: 'text-lg uppercase tracking-[0.2em] font-grotesk',
  label: 'text-xs uppercase tracking-[0.3em] font-monoish',
  meta: 'text-[10px] uppercase tracking-[0.3em] font-monoish',
  body: 'text-sm tracking-[0.02em] font-grotesk',
};

const Type = <T extends ElementType = 'p'>({
  as,
  variant = 'body',
  className,
  ...props
}: TypeProps<T>) => {
  const Component = as ?? 'p';
  return <Component className={cn(variantStyles[variant], className)} {...props} />;
};

export default Type;
