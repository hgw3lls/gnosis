import { useEffect, useMemo, useState } from 'react';

type VirtualRange = {
  startIndex: number;
  endIndex: number;
  spacerLeft: number;
  spacerRight: number;
};

type VirtualSpinesOptions = {
  itemCount: number;
  itemWidth: number;
  gap: number;
  buffer?: number;
  scrollLeft: number;
  containerWidth: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const useVirtualSpines = ({
  itemCount,
  itemWidth,
  gap,
  buffer = 4,
  scrollLeft,
  containerWidth,
}: VirtualSpinesOptions) => {
  const [range, setRange] = useState<VirtualRange>({
    startIndex: 0,
    endIndex: Math.max(0, itemCount - 1),
    spacerLeft: 0,
    spacerRight: 0,
  });

  const totalItemWidth = itemWidth + gap;

  useEffect(() => {
    if (itemCount === 0 || containerWidth === 0) {
      setRange({ startIndex: 0, endIndex: -1, spacerLeft: 0, spacerRight: 0 });
      return;
    }
    const start = clamp(Math.floor(scrollLeft / totalItemWidth) - buffer, 0, itemCount - 1);
    const visibleCount = Math.ceil(containerWidth / totalItemWidth) + buffer * 2;
    const end = clamp(start + visibleCount, 0, itemCount - 1);
    const spacerLeft = start * totalItemWidth;
    const spacerRight = Math.max(0, (itemCount - end - 1) * totalItemWidth);
    setRange({ startIndex: start, endIndex: end, spacerLeft, spacerRight });
  }, [itemCount, containerWidth, scrollLeft, totalItemWidth, buffer]);

  return useMemo(() => range, [range]);
};
