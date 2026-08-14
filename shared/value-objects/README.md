# Value Objects (Shared Kernel)

Value objects used identically across more than one bounded context
belong here, not inside a single module. `Money` started in the
Accounts module and was promoted here once the Transfers module needed
the exact same semantics — a textbook Shared Kernel evolution: promote
only once a second bounded context proves the need, never speculatively.

- `money.vo.ts` — `bigint` minor-unit amounts + `Currency`; all
  arithmetic is currency-checked and exact (no floating point).

Module-specific value objects (e.g. Identity's `Email`, Accounts'
`AccountNumber`) remain inside their owning module's
`domain/value-objects/` — they only move here if a second bounded
context needs the identical type.
