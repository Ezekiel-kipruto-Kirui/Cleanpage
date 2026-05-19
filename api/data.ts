import { sendJson, readJson } from "./_lib/http.js";
import { bearerToken, verifyToken } from "./_lib/jwt.js";
import { hashDjangoPbkdf2 } from "./_lib/password.js";
import fs from "node:fs/promises";
import path from "node:path";
import {
  firebaseDelete,
  firebaseGet,
  firebasePatch,
  firebasePut,
  listFromFirebaseObject,
  normalizeCollection,
  recordIdFromEndpoint,
} from "./_lib/firebase.js";
import { sendSms } from "./_lib/sms.js";
import type { RequestLike, ResponseLike } from "./_lib/types.js";

type FirebaseRecord = Record<string, unknown> & { id?: number | string };
type FirebaseRecords = Record<string, FirebaseRecord>;
type UserSalesSummaryRecord = {
  user_id: number;
  email: string;
  name: string;
  total_revenue: number;
  total_orders: number;
};

let localExportCache: Record<string, unknown> | null | undefined;

function nextId(records: Record<string, { id?: number | string }>): number {
  const ids = Object.values(records || {})
    .map((record) => Number(record?.id))
    .filter((id) => Number.isFinite(id));
  return ids.length ? Math.max(...ids) + 1 : 1;
}

function uniqueOrderCode(id: number | string): string {
  const suffix = Number(id).toString(16).toUpperCase().padStart(5, "0").slice(-5);
  return `ORD-${suffix}`;
}

function cleanEndpoint(endpoint: unknown): string[] {
  return String(endpoint || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .split("?")[0]
    .split("/")
    .filter(Boolean);
}

function toNumber(value: unknown): number {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeOrderItems(value: unknown): Array<FirebaseRecord> {
  return Array.isArray(value) ? (value.filter(Boolean) as Array<FirebaseRecord>) : [];
}

function recordDate(record: FirebaseRecord): string {
  return String(record.order_created_at || record.created_at || record.date || record.delivery_date || "");
}

function isWithinDateRange(record: FirebaseRecord, query: RequestLike["query"]): boolean {
  const value = recordDate(record).slice(0, 10);
  if (!value) return true;

  const start = query.start_date || query.created_at__date__gte || query.created_at__gte;
  const end = query.end_date || query.created_at__date__lte || query.created_at__lte;
  if (start && value < String(start)) return false;
  if (end && value > String(end).slice(0, 10)) return false;
  return true;
}

function filterRecords(records: Array<FirebaseRecord>, query: RequestLike["query"]): Array<FirebaseRecord> {
  const search = String(query.search || "").trim().toLowerCase();
  return records.filter((record) => {
    if (!isWithinDateRange(record, query)) return false;
    if (query.payment_status && record.payment_status !== query.payment_status) return false;
    if (query.order_status && record.order_status !== query.order_status) return false;
    if (query.shop && record.shop !== query.shop) return false;
    if (query.created_by) {
      const userId = String(query.created_by);
      if (String(record.created_by_id || record.created_by || "") !== userId) return false;
    }
    if (search && !JSON.stringify(record).toLowerCase().includes(search)) return false;
    return true;
  });
}

function pageUrl(basePath: string, query: RequestLike["query"], page: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (["app", "endpoint", "collection", "id"].includes(key) || value === undefined) continue;
    params.set(key, String(value));
  }
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

function paginate(records: Array<FirebaseRecord>, query: RequestLike["query"], basePath: string): Record<string, unknown> {
  const pageSize = Math.max(1, Number(query.page_size || 20));
  const currentPage = Math.max(1, Number(query.page || 1));
  const count = records.length;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const start = (currentPage - 1) * pageSize;
  const results = records.slice(start, start + pageSize);

  return {
    count,
    total_pages: totalPages,
    current_page: currentPage,
    page_size: pageSize,
    next: currentPage < totalPages ? pageUrl(basePath, query, currentPage + 1) : null,
    previous: currentPage > 1 ? pageUrl(basePath, query, currentPage - 1) : null,
    results,
  };
}

async function readLocalExport(): Promise<Record<string, unknown> | null> {
  if (localExportCache !== undefined) return localExportCache;

  const candidates = [
    path.resolve(process.cwd(), "..", "exports", "firebase", "firebase_realtime_database.json"),
    path.resolve(process.cwd(), "exports", "firebase", "firebase_realtime_database.json"),
  ];

  for (const candidate of candidates) {
    try {
      localExportCache = JSON.parse(await fs.readFile(candidate, "utf8")) as Record<string, unknown>;
      return localExportCache;
    } catch {
      // Try the next likely local path.
    }
  }

  localExportCache = null;
  return null;
}

async function getCollectionRecords(collection: string): Promise<FirebaseRecords> {
  try {
    return (await firebaseGet(collection)) || {};
  } catch (error) {
    const localExport = await readLocalExport();
    const localRecords = localExport?.[collection];
    if (localRecords && typeof localRecords === "object") {
      return localRecords as FirebaseRecords;
    }
    throw error;
  }
}

function listRecords(records: FirebaseRecords): Array<FirebaseRecord> {
  return listFromFirebaseObject(records) as Array<FirebaseRecord>;
}

function fieldValue(record: FirebaseRecord, fields: string[]): unknown {
  for (const field of fields) {
    const value = record[field];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function hotelItemRevenue(record: FirebaseRecord): number {
  return toNumber(fieldValue(record, ["total_price", "total_item_price", "price"]));
}

async function findCustomerByPhone(phone: string): Promise<FirebaseRecord | null> {
  const customers = listRecords(await getCollectionRecords("LaundryApp_customer"));
  const normalized = String(phone || "").replace(/\s+/g, "");
  return customers.find((customer) => String(customer.phone || "").replace(/\s+/g, "") === normalized) || null;
}

async function getLaundryCustomerById(customerId: unknown): Promise<FirebaseRecord | null> {
  if (customerId && typeof customerId === "object" && "id" in customerId) {
    customerId = (customerId as { id?: unknown }).id;
  }
  if (customerId === undefined || customerId === null || customerId === "") return null;
  const customers = listRecords(await getCollectionRecords("LaundryApp_customer"));
  return customers.find((customer) => String(customer.id || "") === String(customerId)) || null;
}

function orderNotificationMessage(
  customerName: string,
  orderCode: string,
  trigger: "created" | "completed" | "delivered" | "paid",
): string | null {
  if (trigger === "created") {
    return `Hello ${customerName}! Your order ${orderCode} has been received and is now being processed.`;
  }
  if (trigger === "completed") {
    return `Hi ${customerName}, your order ${orderCode} is now complete. Thank you for choosing our laundry service.`;
  }
  if (trigger === "delivered") {
    return `Hello ${customerName}, your order ${orderCode} has been delivered successfully. We appreciate your trust in our services.`;
  }
  if (trigger === "paid") {
    return `Hello ${customerName}, payment for order ${orderCode} has been received successfully. Thank you.`;
  }
  return null;
}

async function notifyLaundryOrder(record: FirebaseRecord, trigger: "created" | "completed" | "delivered" | "paid"): Promise<void> {
  const customerId = fieldValue(record, ["customer_id"]) ?? fieldValue(record, ["customer"]);
  const customer = await getLaundryCustomerById(customerId);
  const phone = String(customer?.phone || "").trim();
  const customerName = String(customer?.name || "Customer").trim() || "Customer";
  const orderCode = String(record.uniquecode || uniqueOrderCode(record.id || ""));
  const message = orderNotificationMessage(customerName, orderCode, trigger);

  if (!phone || !message) return;

  const result = await sendSms(phone, message);
  if (!result.success) {
    console.warn(`SMS notification failed for order ${orderCode}: ${result.details}`);
  }
}

async function enrichHotelOrderItems(records: Array<FirebaseRecord>): Promise<Array<FirebaseRecord>> {
  const [orders, foodItems, users] = await Promise.all([
    getCollectionRecords("HotelApp_hotelorder").catch(() => ({} as FirebaseRecords)),
    getCollectionRecords("HotelApp_fooditem").catch(() => ({} as FirebaseRecords)),
    getCollectionRecords("LaundryApp_userprofile").catch(() => ({} as FirebaseRecords)),
  ]);

  const orderById = new Map(listRecords(orders).map((order) => [String(order.id), order]));
  const foodById = new Map(listRecords(foodItems).map((food) => [String(food.id), food]));
  const userById = new Map(listRecords(users).map((user) => [String(user.id), user]));

  return records.map((record) => {
    const order = orderById.get(String(record.order_id || record.order || ""));
    const foodItem = foodById.get(String(record.food_item_id || record.food_item || ""));
    const createdById = fieldValue(record, ["created_by_id", "created_by"]) || order?.created_by_id || order?.created_by;
    const createdBy = createdById ? userById.get(String(createdById)) || null : null;

    return {
      ...record,
      order: record.order || record.order_id,
      food_item: foodItem || record.food_item,
      food_item_name: record.food_item_name || foodItem?.name,
      created_by_id: createdById || record.created_by_id,
      created_by: createdBy || record.created_by,
      order_created_at: order?.created_at || record.order_created_at,
    };
  });
}

function userName(user: FirebaseRecord | undefined): string {
  if (!user) return "";
  return [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || String(user.email || "");
}

async function userSalesSummary(records: Array<FirebaseRecord>, revenueForRecord: (record: FirebaseRecord) => number): Promise<Record<string, unknown>> {
  const users = listRecords(await getCollectionRecords("LaundryApp_userprofile").catch(() => ({} as FirebaseRecords)));
  const userById = new Map(users.map((user) => [String(user.id), user]));
  const summaries = new Map<string, UserSalesSummaryRecord>();
  const countedOrdersByUser = new Map<string, Set<string>>();

  for (const record of records) {
    const userIdValue = fieldValue(record, ["created_by_id", "created_by"]);
    if (!userIdValue) continue;

    const userId = String(userIdValue);
    const user = userById.get(userId);
    const current = summaries.get(userId) || {
      user_id: Number(userIdValue),
      email: String(user?.email || ""),
      name: userName(user),
      total_revenue: 0,
      total_orders: 0,
    };

    current.total_revenue += revenueForRecord(record);
    const orderKey = String(fieldValue(record, ["order_id", "order", "id"]) || "");
    const countedOrders = countedOrdersByUser.get(userId) || new Set<string>();
    if (!orderKey || !countedOrders.has(orderKey)) {
      current.total_orders += 1;
      if (orderKey) countedOrders.add(orderKey);
    }
    countedOrdersByUser.set(userId, countedOrders);
    summaries.set(userId, current);
  }

  return { data: Array.from(summaries.values()) };
}

function hotelOrderSummary(items: Array<FirebaseRecord>): Record<string, unknown> {
  const creditItems = items.filter((item) => Boolean(item.oncredit));
  const orderIds = new Set(items.map((item) => String(item.order_id || item.order || item.id)).filter(Boolean));

  return {
    total_orders: orderIds.size,
    total_revenue: items.reduce((sum, item) => sum + hotelItemRevenue(item), 0),
    credit_orders_count: creditItems.length,
    credit_orders_value: creditItems.reduce((sum, item) => sum + hotelItemRevenue(item), 0),
  };
}

async function enrichLaundryOrders(records: Array<FirebaseRecord>): Promise<Array<FirebaseRecord>> {
  const [customers, orderItems, users] = await Promise.all([
    getCollectionRecords("LaundryApp_customer").catch(() => ({} as FirebaseRecords)),
    getCollectionRecords("LaundryApp_orderitem").catch(() => ({} as FirebaseRecords)),
    getCollectionRecords("LaundryApp_userprofile").catch(() => ({} as FirebaseRecords)),
  ]);

  const customerById = new Map(listRecords(customers).map((customer) => [String(customer.id), customer]));
  const userById = new Map(listRecords(users).map((user) => [String(user.id), user]));
  const itemsByOrderId = new Map<string, Array<FirebaseRecord>>();

  for (const item of listRecords(orderItems)) {
    const orderId = String(item.order_id || "");
    if (!orderId) continue;
    const list = itemsByOrderId.get(orderId) || [];
    list.push(item);
    itemsByOrderId.set(orderId, list);
  }

  return records.map((record) => {
    const customer = customerById.get(String(record.customer_id)) || {
      id: record.customer_id || 0,
      name: "Unknown",
      phone: "",
    };
    const createdBy = userById.get(String(record.created_by_id)) || {
      id: record.created_by_id || 0,
      email: "",
      first_name: "",
      last_name: "",
      user_type: "staff",
      is_superuser: false,
      is_staff: false,
      is_active: true,
      groups: [],
      user_permissions: [],
    };

    return {
      ...record,
      customer,
      created_by: createdBy,
      updated_by: record.updated_by_id ? userById.get(String(record.updated_by_id)) || null : null,
      items: itemsByOrderId.get(String(record.id)) || normalizeOrderItems(record.items),
    };
  });
}

function orderSummary(records: Array<FirebaseRecord>): Record<string, unknown> {
  const pendingOrders = records.filter((record) => record.order_status === "pending");
  const completedOrders = records.filter((record) => record.order_status === "Completed");

  return {
    total_orders: records.length,
    total_revenue: records.reduce((sum, record) => sum + toNumber(record.total_price), 0),
    pending_orders: pendingOrders.length,
    completed_orders: completedOrders.length,
    pending_revenue: pendingOrders.reduce((sum, record) => sum + toNumber(record.total_price), 0),
    completed_revenue: completedOrders.reduce((sum, record) => sum + toNumber(record.total_price), 0),
    shop_breakdown: ["Shop A", "Shop B"].map((shop) => {
      const shopRecords = records.filter((record) => record.shop === shop);
      return {
        shop,
        total_orders: shopRecords.length,
        total_revenue: shopRecords.reduce((sum, record) => sum + toNumber(record.total_price), 0),
      };
    }),
  };
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date : null;
}

function currentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
}

function effectiveRange(query: RequestLike["query"]): { start: Date; end: Date } | null {
  const startValue = query.start_date || query.created_at__date__gte || query.created_at__gte;
  const endValue = query.end_date || query.created_at__date__lte || query.created_at__lte;

  if (!startValue && !endValue) {
    return currentMonthRange();
  }

  const start = parseDate(startValue) || currentMonthRange().start;
  const end = parseDate(endValue) || currentMonthRange().end;
  return { start, end };
}

function recordsForOrderIds(records: Array<FirebaseRecord>, orderIds: Set<string>): Array<FirebaseRecord> {
  return records.filter((record) => orderIds.has(String(record.order_id || record.order || "")));
}

function normalizeListField(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function isUsersEndpoint(app: unknown, segments: string[], collection: string): boolean {
  return String(app || "").toLowerCase() === "laundry" &&
    segments[0] === "users" &&
    collection === "LaundryApp_userprofile";
}

function normalizeUserRecord(record: FirebaseRecord, existing?: FirebaseRecord | null): FirebaseRecord {
  const password = typeof record.password === "string" ? record.password : "";
  const passwordHash = password
    ? hashDjangoPbkdf2(password)
    : (record.password_hash || existing?.password_hash);

  const userType = String(record.user_type || existing?.user_type || "staff").toLowerCase() === "admin"
    ? "admin"
    : "staff";
  const isSuperuser = Boolean(record.is_superuser ?? existing?.is_superuser ?? userType === "admin");

  const normalized: FirebaseRecord = {
    ...(existing || {}),
    ...record,
    user_type: userType,
    is_staff: Boolean(record.is_staff ?? existing?.is_staff ?? true),
    is_superuser: isSuperuser,
    is_active: record.is_active ?? existing?.is_active ?? true,
    groups: Array.isArray(record.groups) ? record.groups : (Array.isArray(existing?.groups) ? existing.groups : []),
    user_permissions: Array.isArray(record.user_permissions)
      ? record.user_permissions
      : (Array.isArray(existing?.user_permissions) ? existing.user_permissions : []),
  };

  delete normalized.password;
  delete normalized.confirm_password;

  if (passwordHash) normalized.password_hash = passwordHash;
  return normalized;
}

async function saveAuthUser(record: FirebaseRecord, existing?: FirebaseRecord | null): Promise<void> {
  const authRecord = normalizeUserRecord(record, existing);
  await firebasePut(`auth_users/${authRecord.id}`, authRecord);
}

function sumRecords(records: Array<FirebaseRecord>, field: string): number {
  return records.reduce((sum, record) => sum + toNumber(record[field]), 0);
}

function countBy(records: Array<FirebaseRecord>, predicate: (record: FirebaseRecord) => boolean): number {
  return records.reduce((count, record) => count + (predicate(record) ? 1 : 0), 0);
}

function groupRevenueSeries(
  records: Array<FirebaseRecord>,
  labels: string[],
  keyForRecord: (record: FirebaseRecord) => string | null,
  revenueForRecord: (record: FirebaseRecord) => number,
): number[] {
  const totals = new Map<string, number>(labels.map((label) => [label, 0]));
  for (const record of records) {
    const key = keyForRecord(record);
    if (!key || !totals.has(key)) continue;
    totals.set(key, (totals.get(key) || 0) + revenueForRecord(record));
  }
  return labels.map((label) => totals.get(label) || 0);
}

function rangeLabels(range: { start: Date; end: Date }): string[] {
  const labels: string[] = [];
  const cursor = new Date(range.start);
  while (cursor <= range.end) {
    labels.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return labels;
}

function paymentTypeLabel(value: string): string {
  if (value === "None") return "Not Paid";
  return value || "Unknown";
}

async function dashboardResponse(query: RequestLike["query"]): Promise<Record<string, unknown>> {
  const [
    laundryOrders,
    laundryOrderItems,
    laundryExpenses,
    customers,
    hotelOrders,
    hotelItems,
    hotelExpenses,
  ] = await Promise.all([
    getCollectionRecords("LaundryApp_order"),
    getCollectionRecords("LaundryApp_orderitem"),
    getCollectionRecords("LaundryApp_expenserecord"),
    getCollectionRecords("LaundryApp_customer"),
    getCollectionRecords("HotelApp_hotelorder"),
    getCollectionRecords("HotelApp_hotelorderitem"),
    getCollectionRecords("HotelApp_hotelexpenserecord"),
  ]);

  const range = effectiveRange(query) || currentMonthRange();
  const orders = await enrichLaundryOrders(filterRecords(listRecords(laundryOrders), query));
  const orderIds = new Set(orders.map((record) => String(record.id || "")));
  const orderItemRecords = recordsForOrderIds(listRecords(laundryOrderItems), orderIds);
  const laundryExpenseRecords = filterRecords(listRecords(laundryExpenses), query);

  const hotelOrderRecords = filterRecords(listRecords(hotelOrders), query);
  const hotelOrderIds = new Set(hotelOrderRecords.map((record) => String(record.id || "")));
  const hotelOrderItems = (await enrichHotelOrderItems(listRecords(hotelItems))).filter((record) =>
    hotelOrderIds.has(String(record.order_id || record.order || ""))
  );
  const hotelExpenseRecords = filterRecords(listRecords(hotelExpenses), query);

  const customerById = new Map(listRecords(customers).map((customer) => [String(customer.id), customer]));

  const laundryRevenue = sumRecords(orders, "total_price");
  const laundryExpenseTotal = sumRecords(laundryExpenseRecords, "amount");
  const hotelRevenue = hotelOrderItems.reduce((sum, record) => sum + hotelItemRevenue(record), 0);
  const hotelExpenseTotal = sumRecords(hotelExpenseRecords, "amount");
  const totalRevenue = laundryRevenue + hotelRevenue;
  const totalExpenses = laundryExpenseTotal + hotelExpenseTotal;

  const orderStats = {
    total_orders: orders.length,
    pending_orders: countBy(orders, (record) => record.order_status === "pending"),
    completed_orders: countBy(orders, (record) => record.order_status === "Completed"),
    delivered_orders: countBy(orders, (record) => record.order_status === "Delivered_picked"),
    total_revenue: laundryRevenue,
    avg_order_value: orders.length ? laundryRevenue / orders.length : 0,
    total_balance: sumRecords(orders, "balance"),
    total_amount_paid: sumRecords(orders, "amount_paid"),
  };

  const paymentStats = {
    pending_payments: countBy(orders, (record) => record.payment_status === "pending"),
    partial_payments: countBy(orders, (record) => record.payment_status === "partial"),
    complete_payments: countBy(orders, (record) => record.payment_status === "completed"),
    total_pending_amount: orders.reduce((sum, record) => sum + (record.payment_status === "pending" ? toNumber(record.total_price) : 0), 0),
    total_partial_amount: orders.reduce((sum, record) => sum + (record.payment_status === "partial" ? toNumber(record.amount_paid) : 0), 0),
    total_complete_amount: orders.reduce((sum, record) => sum + (record.payment_status === "completed" ? toNumber(record.total_price) : 0), 0),
    total_collected_amount: sumRecords(orders, "amount_paid"),
    total_balance_amount: sumRecords(orders, "balance"),
    overdue_payments: countBy(
      orders,
      (record) =>
        ["pending", "partial"].includes(String(record.payment_status || "")) &&
        (() => {
          const createdAt = parseDate(record.created_at);
          return createdAt ? createdAt < new Date() : false;
        })()
    ),
    total_overdue_amount: orders.reduce((sum, record) => {
      const createdAt = parseDate(record.created_at);
      const overdue = createdAt ? createdAt < new Date() : false;
      return sum + (overdue && ["pending", "partial"].includes(String(record.payment_status || "")) ? toNumber(record.balance) : 0);
    }, 0),
  };

  const paymentTypeStats: Record<string, { count: number; total_amount: number; amount_collected: number }> = {};
  for (const record of orders) {
    const paymentType = String(record.payment_type || "Unknown");
    const current = paymentTypeStats[paymentType] || { count: 0, total_amount: 0, amount_collected: 0 };
    current.count += 1;
    current.total_amount += toNumber(record.total_price);
    current.amount_collected += toNumber(record.amount_paid);
    paymentTypeStats[paymentType] = current;
  }

  const expenseStats = {
    total_expenses: laundryExpenseTotal,
    shop_a_expenses: laundryExpenseRecords.filter((record) => record.shop === "Shop A").reduce((sum, record) => sum + toNumber(record.amount), 0),
    shop_b_expenses: laundryExpenseRecords.filter((record) => record.shop === "Shop B").reduce((sum, record) => sum + toNumber(record.amount), 0),
    average_expense: laundryExpenseRecords.length ? laundryExpenseTotal / laundryExpenseRecords.length : 0,
  };

  const hotelStats = {
    total_orders: hotelOrderIds.size,
    total_revenue: hotelRevenue,
    avg_order_value: hotelOrderIds.size ? hotelRevenue / hotelOrderIds.size : 0,
    total_expenses: hotelExpenseTotal,
    net_profit: hotelRevenue - hotelExpenseTotal,
  };

  const shopStatsFor = (shop: "Shop A" | "Shop B") => {
    const shopOrders = orders.filter((record) => record.shop === shop);
    const shopExpenses = laundryExpenseRecords.filter((record) => record.shop === shop);
    return {
      revenue: shopOrders.reduce((sum, record) => sum + toNumber(record.total_price), 0),
      total_orders: shopOrders.length,
      pending_orders: countBy(shopOrders, (record) => record.order_status === "pending"),
      completed_orders: countBy(shopOrders, (record) => record.order_status === "Completed"),
      pending_payments: countBy(shopOrders, (record) => record.payment_status === "pending"),
      partial_payments: countBy(shopOrders, (record) => record.payment_status === "partial"),
      complete_payments: countBy(shopOrders, (record) => record.payment_status === "completed"),
      total_pending_amount: shopOrders.reduce((sum, record) => sum + (record.payment_status === "pending" ? toNumber(record.total_price) : 0), 0),
      total_partial_amount: shopOrders.reduce((sum, record) => sum + (record.payment_status === "partial" ? toNumber(record.amount_paid) : 0), 0),
      total_complete_amount: shopOrders.reduce((sum, record) => sum + (record.payment_status === "completed" ? toNumber(record.total_price) : 0), 0),
      total_balance: sumRecords(shopOrders, "balance"),
      total_amount_paid: sumRecords(shopOrders, "amount_paid"),
      total_expenses: shopExpenses.reduce((sum, record) => sum + toNumber(record.amount), 0),
      net_profit:
        shopOrders.reduce((sum, record) => sum + toNumber(record.total_price), 0) -
        shopExpenses.reduce((sum, record) => sum + toNumber(record.amount), 0),
    };
  };

  const shopAStats = shopStatsFor("Shop A");
  const shopBStats = shopStatsFor("Shop B");

  const customerStats = new Map<string, { customer__name: string; customer__phone: string; count: number; spent: number }>();
  for (const order of orders) {
    const nestedCustomer = order.customer as FirebaseRecord | undefined;
    const customerId = String(fieldValue(order, ["customer_id"]) || nestedCustomer?.id || "");
    const customer = customerById.get(customerId) || nestedCustomer;
    const key = customerId || String(customer?.phone || customer?.name || order.id || "");
    const current = customerStats.get(key) || {
      customer__name: String(customer?.name || "Unknown Customer"),
      customer__phone: String(customer?.phone || ""),
      count: 0,
      spent: 0,
    };
    current.count += 1;
    current.spent += toNumber(order.total_price);
    customerStats.set(key, current);
  }

  const commonCustomers = Array.from(customerStats.values())
    .sort((a, b) => (b.spent - a.spent) || (b.count - a.count))
    .slice(0, 5);

  const paymentMethods = Object.entries(paymentTypeStats)
    .map(([payment_type, stats]) => ({
      payment_type,
      count: stats.count,
      total: stats.total_amount,
    }))
    .sort((a, b) => b.total - a.total);

  const topServiceCounter = new Map<string, number>();
  for (const item of orderItemRecords) {
    for (const service of normalizeListField(item.servicetype)) {
      topServiceCounter.set(service, (topServiceCounter.get(service) || 0) + 1);
    }
  }
  const topServices = Array.from(topServiceCounter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([servicetype, count]) => ({ servicetype, count }));

  const itemCounter = new Map<string, number>();
  for (const item of orderItemRecords) {
    for (const itemName of normalizeListField(item.itemname)) {
      itemCounter.set(itemName, (itemCounter.get(itemName) || 0) + 1);
    }
  }
  const commonItems = Array.from(itemCounter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([itemname, count]) => ({ itemname, count }));

  const trendLabels = rangeLabels(range);
  const laundryTrend = groupRevenueSeries(
    orders,
    trendLabels,
    (record) => {
      const date = parseDate(record.created_at);
      return date ? date.toISOString().slice(0, 10) : null;
    },
    (record) => toNumber(record.total_price),
  );
  const hotelTrend = groupRevenueSeries(
    hotelOrderItems,
    trendLabels,
    (record) => {
      const date = parseDate(fieldValue(record, ["order_created_at", "created_at"]));
      return date ? date.toISOString().slice(0, 10) : null;
    },
    (record) => hotelItemRevenue(record),
  );
  const totalTrend = trendLabels.map((_, index) => laundryTrend[index] + hotelTrend[index]);

  return {
    success: true,
    data: {
      order_stats: orderStats,
      payment_stats: paymentStats,
      payment_type_stats: paymentTypeStats,
      expense_stats: expenseStats,
      hotel_stats: hotelStats,
      business_growth: {
        total_revenue: totalRevenue,
        total_orders: orderStats.total_orders + hotelStats.total_orders,
        total_expenses: totalExpenses,
        net_profit: totalRevenue - totalExpenses,
      },
      revenue_by_shop: [
        { shop: "Shop A", total_revenue: shopAStats.revenue, paid: shopAStats.total_amount_paid, bal: shopAStats.total_balance },
        { shop: "Shop B", total_revenue: shopBStats.revenue, paid: shopBStats.total_amount_paid, bal: shopBStats.total_balance },
      ],
      balance_by_shop: [
        { shop: "Shop A", total_balance: shopAStats.total_balance },
        { shop: "Shop B", total_balance: shopBStats.total_balance },
      ],
      common_customers: commonCustomers,
      payment_methods: paymentMethods,
      top_services: topServices,
      common_items: commonItems,
      service_types: topServices,
      monthly_expenses_data: [],
      monthly_business_growth: [
        { label: "Laundry Revenue", data: laundryTrend, borderColor: "#36A2EB", fill: false },
        { label: "Hotel Revenue", data: hotelTrend, borderColor: "#FF6384", fill: false },
        { label: "Total Revenue", data: totalTrend, borderColor: "#4BC0C0", borderDash: [5, 5], fill: false },
      ],
      trend_labels: trendLabels,
      shop_a_stats: shopAStats,
      shop_b_stats: shopBStats,
    },
  };
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const tokenPayload = verifyToken(bearerToken(req), "access");

    const { app, endpoint, collection, id } = req.query;
    const segments = cleanEndpoint(endpoint);
    const resolvedCollection = normalizeCollection(app, endpoint, collection);
    const recordId = id || recordIdFromEndpoint(endpoint);
    const basePath = app
      ? `/api/${String(app).toLowerCase() === "hotel" ? "Hotel" : "Laundry"}/${segments[0] || ""}/`
      : `/api/${resolvedCollection === "reports" ? "Report" : resolvedCollection}/`;

    if (!resolvedCollection) {
      sendJson(res, 400, { detail: "Missing Firebase collection" });
      return;
    }

    if (req.method === "GET") {
      if (resolvedCollection === "reports" && segments[0] === "dashboard") {
        sendJson(res, 200, await dashboardResponse(req.query));
        return;
      }

      if (segments[0] === "orders" && segments[1] === "summary") {
        if (String(app || "").toLowerCase() === "hotel") {
          const items = filterRecords(await enrichHotelOrderItems(listRecords(await getCollectionRecords("HotelApp_hotelorderitem"))), req.query);
          sendJson(res, 200, hotelOrderSummary(items));
        } else {
          const records = filterRecords(listRecords(await getCollectionRecords(resolvedCollection)), req.query);
          sendJson(res, 200, orderSummary(records));
        }
        return;
      }

      if (segments[0] === "orders" && segments[1] === "user_sales_summary") {
        if (String(app || "").toLowerCase() === "hotel") {
          const items = filterRecords(await enrichHotelOrderItems(listRecords(await getCollectionRecords("HotelApp_hotelorderitem"))), req.query);
          sendJson(res, 200, await userSalesSummary(items, hotelItemRevenue));
        } else {
          const records = filterRecords(listRecords(await getCollectionRecords(resolvedCollection)), req.query);
          sendJson(res, 200, await userSalesSummary(records, (record) => toNumber(record.total_price)));
        }
        return;
      }

      if (String(app || "").toLowerCase() === "laundry" && segments[0] === "customers" && segments[1] === "by_phone") {
        const customer = await findCustomerByPhone(String(req.query.phone || ""));
        if (!customer) {
          sendJson(res, 404, { detail: "Customer not found" });
          return;
        }
        sendJson(res, 200, customer);
        return;
      }

      if (recordId) {
        const data = await firebaseGet(`${resolvedCollection}/${recordId}`);
        sendJson(res, 200, data);
        return;
      }

      let records = filterRecords(listRecords(await getCollectionRecords(resolvedCollection)), req.query);
      if (resolvedCollection === "LaundryApp_order") {
        records = await enrichLaundryOrders(records);
      }
      if (resolvedCollection === "HotelApp_hotelorderitem") {
        records = await enrichHotelOrderItems(records);
      }
      sendJson(res, 200, req.query.page || req.query.page_size ? paginate(records, req.query, basePath) : records);
      return;
    }

    if (req.method === "POST") {
      const body = await readJson<Record<string, unknown>>(req);
      if (String(app || "").toLowerCase() === "laundry" && segments[0] === "send-sms") {
        const result = await sendSms(body.to_number, body.message);
        if (!result.success) {
          sendJson(res, result.error === "SMS not configured" ? 503 : 400, result);
          return;
        }
        sendJson(res, 200, result);
        return;
      }

      const records = await firebaseGet(resolvedCollection).catch(() => ({} as Record<string, { id?: number | string }>));
      const nextRecordId = (body.id || nextId(records)) as string | number;
      const userId = Number(tokenPayload.sub) || tokenPayload.sub;
      const now = new Date().toISOString();
      const isLaundryOrder = resolvedCollection === "LaundryApp_order";
      const totalPrice = toNumber(body.total_price);
      const amountPaid = toNumber(body.amount_paid);
      const record = {
        ...body,
        id: nextRecordId,
        ...(isLaundryOrder ? {
          uniquecode: body.uniquecode || uniqueOrderCode(nextRecordId),
          order_status: body.order_status || "pending",
          payment_status: body.payment_status || "pending",
          balance: body.balance ?? Math.max(0, totalPrice - amountPaid).toFixed(2),
          updated_at: body.updated_at || now,
        } : {}),
        created_by_id: body.created_by_id ?? body.created_by ?? userId,
        created_at: body.created_at || now,
      };
      const recordToSave = isUsersEndpoint(app, segments, resolvedCollection)
        ? normalizeUserRecord(record)
        : record;

      await firebasePut(`${resolvedCollection}/${nextRecordId}`, recordToSave);

      if (isUsersEndpoint(app, segments, resolvedCollection)) {
        await saveAuthUser(recordToSave);
      }

      if (isLaundryOrder) {
        const items = normalizeOrderItems(body.items);
        if (items.length) {
          const orderItemRecords = await firebaseGet("LaundryApp_orderitem").catch(() => ({} as Record<string, { id?: number | string }>));
          let nextOrderItemId = nextId(orderItemRecords);

          await Promise.all(items.map((item) => {
            const itemId = item.id || nextOrderItemId++;
            const orderItem = {
              ...item,
              id: itemId,
              order_id: nextRecordId,
              created_by_id: item.created_by_id ?? userId,
              created_at: item.created_at || now,
            };
            return firebasePut(`LaundryApp_orderitem/${itemId}`, orderItem);
          }));
        }

        await notifyLaundryOrder(record, "created");
      }

      sendJson(res, 201, recordToSave);
      return;
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      if (!recordId) {
        sendJson(res, 400, { detail: "Missing record id" });
        return;
      }

      const body = await readJson<Record<string, unknown>>(req);
      const existingRecord = (await firebaseGet(`${resolvedCollection}/${recordId}`).catch(() => null)) as FirebaseRecord | null;
      const record = { ...body, id: Number(recordId) || recordId };
      const isLaundryOrder = resolvedCollection === "LaundryApp_order";
      const normalizedRecord = isUsersEndpoint(app, segments, resolvedCollection)
        ? normalizeUserRecord(record, existingRecord)
        : record;
      const payload = isLaundryOrder
        ? { ...normalizedRecord, updated_at: new Date().toISOString() }
        : normalizedRecord;
      const saved = req.method === "PUT"
        ? await firebasePut(`${resolvedCollection}/${recordId}`, payload)
        : await firebasePatch(`${resolvedCollection}/${recordId}`, payload);
      const mergedRecord = { ...(existingRecord || {}), ...(saved as FirebaseRecord) } as FirebaseRecord;

      if (isUsersEndpoint(app, segments, resolvedCollection)) {
        const existingAuthRecord = (await firebaseGet(`auth_users/${recordId}`).catch(() => null)) as FirebaseRecord | null;
        await saveAuthUser(mergedRecord, existingAuthRecord);
      }

      if (isLaundryOrder && existingRecord) {
        const previousOrderStatus = String(existingRecord.order_status || "");
        const nextOrderStatus = String(mergedRecord.order_status || previousOrderStatus);
        const previousPaymentStatus = String(existingRecord.payment_status || "");
        const nextPaymentStatus = String(mergedRecord.payment_status || previousPaymentStatus);

        if (previousOrderStatus !== "Completed" && nextOrderStatus === "Completed") {
          await notifyLaundryOrder(mergedRecord, "completed");
        }

        if (previousOrderStatus !== "Delivered_picked" && nextOrderStatus === "Delivered_picked") {
          await notifyLaundryOrder(mergedRecord, "delivered");
        }

        if (previousPaymentStatus !== "completed" && nextPaymentStatus === "completed") {
          await notifyLaundryOrder(mergedRecord, "paid");
        }
      }

      sendJson(res, 200, saved);
      return;
    }

    if (req.method === "DELETE") {
      if (!recordId) {
        sendJson(res, 400, { detail: "Missing record id" });
        return;
      }

      await firebaseDelete(`${resolvedCollection}/${recordId}`);
      sendJson(res, 200, { ok: true });
      return;
    }

    res.setHeader("Allow", "GET, POST, PUT, PATCH, DELETE");
    sendJson(res, 405, { detail: "Method not allowed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Firebase data request failed";
    const status = message.includes("token") || message.includes("Unauthorized") ? 401 : 500;
    sendJson(res, status, { detail: message });
  }
}
