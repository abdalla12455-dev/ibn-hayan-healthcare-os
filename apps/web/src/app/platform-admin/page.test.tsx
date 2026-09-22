import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import PlatformAdminPage from "./page";

import { LanguageProvider } from "@/components/i18n/language-context";

const mockReplace = vi.fn();
const mockRouter = { replace: mockReplace };
const mockOverview = vi.fn();
const mockTenants = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

vi.mock("@/lib/api/platform-admin/platform-admin.client", () => ({
  getPlatformAdminOverview: (...args: unknown[]) => mockOverview(...args),
}));

vi.mock("@/lib/api/platform-admin/platform-tenants.client", () => ({
  getPlatformAdminTenants: (...args: unknown[]) => mockTenants(...args),
}));

vi.mock("@/lib/api/auth/auth.client", () => ({
  getCsrfToken: vi.fn(),
  logout: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();

  mockTenants.mockResolvedValue({
    ok: true,
    data: {
      items: [],
      hasMore: false,
    },
  });

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
  it("loads real customers only after platform authorization", async () => {
    let resolveOverview: ((value: unknown) => void) | undefined;

    mockOverview.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveOverview = resolve;
        }),
    );

    renderPage();

    expect(mockTenants).not.toHaveBeenCalled();

    resolveOverview?.({
      ok: true,
      data: {
        administrator: {
          displayName: "Platform Operator",
        },
      },
    });

    await waitFor(() => {
      expect(mockTenants).toHaveBeenCalledTimes(1);
    });
  });

  it("shows actual customer data and status", async () => {
    mockTenants.mockResolvedValue({
      ok: true,
      data: {
        items: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            slug: "customer-one",
            displayName: "Customer One",
            status: "suspended",
            createdAt: "2026-01-01T10:00:00.000Z",
          },
        ],
        hasMore: false,
      },
    });

    renderPage();

    expect(screen.queryByText("Customer One")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Customer One")).toBeInTheDocument();
    });

    expect(screen.getByText("customer-one")).toBeInTheDocument();

    expect(screen.getByText("معلّقة")).toBeInTheDocument();
  });

  it("does not load customers when platform overview is forbidden", async () => {
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

    expect(mockTenants).not.toHaveBeenCalled();
  });

  it("hides administrator data when customer access is revoked", async () => {
    mockTenants.mockResolvedValue({
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

  it("does not confuse customer API failures with an empty list", async () => {
    mockTenants.mockResolvedValue({
      ok: false,
      error: {
        category: "NETWORK_ERROR",
        message: "Connection unavailable",
      },
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText("تعذّر تحميل بيانات الجهات المشتركة."),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByText("لا توجد جهات مشتركة مسجلة حالياً."),
    ).not.toBeInTheDocument();
  });

  it("retries a failed customer request", async () => {
    mockTenants
      .mockResolvedValueOnce({
        ok: false,
        error: {
          category: "NETWORK_ERROR",
          message: "Connection unavailable",
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          items: [],
          hasMore: false,
        },
      });

    renderPage();

    const retry = await screen.findByRole("button", { name: "إعادة المحاولة" });

    await userEvent.setup().click(retry);

    await waitFor(() => {
      expect(mockTenants).toHaveBeenCalledTimes(2);
    });

    expect(
      await screen.findByText("لا توجد جهات مشتركة مسجلة حالياً."),
    ).toBeInTheDocument();
  });

  it("redirects to login when the customer session expires", async () => {
    mockTenants.mockResolvedValue({
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
