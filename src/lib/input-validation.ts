import { NextResponse } from "next/server";
import * as core from "@/lib/input-validation-core.mjs";

export function errorResponse(error: string, status = 400) {
  const labels: Record<string, string> = {
    "Invalid JSON body": "请求数据格式不正确",
    "Internal server error": "服务器内部错误",
    "Server upload internal error": "服务器上传处理失败",
    "Record not found": "记录不存在",
    "A record with that unique value already exists": "该唯一值已存在，请更换后重试",
    "Invalid category data": "类目数据格式不正确",
    "Invalid product data": "产品数据格式不正确",
    "Invalid post data": "文章数据格式不正确",
    "Invalid order data": "订单数据格式不正确",
    "Invalid category id": "类目编号无效",
    "Invalid product id": "产品编号无效",
    "Invalid post id": "文章编号无效",
    "Invalid order id": "订单编号无效",
    "Invalid customer id": "客户编号无效",
    "Invalid media asset id": "媒体资源编号无效",
    "Not found": "记录不存在",
    "Order not found": "订单不存在",
    "Customer not found": "客户不存在",
    "Media asset not found": "媒体资源不存在",
    "Media record not found": "媒体记录不存在",
    "Invalid customer filters": "客户筛选条件无效",
    "Invalid customer fields": "客户字段无效",
    "Invalid customer status": "客户状态无效",
    "Invalid order filters": "订单筛选条件无效",
    "Invalid order fields": "订单字段无效",
    "Invalid order type": "订单类型无效",
    "Invalid order status": "订单状态无效",
    "Invalid payment status": "付款状态无效",
    "Invalid fulfillment status": "履约状态无效",
    "Invalid shipping amount": "运费金额无效",
    "Invalid conversion request": "订单转换请求无效",
    "Invalid expectedUpdatedAt": "更新时间无效",
    "expectedUpdatedAt is required": "缺少更新时间",
    "A media file is required": "请选择媒体文件",
    "Invalid alt text": "替代文字无效",
    "Media asset is in use": "媒体资源正在被使用，无法删除",
    "No items provided": "没有提供要保存的内容",
    "Invalid media item": "媒体项目无效",
    "Duplicate media key": "媒体键不能重复",
    "Unknown page": "页面不存在",
    "Invalid page save": "页面保存数据无效",
    "The order changed before this update was saved": "订单已被其他操作修改，请刷新后重试",
    "This order was changed by another update. Reload and try again.": "订单已被其他操作修改，请刷新后重试",
    "Only a quoted inquiry can be converted": "只有已报价的询盘才能转为正式订单",
    "Invalid order status transition": "订单状态不能这样变更",
    "Convert the inquiry before adding formal order fields": "请先将询盘转为正式订单，再填写正式订单字段",
    "A cancelled order cannot be marked paid": "已取消的订单不能标记为已付款",
    "A completed order must be paid or refunded": "已完成的订单必须已付款或已退款",
    "A paid order cannot be moved back to an unpaid state": "已付款订单不能改回未付款状态",
    "A refunded order cannot be moved back to an unpaid state": "已退款订单不能改回未付款状态",
    "The amount of a paid or fulfilled order cannot be changed": "已付款或已履约订单不能修改金额",
    "Fulfillment status must match the order status": "履约状态必须与订单状态匹配",
    "Formal orders require a payment status": "正式订单必须设置付款状态",
    "An unpaid order cannot be refunded": "未付款订单不能退款",
    "The order must be paid before processing or shipping": "订单付款后才能处理或发货",
    "Carrier and tracking number are required before shipping": "发货前必须填写承运商和物流单号",
    "A completed order must have been shipped and paid": "订单发货并付款后才能标记为已完成",
    "Media asset changed; reload and try again": "媒体资源已发生变化，请刷新后重试",
    "Media asset changed or is not active; reload and try again": "媒体资源已发生变化或不可用，请刷新后重试",
    "Replacement must use the same media type": "替换文件必须使用相同的媒体类型",
    "Video uploads must use the streaming protocol": "视频上传必须使用流式上传方式",
    "Video replacement must use the streaming protocol": "视频替换必须使用流式上传方式",
    "Unknown local media asset": "本地媒体资源不存在",
  };
  let message = labels[error] || error;
  if (message.startsWith("Invalid ")) message = `${message.slice(8)}无效`;
  return NextResponse.json({ error: message }, { status });
}

export const parsePositiveId = core.parsePositiveId as (value: unknown) => number | null;
export const isValidSlug = core.isValidSlug as (value: unknown) => value is string;
export const isAllowedUrl = core.isAllowedUrl as (value: unknown, allowEmpty?: boolean) => value is string;
export const isOneOf = core.isOneOf as <T extends string>(value: unknown, allowed: readonly T[]) => value is T;
export const validateCategoryInput = core.validateCategoryInput as (input: unknown, mode?: "create" | "update") => { ok: boolean; error?: string; value?: Record<string, unknown> };
export const validatePostInput = core.validatePostInput as (input: unknown, mode?: "create" | "update") => { ok: boolean; error?: string; value?: Record<string, unknown> };
export const validateProductInput = core.validateProductInput as (input: unknown, mode?: "create" | "update") => { ok: boolean; error?: string; value?: Record<string, unknown> };
export const validateOrderFields = core.validateOrderFields as (input: unknown) => { ok: boolean; error?: string };
export const validateUploadMetadata = core.validateUploadMetadata as (input: unknown) => { ok: boolean; error?: string };
export const uploadExtensionForMime = core.uploadExtensionForMime as (mimeType: string) => string | null;
