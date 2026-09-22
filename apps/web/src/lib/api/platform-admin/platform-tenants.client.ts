import {
  PlatformTenantListSchema,
  type PlatformTenantList,
} from "@ibn-hayan/contracts";

import {
  contractInvalidError,
  httpError,
  invalidJsonError,
  networkError,
  type ApiError,
} from "../api-error";

import { getApiBaseUrl, joinUrl } from "../api-url";

export type PlatformTenantsClientResult =
  | {
      readonly ok: true;
      readonly data: PlatformTenantList;
    }
  | {
      readonly ok: false;
      readonly error: ApiError;
    };

/**
 * Read-only platform tenant listing.
 *
 * The backend establishes identity and platform authority.
 * No user ID, tenant ID, or authorization grant
 * is accepted from browser input.
 *
 * Authenticated responses are never cached.
 */
export async function getPlatformAdminTenants(): Promise<PlatformTenantsClientResult> {
  let response: Response;

  try {
    response = await fetch(
      joinUrl(getApiBaseUrl(), "/platform-admin/tenants"),
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

  const parsed = PlatformTenantListSchema.safeParse(body);

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
