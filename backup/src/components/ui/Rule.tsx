import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

type RuleProps = HTMLAttributes<HTMLDivElement> & {
  orientation?: 'horizontal' | 'vertical';
  weight?: 'rule' | 'rule2';
};

const weightMap = {
  rule: '2px',
  rule2: '4px',
};

const Rule = ({
  className,
  orientation = 'horizontal',
  weight = 'rule',
  ...props
}: RuleProps) => (
  <div
    className={cn(
      'bg-ink',
      orientation === 'horizontal' ? 'w-full' : 'h-full',
      className,
    )}
    style={
      orientation === 'horizontal'
        ? { height: weightMap[weight] }
        : { width: weightMap[weight] }
    }
    {...props}
  />
);

export default Rule;
