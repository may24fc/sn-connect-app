# ADR-001: Role Mapping Between DB and UI

## Status
Accepted

## Context
The database currently supports roles: admin, hr, cos, ceo, employee, associate.
The UI currently supports roles: super_admin, admin, employee, associate.
We need to align these to prevent authorization drift while keeping the UI role surface area small.

## Decision
Implement Option A by adding `super_admin` to the database role enum and keep the four UI roles.
Add a configurable role mapping layer in the web app to support Option B without rework.

Default mapping (Option A):
- admin, hr, cos, ceo -> admin
- super_admin -> super_admin
- employee -> employee
- associate -> associate

Alternate mapping (Option B, via `NEXT_PUBLIC_ROLE_MAPPING_MODE=option-b`):
- hr, ceo -> admin
- cos -> super_admin
- admin -> admin
- super_admin -> super_admin
- employee -> employee
- associate -> associate

## Consequences
- Database role enum is extended with `super_admin`.
- UI logic stays at four roles with a clear mapping layer.
- Switching to Option B is a configuration change, not a code change.
