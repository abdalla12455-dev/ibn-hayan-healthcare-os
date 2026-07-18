import { describe, expect, it, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPage from "./page";

/**
 * Minimal verification for the canonical landing page.
 *
 * These tests confirm that the page renders the project's bilingual
 * identity and the canonical-implementation label, that the document has
 * exactly one level-one heading, and that the English and Arabic
 * implementation-status sections use the correct text direction.
 *
 * The page includes the {@link ApiStatus} client component, which calls
 * `fetch` in a `useEffect` and updates state asynchronously. To avoid
 * React `act()` warnings (state updates outside `act()`), each test
 * mocks `fetch` with a never-resolving promise. The async state update
 * never fires, so React does not warn. The page content under test
 * (system name, canonical-implementation label, single H1, section
 * direction) does not depend on the ApiStatus state, so a pending fetch
 * is equivalent to a resolved fetch for these assertions.
 */

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

/**
 * Mocks `fetch` with a promise that never resolves. The ApiStatus
 * component's `useEffect` calls `fetch`, but the promise never settles,
 * so the async state update never fires. This avoids React `act()`
 * warnings without silencing console methods or weakening assertions.
 */
function mockFetchPending() {
  globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {})) as unknown as typeof fetch;
}

describe("LandingPage", () => {
  it("renders the English system name", () => {
    mockFetchPending();
    render(<LandingPage />);
    expect(
      screen.getByText("Ibn Hayan Healthcare Operating System"),
    ).toBeInTheDocument();
  });

  it("renders the Arabic system name", () => {
    mockFetchPending();
    render(<LandingPage />);
    expect(
      screen.getByText("نظام ابن حيان التشغيلي للرعاية الصحية"),
    ).toBeInTheDocument();
  });

  it("renders the canonical-implementation label in both languages", () => {
    mockFetchPending();
    render(<LandingPage />);
    expect(screen.getByText("Canonical implementation")).toBeInTheDocument();
    expect(screen.getByText("التنفيذ المرجعي")).toBeInTheDocument();
  });

  it("renders exactly one level-one heading", () => {
    mockFetchPending();
    render(<LandingPage />);
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
  });

  it("renders the English section with left-to-right direction", () => {
    mockFetchPending();
    render(<LandingPage />);
    const englishSection = screen
      .getByText("Canonical implementation")
      .closest("section");
    expect(englishSection).not.toBeNull();
    expect(englishSection?.getAttribute("dir")).toBe("ltr");
    expect(englishSection?.getAttribute("lang")).toBe("en");
  });

  it("renders the Arabic section with right-to-left direction", () => {
    mockFetchPending();
    render(<LandingPage />);
    const arabicSection = screen
      .getByText("التنفيذ المرجعي")
      .closest("section");
    expect(arabicSection).not.toBeNull();
    expect(arabicSection?.getAttribute("dir")).toBe("rtl");
    expect(arabicSection?.getAttribute("lang")).toBe("ar");
  });

  it("preserves exactly one level-one heading when ApiStatus is integrated", () => {
    mockFetchPending();
    render(<LandingPage />);
    // The ApiStatus component uses <h2> for its title, not <h1>.
    // The page must still have exactly one <h1>.
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
  });
});
