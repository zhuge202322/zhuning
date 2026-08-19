export const ORDER_TYPE_LABEL: Record<string, string> = {
  INQUIRY: "询盘订单",
  FORMAL: "正式订单",
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING_INQUIRY: "待处理询盘",
  CONTACTED: "已联系",
  QUOTED: "已报价",
  CONFIRMED: "已确认",
  PROCESSING: "处理中",
  SHIPPED: "已发货",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "未付款",
  PENDING: "待付款",
  PAID: "已付款",
  REFUNDED: "已退款",
};

export const FULFILLMENT_STATUS_LABEL: Record<string, string> = {
  NOT_REQUIRED: "无需履约",
  UNFULFILLED: "未履约",
  PROCESSING: "处理中",
  SHIPPED: "已发货",
  FULFILLED: "已完成",
  CANCELLED: "已取消",
};

export const CUSTOMER_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "正常",
  INQUIRY: "询盘客户",
  DISABLED: "已禁用",
};

export const LOCALE_LABEL: Record<string, string> = {
  fr: "法语",
  es: "西班牙语",
  ar: "阿拉伯语",
};

export function labelOf(map: Record<string, string>, value: string) {
  return map[value] || value;
}
