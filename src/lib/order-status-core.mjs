export const ORDER_TYPE = Object.freeze({ INQUIRY: "INQUIRY", FORMAL: "FORMAL" });

export const ORDER_STATUSES = Object.freeze([
  "PENDING_INQUIRY", "CONTACTED", "QUOTED", "CONFIRMED",
  "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED",
]);

export const ORDER_STATUS = Object.freeze(Object.fromEntries(ORDER_STATUSES.map((status) => [status, status])));

export const PAYMENT_STATUS = Object.freeze({
  NOT_REQUIRED: "NOT_REQUIRED",
  UNPAID: "UNPAID",
  PENDING: "PENDING",
  PAID: "PAID",
  REFUNDED: "REFUNDED",
});

export const FULFILLMENT_STATUS = Object.freeze({
  NOT_REQUIRED: "NOT_REQUIRED",
  UNFULFILLED: "UNFULFILLED",
  PROCESSING: "PROCESSING",
  SHIPPED: "SHIPPED",
  FULFILLED: "FULFILLED",
  CANCELLED: "CANCELLED",
});

export const ORDER_STATUSES_BY_TYPE = Object.freeze({
  [ORDER_TYPE.INQUIRY]: Object.freeze([
    ORDER_STATUS.PENDING_INQUIRY,
    ORDER_STATUS.CONTACTED,
    ORDER_STATUS.QUOTED,
    ORDER_STATUS.CANCELLED,
  ]),
  [ORDER_TYPE.FORMAL]: Object.freeze([
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.PROCESSING,
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.CANCELLED,
  ]),
});

const TRANSITIONS = Object.freeze({
  [ORDER_TYPE.INQUIRY]: Object.freeze({
    [ORDER_STATUS.PENDING_INQUIRY]: [ORDER_STATUS.CONTACTED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.CONTACTED]: [ORDER_STATUS.QUOTED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.QUOTED]: [ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.CANCELLED]: [],
  }),
  [ORDER_TYPE.FORMAL]: Object.freeze({
    [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.COMPLETED],
    [ORDER_STATUS.COMPLETED]: [],
    [ORDER_STATUS.CANCELLED]: [],
  }),
});

export function validateOrderTransition(orderType, currentStatus, nextStatus) {
  if (!ORDER_STATUSES_BY_TYPE[orderType]?.includes(currentStatus)) return { ok: false, error: "Invalid current order status" };
  if (currentStatus === nextStatus) return { ok: true };
  if (!TRANSITIONS[orderType]?.[currentStatus]?.includes(nextStatus)) return { ok: false, error: "Invalid order status transition" };
  return { ok: true };
}

export function normalizeLegacyOrderStatus(orderType, status) {
  if (status === "QUOTING") return ORDER_STATUS.CONTACTED;
  if (status === "CLOSED") return orderType === ORDER_TYPE.FORMAL ? ORDER_STATUS.COMPLETED : ORDER_STATUS.QUOTED;
  if (status === "PENDING_PAYMENT") return ORDER_STATUS.CONFIRMED;
  if (status === "PAID") return ORDER_STATUS.PROCESSING;
  if (status === "Pending" || status === "New inquiry") return ORDER_STATUS.PENDING_INQUIRY;
  return ORDER_STATUSES.includes(status) ? status : null;
}

export function fulfillmentForOrderStatus(status) {
  if (status === ORDER_STATUS.CONFIRMED) return FULFILLMENT_STATUS.UNFULFILLED;
  if (status === ORDER_STATUS.PROCESSING) return FULFILLMENT_STATUS.PROCESSING;
  if (status === ORDER_STATUS.SHIPPED) return FULFILLMENT_STATUS.SHIPPED;
  if (status === ORDER_STATUS.COMPLETED) return FULFILLMENT_STATUS.FULFILLED;
  if (status === ORDER_STATUS.CANCELLED) return FULFILLMENT_STATUS.CANCELLED;
  return FULFILLMENT_STATUS.NOT_REQUIRED;
}

