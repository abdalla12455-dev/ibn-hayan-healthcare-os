import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPage from "./page";

/**
 * Minimal verification for the canonical landing page.
 *
 * These tests confirm that the page renders the project's bilingual
 * identity and the canonical-implementation label, that the document has
 * exactly one level-one heading, and that the English and Arabic
 * implementation-status sections use the correct text direction.
 */
describe("LandingPage", () => {
  it("renders the English system name", () => {
    render(<LandingPage />);
    expect(
      screen.getByText("Ibn Hayan Healthcare Operating System"),
    ).toBeInTheDocument();
  });

  it("renders the Arabic system name", () => {
    render(<LandingPage />);
    expect(
      screen.getByText("نظام ابن حيان التشغيلي للرعاية الصحية"),
    ).toBeInTheDocument();
  });

  it("renders the canonical-implementation label in both languages", () => {
    render(<LandingPage />);
    expect(screen.getByText("Canonical implementation")).toBeInTheDocument();
    expect(screen.getByText("التنفيذ المرجعي")).toBeInTheDocument();
  });

  it("renders exactly one level-one heading", () => {
    render(<LandingPage />);
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
  });

  it("renders the English section with left-to-right direction", () => {
    render(<LandingPage />);
    const englishSection = screen
      .getByText("Canonical implementation")
      .closest("section");
    expect(englishSection).not.toBeNull();
    expect(englishSection?.getAttribute("dir")).toBe("ltr");
    expect(englishSection?.getAttribute("lang")).toBe("en");
  });

  it("renders the Arabic section with right-to-left direction", () => {
    render(<LandingPage />);
    const arabicSection = screen
      .getByText("التنفيذ المرجعي")
      .closest("section");
    expect(arabicSection).not.toBeNull();
    expect(arabicSection?.getAttribute("dir")).toBe("rtl");
    expect(arabicSection?.getAttribute("lang")).toBe("ar");
  });
});
