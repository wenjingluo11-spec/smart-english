export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-shimmer rounded-lg h-4 ${className}`} />;
}
