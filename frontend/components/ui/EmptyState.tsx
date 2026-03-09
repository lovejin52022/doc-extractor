import Link from "next/link";

export default function EmptyState({
  icon = "📭",
  title,
  description,
  ctaHref,
  ctaText,
}: {
  icon?: string;
  title: string;
  description: string;
  ctaHref?: string;
  ctaText?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      {ctaHref && ctaText && (
        <div className="actions">
          <Link href={ctaHref} className="btn btn-primary btn-sm">{ctaText}</Link>
        </div>
      )}
    </div>
  );
}
