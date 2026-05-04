import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

type Action = { label: string; onClick?: () => void; to?: string };

interface Props {
  icon?: ReactNode;
  title: string;
  message?: string;
  primaryAction?: Action;
  secondaryAction?: Action;
}

export function EmptyState({ icon, title, message, primaryAction, secondaryAction }: Props) {
  return (
    <div className="empty-state" role="status">
      {icon && <div className="empty-state-icon" aria-hidden="true">{icon}</div>}
      <h2 className="empty-state-title">{title}</h2>
      {message && <p className="empty-state-message">{message}</p>}
      {(primaryAction || secondaryAction) && (
        <div className="empty-state-actions">
          {primaryAction && renderAction(primaryAction, 'btn-primary')}
          {secondaryAction && renderAction(secondaryAction, 'btn-secondary')}
        </div>
      )}
    </div>
  );
}

function renderAction(a: Action, cls: string) {
  if (a.to) return <Link to={a.to} className={cls}>{a.label}</Link>;
  return <button onClick={a.onClick} className={cls}>{a.label}</button>;
}
