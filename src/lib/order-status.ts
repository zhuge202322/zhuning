import * as core from "@/lib/order-status-core.mjs";

export type OrderType = "INQUIRY" | "FORMAL";
export type OrderStatus =
  | "PENDING_INQUIRY" | "CONTACTED" | "QUOTED" | "CONFIRMED"
  | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED";

export const ORDER_TYPE = core.ORDER_TYPE as Readonly<{ INQUIRY: "INQUIRY"; FORMAL: "FORMAL" }>;
export const ORDER_STATUSES = core.ORDER_STATUSES as readonly OrderStatus[];
export const ORDER_STATUS = core.ORDER_STATUS as Readonly<Record<OrderStatus, OrderStatus>>;
export const PAYMENT_STATUS = core.PAYMENT_STATUS as Readonly<Record<string, string>>;
export const FULFILLMENT_STATUS = core.FULFILLMENT_STATUS as Readonly<Record<string, string>>;
export const ORDER_STATUSES_BY_TYPE = core.ORDER_STATUSES_BY_TYPE as Readonly<Record<OrderType, readonly OrderStatus[]>>;
export const validateOrderTransition = core.validateOrderTransition as (type: OrderType, current: string, next: string) => { ok: boolean; error?: string };
export const normalizeLegacyOrderStatus = core.normalizeLegacyOrderStatus as (type: OrderType, status: string) => OrderStatus | null;
export const fulfillmentForOrderStatus = core.fulfillmentForOrderStatus as (status: string) => string;

