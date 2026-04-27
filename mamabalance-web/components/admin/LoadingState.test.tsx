import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LoadingState from "./LoadingState";

describe("LoadingState", () => {
  it("announces loading progress for staff workspaces", () => {
    render(<LoadingState label="Loading assigned mothers..." />);

    expect(screen.getByText("Preparing your workspace")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Loading assigned mothers..." })).toBeInTheDocument();
    expect(screen.getByText("Fetching the latest records and building the table view.")).toBeInTheDocument();
    expect(screen.getByText("Preparing your workspace").closest("[aria-busy='true']")).toBeInTheDocument();
  });

  it("uses alert semantics for errors", () => {
    render(<LoadingState label="Unable to load workspace data." variant="error" />);

    expect(screen.getByRole("alert")).toHaveTextContent("We hit a snag");
    expect(screen.getByRole("heading", { name: "Unable to load workspace data." })).toBeInTheDocument();
    expect(screen.getByText("Please try again in a moment.")).toBeInTheDocument();
  });
});
