"use client";

import type { Dispatch, SetStateAction } from "react";

type Column = {
  key: string;
  label: string;
};

type Props = {
  columns: readonly Column[];
  visibleColumns: Record<string, boolean>;
  setVisibleColumns: Dispatch<SetStateAction<Record<string, boolean>>>;
  onClose: () => void;
};

export default function FilterModal({
  columns,
  visibleColumns,
  setVisibleColumns,
  onClose,
}: Props) {
  return (
    <>
      <h2 className="modal-title">Select Columns</h2>

      <div className="checkbox-group">
        {columns.map((col) => (
          <label key={col.key}>
            <input
              type="checkbox"
              checked={visibleColumns[col.key]}
              onChange={() =>
                setVisibleColumns((prev) => ({
                  ...prev,
                  [col.key]: !prev[col.key],
                }))
              }
            />
            {col.label}
          </label>
        ))}
      </div>

      <div className="modal-actions">
        <button className="btn-outline" onClick={onClose}>
          Cancel
        </button>
        <button className="btn-primary" onClick={onClose}>
          Apply
        </button>
      </div>
    </>
  );
}
