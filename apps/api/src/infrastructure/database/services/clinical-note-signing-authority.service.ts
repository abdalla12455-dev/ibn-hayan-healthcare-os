import { Injectable } from '@nestjs/common';
import type {
  ClinicalNoteSigningAuthorityPort,
  ClinicalNoteType,
  TenantId,
  FacilityId,
  ProviderId,
} from '@ibn-hayan/domain';

/**
 * Configuration-backed implementation of
 * {@link ClinicalNoteSigningAuthorityPort} (BC03).
 *
 * Per BR-BC03-CLIN-031: "Signer must have signing authority for note type
 * (authority matrix configurable per facility). If authority cannot be
 * verified, block signing."
 *
 * The per-facility authority matrix is NOT documented canonically. This
 * implementation provides the universal non-inventing baseline — the
 * signing actor must be the note's author (`actorId === authorId`) —
 * which is the universally-true minimum that does not require any
 * authority matrix. No medical/legal policy is invented; the configurable
 * per-facility authority matrix is deferred to a future stage behind this
 * same port interface, so a future configuration-backed implementation can
 * consult a per-facility authority matrix without changing call sites.
 *
 * The port accepts `tenantId` and `facilityId` (for future per-tenant and
 * per-facility configuration); the baseline implementation ignores them
 * and compares the provider identifiers only.
 */
@Injectable()
export class ClinicalNoteSigningAuthorityService implements ClinicalNoteSigningAuthorityPort {
  canSign(
    _tenantId: TenantId,
    _facilityId: FacilityId,
    _noteType: ClinicalNoteType,
    authorId: ProviderId,
    actorId: ProviderId,
  ): boolean {
    return authorId === actorId;
  }
}
