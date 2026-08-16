/**
 * Injection token for the abstract `PaymentProvider`. Consumers (e.g.
 * `PaymentsService`) inject via `@Inject(PAYMENT_PROVIDER)` and type the
 * result as `PaymentProvider` — never `ArcaPaymentProvider` directly. The
 * concrete binding (`{ provide: PAYMENT_PROVIDER, useClass: ArcaPaymentProvider }`)
 * lives in PaymentsModule and is the only place that knows which gateway is
 * active.
 */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
