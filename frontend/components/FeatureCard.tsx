interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  disabled?: boolean;
}

export default function FeatureCard({
  icon,
  title,
  description,
  disabled,
}: FeatureCardProps) {
  return (
    <div className={`feature-card${disabled ? " feature-disabled" : ""}`}>
      <span className="feature-icon">{icon}</span>
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {disabled && <span className="coming-soon">即将推出</span>}
    </div>
  );
}
