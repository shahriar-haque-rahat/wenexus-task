interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div className={`spinner-container ${className}`}>
      <div className={`spinner spinner--${size}`} />
    </div>
  );
}
