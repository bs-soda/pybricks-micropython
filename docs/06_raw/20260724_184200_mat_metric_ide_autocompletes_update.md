# Mat-Metric IDE Autocomplete Update & Native C Alignment

**Date**: 2026-07-24T18:42:00+07:00  
**Target Codebase**: `mat-metric` & `pybricks-micropython`  
**File Target**: 
- [`mat-metric/src/utils/mdRobotBaseAutocompletes.ts`](file:///Users/batrarethsudprasert/projects/wro/mat-metric/src/utils/mdRobotBaseAutocompletes.ts)
- [`mat-metric/src/tests/autocompletes.test.ts`](file:///Users/batrarethsudprasert/projects/wro/mat-metric/src/tests/autocompletes.test.ts)

---

## 1. Executive Summary

We updated the IDE Monaco completion provider in the `mat-metric` workspace to align 100% with the new native C `pybricks-micropython` API bindings.

Newly added Monaco autocomplete items include:
1. `set_fusion_alpha(alpha: 1.0)`: Complementary sensor fusion weight (1.0 for 100% Pure Gyro Odometry).
2. `get_fusion_alpha()`: Returns current sensor fusion weight.
3. `set_gear_ratio(ratio: 0.3625)`: Drivetrain gear reduction ratio compensation.
4. `get_gear_ratio()`: Returns current drivetrain gear ratio.

---

## 2. Updated Autocomplete Metadata in `mat-metric`

```typescript
// mat-metric/src/utils/mdRobotBaseAutocompletes.ts
export const mdRobotBaseAutocompletes: AutocompleteItem[] = [
  ...
  {
    label: 'set_fusion_alpha',
    detail: 'db.set_fusion_alpha(alpha)',
    documentation: 'Sets the complementary sensor fusion alpha weight (0.0 to 1.0). Set to 1.0 for 100% Pure Gyro Odometry.',
    insertText: 'set_fusion_alpha(alpha=${1:1.0})'
  },
  {
    label: 'get_fusion_alpha',
    detail: 'db.get_fusion_alpha()',
    documentation: 'Returns the current complementary sensor fusion alpha weight.',
    insertText: 'get_fusion_alpha()'
  },
  {
    label: 'set_gear_ratio',
    detail: 'db.set_gear_ratio(ratio)',
    documentation: 'Sets the drivetrain gear reduction ratio (e.g. 0.3625 for 12t:36t reduction).',
    insertText: 'set_gear_ratio(ratio=${1:0.3625})'
  },
  {
    label: 'get_gear_ratio',
    detail: 'db.get_gear_ratio()',
    documentation: 'Returns the current drivetrain gear reduction ratio.',
    insertText: 'get_gear_ratio()'
  }
];
```

---

## 3. Verification

- **Vitest Suite (`mat-metric`)**: `npx vitest run src/tests/autocompletes.test.ts` (Passed 25/25).
- **Pytest Suite (`spike-prime-mdrobotkids`)**: `pytest` (Passed 19/19).
