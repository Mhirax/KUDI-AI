import './PendingFeature.scss';

// Rendered wherever a feature's backend module does not exist yet.
// Deliberately plain and unambiguous — this is not an error state and not a
// loading state. The feature is simply not built, and the UI says so rather
// than showing fabricated data.

export default function PendingFeature({ title, module, note }) {
  return (
    <div className="pending-feature">
      <div className="pending-feature__icon" aria-hidden="true">🚧</div>
      <h3 className="pending-feature__title">{title} isn’t available yet</h3>
      <p className="pending-feature__body">
        The <code>{module}</code> backend module hasn’t been built. This screen
        is wired and ready — it will work as soon as the module ships.
      </p>
      {note && <p className="pending-feature__note">{note}</p>}
      <p className="pending-feature__ref">
        Tracked in <code>docs/API-CONTRACT.md</code>
      </p>
    </div>
  );
}
