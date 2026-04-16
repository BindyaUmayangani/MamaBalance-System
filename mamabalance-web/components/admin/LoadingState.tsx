type Props = {
  label: string;
  variant?: "loading" | "error";
};

export default function LoadingState({
  label,
  variant = "loading",
}: Props) {
  if (variant === "error") {
    return (
      <div className="table-card loading-card loading-card-error" role="alert">
        <div className="loading-copy">
          <p className="loading-eyebrow">We hit a snag</p>
          <h3>{label}</h3>
          <p>Please try again in a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-card loading-card" aria-busy="true" aria-live="polite">
      <div className="loading-card-hero">
        <div className="loading-copy">
          <p className="loading-eyebrow">Preparing your workspace</p>
          <h3>{label}</h3>
          <p>Fetching the latest records and building the table view.</p>
        </div>

        <div className="loading-pills" aria-hidden="true">
          <span className="loading-pill" />
          <span className="loading-pill loading-pill-wide" />
          <span className="loading-pill" />
        </div>
      </div>

      <div className="loading-table" aria-hidden="true">
        <div className="loading-table-head">
          <span className="loading-line short" />
          <span className="loading-line medium" />
          <span className="loading-line medium" />
          <span className="loading-line short" />
        </div>

        <div className="loading-table-row">
          <span className="loading-line short" />
          <span className="loading-line medium" />
          <span className="loading-line medium" />
          <span className="loading-line short" />
        </div>

        <div className="loading-table-row">
          <span className="loading-line medium" />
          <span className="loading-line long" />
          <span className="loading-line medium" />
          <span className="loading-line short" />
        </div>

        <div className="loading-table-row">
          <span className="loading-line short" />
          <span className="loading-line medium" />
          <span className="loading-line long" />
          <span className="loading-line short" />
        </div>
      </div>
    </div>
  );
}
