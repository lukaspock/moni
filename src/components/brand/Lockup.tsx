import { Wordmark } from './Wordmark';

export type LockupProps = {
  width?: number;
  color?: string;
  decorative?: boolean;
};

/** Horizontal lockup: the wordmark with the colored (lime/ember) ø. */
export function Lockup({ width = 160, color, decorative }: LockupProps) {
  return (
    <Wordmark width={width} color={color} colorMark decorative={decorative} />
  );
}
