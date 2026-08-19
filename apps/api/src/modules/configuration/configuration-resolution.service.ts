import { Injectable, Inject } from '@nestjs/common';
import {
  ConfigurationResolutionError,
  type ConfigurationResolution,
  type ConfigurationResolutionPort,
  type ConfigurationResolutionScope,
  type ConfigurationValue,
  type ConfigurationValueRepository,
} from '@ibn-hayan/domain';
import { CONFIGURATION_REPOSITORY } from '../../infrastructure/database/index.js';
import {
  getConfigurationKeyDefinition,
  highestPrecedenceLayer,
  validateConfigurationValue,
  type ConfigurationLayer,
} from '@ibn-hayan/configuration';

/**
 * Canonical Configuration resolution service (BC16). Implements the
 * {@link ConfigurationResolutionPort} declared in
 * `@ibn-hayan/domain`. Consuming modules (e.g. Scheduling) call
 * `resolve(key, trustedScope)` and receive the resolved value plus
 * provenance metadata; they never order candidate rows themselves
 * (per CONFIGURATION_ARCHITECTURE.md §2.2).
 *
 * Determinism: candidates are read scoped to the caller's trusted
 * tenant/organisation/facility; the winner layer is selected via the
 * canonical precedence index (L4 > L3 > L1). Multiple rows at the
 * same layer cannot coexist (database unique constraint), so the
 * layer→row map is unambiguous; any accidental duplication is a
 * deterministic conflict resolved by precedence ordering rather than
 * by row order.
 *
 * Fail-closed semantics: unknown keys, missing candidates, and
 * invalid persisted values throw `ConfigurationResolutionError`. A
 * persisted value that violates the registered Zod schema NEVER
 * silently falls back to the L1 default or any other value. The
 * resolution path deliberately carries no request context and never
 * emits an audit event (administrative GET reads are audited at the
 * API boundary by the administration service).
 */
@Injectable()
export class ConfigurationResolutionService implements ConfigurationResolutionPort {
  constructor(
    @Inject(CONFIGURATION_REPOSITORY)
    private readonly configurationRepository: ConfigurationValueRepository,
  ) {}

  async resolve(
    key: string,
    scope: ConfigurationResolutionScope,
  ): Promise<ConfigurationResolution> {
    const definition = getConfigurationKeyDefinition(key);
    if (definition === null) {
      throw new ConfigurationResolutionError(
        'unknown_key',
        `Configuration key "${key}" is not registered.`,
      );
    }

    const candidates = await this.configurationRepository.findByKeyAndScope(
      key,
      scope,
    );
    if (candidates.length === 0) {
      throw new ConfigurationResolutionError(
        'unresolvable',
        `No persisted values exist for registered Configuration key "${key}".`,
      );
    }

    // Build a layer→row map; duplicate rows at the same layer cannot
    // coexist per the database composite unique constraint.
    const byLayer = new Map<ConfigurationLayer, ConfigurationValue>();
    for (const candidate of candidates) {
      byLayer.set(candidate.layer, candidate);
    }
    const winnerLayer = highestPrecedenceLayer([
      ...byLayer.keys(),
    ] as ConfigurationLayer[]);
    if (winnerLayer === undefined) {
      throw new ConfigurationResolutionError(
        'unresolvable',
        `Configuration key "${key}" has no resolvable candidate layers.`,
      );
    }
    const winner = byLayer.get(winnerLayer);
    if (winner === undefined) {
      throw new ConfigurationResolutionError(
        'unresolvable',
        `Configuration key "${key}" resolved an ambiguous winner layer.`,
      );
    }

    const validated = validateConfigurationValue(definition, winner.value);
    if (!validated.success) {
      throw new ConfigurationResolutionError(
        'invalid_value',
        `Persisted value for Configuration key "${key}" failed the registered validation schema: ${validated.issues.join('; ')}`,
      );
    }

    return {
      key,
      value: validated.data,
      sourceLayer: winner.layer,
      valueVersion: winner.valueVersion,
      updatedAt: winner.updatedAt,
    };
  }
}
