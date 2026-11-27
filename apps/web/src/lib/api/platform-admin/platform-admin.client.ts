import {
  PlatformAdminOverviewResponseSchema,
  type PlatformAdminOverviewResponse,
} from "@ibn-hayan/contracts";

import {
  contractInvalidError,
  httpError,
  invalidJsonError,
  networkError,
  type ApiError,
} from "../api-error";

import { getApiBaseUrl, joinUrl } from "../api-url";

export type PlatformAdminClientResult =
  | {
      readonly ok: true;
      readonly data: PlatformAdminOverviewResponse;
    }
  | {
      readonly ok: false;
      readonly error: ApiError;
    };

/**
 * Fetch the protected Platform Super Admin Overview.
 *
 * The server is the authoritative authorization boundary.
 * No tenant role or browser-provided identity is trusted.
 *
 * The client does not cache authenticated responses.
 */
export async function getPlatformAdminOverview(): Promise<PlatformAdminClientResult> {
  let response: Response;

  try {
    response = await fetch(
      joinUrl(getApiBaseUrl(), "/platform-admin/overview"),
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      },
    );
  } catch (error) {
    return {
      ok: false,
      error: networkError(error),
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: httpError(response.status),
    };
  }

  let body: unknown;

  try {
    body = await response.json();
  } catch (error) {
    return {
      ok: false,
      error: invalidJsonError(error),
    };
  }

  const parsed = PlatformAdminOverviewResponseSchema.safeParse(body);

  if (!parsed.success) {
    return {
      ok: false,
      error: contractInvalidError(parsed.error),
    };
  }

  return {
    ok: true,
    data: parsed.data,
  };
}
