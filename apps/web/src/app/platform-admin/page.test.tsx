import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import PlatformAdminPage from "./page";

import { LanguageProvider } from "@/components/i18n/language-context";

const mockReplace = vi.fn();
const mockOverview = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

vi.mock("@/lib/api/platform-admin/platform-admin.client", () => ({
  getPlatformAdminOverview: (...args: unknown[]) => mockOverview(...args),
}));

vi.mock("@/lib/api/auth/auth.client", () => ({
  getCsrfToken: vi.fn(),
  logout: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();

  mockOverview.mockResolvedValue({
    ok: true,
    data: {
      administrator: {
        displayName: "Platform Operator",
      },
    },
  });
});

function renderPage() {
  return render(
    <LanguageProvider>
      <PlatformAdminPage />
    </LanguageProvider>,
  );
}

describe("Platform administration page", () => {
  it("shows authenticated administrator information", async () => {
    renderPage();

    expect(screen.queryByText("Platform Operator")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText(/Platform Operator/).length).toBeGreaterThan(
        0,
      );
    });

    expect(
      screen.getByRole("heading", {
        name: "نظرة عامة",
      }),
    ).toBeInTheDocument();

    expect(mockOverview).toHaveBeenCalled();
  });

  it("does not expose administrator data on HTTP 403", async () => {
    mockOverview.mockResolvedValue({
      ok: false,
      error: {
        category: "HTTP_ERROR",
        statusCode: 403,
        message: "Forbidden",
      },
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText("ليس لديك تصريح للوصول إلى إدارة المنصة."),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/Platform Operator/)).not.toBeInTheDocument();

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("redirects an expired session to login", async () => {
    mockOverview.mockResolvedValue({
      ok: false,
      error: {
        category: "HTTP_ERROR",
        statusCode: 401,
        message: "Unauthorized",
      },
    });

    renderPage();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });

    expect(screen.queryByText(/Platform Operator/)).not.toBeInTheDocument();
  });

  it("supports English and LTR direction", async () => {
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText(/Platform Operator/).length).toBeGreaterThan(
        0,
      );
    });

    await user.click(
      screen.getByRole("button", {
        name: "Switch to English",
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Platform Overview",
      }),
    ).toBeInTheDocument();

    expect(
      screen
        .getByRole("heading", {
          name: "Platform Overview",
        })
        .closest('[dir="ltr"]'),
    ).not.toBeNull();
  });
});
