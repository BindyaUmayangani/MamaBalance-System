import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import ModalBase from "./ModalBase";

describe("ModalBase", () => {
  afterEach(() => {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  });

  it("renders accessible modal content and locks page scrolling while mounted", () => {
    const { unmount } = render(
      <ModalBase onClose={vi.fn()}>
        <h2>Mother profile</h2>
      </ModalBase>,
    );

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: "Mother profile" })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.style.overflow).toBe("hidden");

    unmount();

    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("calls onClose from the optional close icon", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <ModalBase onClose={onClose} showCloseIcon>
        <p>Settings</p>
      </ModalBase>,
    );

    await user.click(screen.getByRole("button"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
