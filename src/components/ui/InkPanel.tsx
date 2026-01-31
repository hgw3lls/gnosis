import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { panelBase } from '../../styles/ui';

type InkPanelProps = HTMLAttributes<HTMLDivElement> & {
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

const paddingMap: Record<NonNullable<InkPanelProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const InkPanel = ({ className, padding = 'md', ...props }: InkPanelProps) => (
  <div className={cn(panelBase, paddingMap[padding], className)} {...props} />
);

export default InkPanel;
