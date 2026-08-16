export function Card({ className = "", ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[--radius-card] border border-ink-100 bg-white shadow-sm ${className}`}
      {...rest}
    />
  );
}

export function CardHeader({ className = "", ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`border-b border-ink-100 px-5 py-4 ${className}`} {...rest} />;
}

export function CardBody({ className = "", ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-5 py-4 ${className}`} {...rest} />;
}
