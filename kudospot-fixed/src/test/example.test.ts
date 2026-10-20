import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "qa@example.com" },
    signOut: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { AppShell } from "@/components/AppShell";

const renderWorkspace = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <AppShell>
        <div>Workspace content</div>
      </AppShell>
    </MemoryRouter>,
  );

describe("workspace navigation", () => {
  it("shows one Help & FAQ destination in the active desktop layout", () => {
    const { container } = renderWorkspace();
    const helpLinks = container.querySelectorAll('a[href="/help"]');

    // The full mobile drawer is only mounted when opened, so the desktop
    // icon rail is the only visible navigation system at this viewport.
    expect(helpLinks).toHaveLength(1);
  });

  it("keeps route navigation out of the top header", () => {
    const { container } = renderWorkspace();
    const header = container.querySelector("header");

    expect(header).not.toBeNull();
    expect(header?.querySelector('a[href="/help"]')).toBeNull();
    expect(header?.querySelector('a[href="/testimonials"]')).toBeNull();
    expect(header?.querySelector('a[href="/collect"]')).toBeNull();
  });

  it("renders the workspace content inside the shared app frame", () => {
    const { getByText } = renderWorkspace();
    expect(getByText("Workspace content")).toBeTruthy();
  });
});
