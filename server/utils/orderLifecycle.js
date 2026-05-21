import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import StockLog from '../models/StockLog.js';
import UploadFile from '../modules/polygraphy/models/UploadFile.js';
import { createError } from '../middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../uploads');

export const buildProtectedUploadUrl = (fileId) => `/api/services/uploads/${String(fileId)}/content`;

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const serializeRelPath = (value) => String(value || '').replace(/\\/g, '/').replace(/^\/+/, '').trim();

const isPathInsideUploads = (candidatePath) => {
  const normalizedRoot = path.resolve(UPLOADS_DIR);
  const normalizedCandidate = path.resolve(candidatePath);
  return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}${path.sep}`);
};

export const resolveUploadAbsolutePath = (uploadFile) => {
  const relPath = serializeRelPath(uploadFile?.relPath);
  if (
    !relPath ||
    relPath.includes('..') ||
    /\0/.test(relPath) ||
    /^[a-zA-Z]:/.test(relPath)
  ) {
    throw createError('Некорректный путь к файлу', 400);
  }

  const absolutePath = path.resolve(UPLOADS_DIR, relPath);
  if (!isPathInsideUploads(absolutePath)) {
    throw createError('Выход за пределы каталога загрузок запрещён', 400);
  }

  return absolutePath;
};

export const resolveOrderUploadsDir = (orderId) => {
  const normalizedOrderId = String(orderId || '').trim();
  if (!/^[a-f0-9]{24}$/i.test(normalizedOrderId)) {
    throw createError('Некорректный идентификатор заказа', 400);
  }

  const candidate = path.resolve(UPLOADS_DIR, 'orders', normalizedOrderId);
  if (!isPathInsideUploads(candidate)) {
    throw createError('Некорректный путь каталога заказа', 400);
  }

  return candidate;
};

export const ORDER_STATUS_FLOW = Object.freeze({
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'shipped', 'delivered', 'cancelled'],
  processing: ['shipped', 'delivered', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: ['confirmed'],
});

export const canTransitionOrderStatus = (currentStatus, nextStatus) => {
  const from = String(currentStatus || '').trim().toLowerCase();
  const to = String(nextStatus || '').trim().toLowerCase();
  if (!from || !to) return false;
  if (from === to) return true;
  const allowed = ORDER_STATUS_FLOW[from];
  if (!Array.isArray(allowed)) return false;
  return allowed.includes(to);
};

export const appendOrderStatusHistory = (order, {
  status,
  source = 'system',
  actor = '',
  note = '',
  at = new Date(),
} = {}) => {
  if (!order || !status) return order;
  const nextStatus = String(status).trim().toLowerCase();
  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  const last = history.length ? history[history.length - 1] : null;
  if (
    last &&
    String(last.status || '').trim().toLowerCase() == nextStatus &&
    String(last.note || '').trim() == String(note || '').trim() &&
    String(last.source || '').trim() == String(source || '').trim()
  ) {
    return order;
  }

  history.push({
    status: nextStatus,
    source: String(source || 'system').trim().slice(0, 40),
    actor: String(actor || '').trim().slice(0, 120),
    note: String(note || '').trim().slice(0, 500),
    at: at instanceof Date ? at : new Date(at || Date.now()),
  });
  order.statusHistory = history;
  return order;
};

export const syncInventoryForStatusChange = async ({
  order,
  nextStatus,
  changedBy,
  applyReason = 'order_paid_admin',
  restockReason = 'order_cancelled',
  session = null,
}) => {
  const normalizedStatus = String(nextStatus || order?.status || '').trim().toLowerCase();
  if (!order || !normalizedStatus) return order;

  if (normalizedStatus === 'cancelled' && order.inventoryApplied) {
    await restockOrderInventory({ order, changedBy, reason: restockReason, session });
    return order;
  }

  if (normalizedStatus !== 'cancelled' && order.isPaid && !order.inventoryApplied) {
    await applyInventoryForOrder({ order, changedBy, reason: applyReason, session });
  }

  return order;
};

export const applyOrderStatusTransition = async ({
  order,
  nextStatus,
  changedBy,
  source = 'system',
  note = '',
  applyReason = 'order_paid_admin',
  restockReason = 'order_cancelled',
  session = null,
  overrideTransition = false,
} = {}) => {
  const currentStatus = String(order?.status || '').trim().toLowerCase() || 'pending';
  const normalizedStatus = String(nextStatus || currentStatus).trim().toLowerCase();
  if (!order || !normalizedStatus) return order;

  if (!overrideTransition && !canTransitionOrderStatus(currentStatus, normalizedStatus)) {
    throw createError(`Недопустимый переход статуса: ${currentStatus} -> ${normalizedStatus}`, 409);
  }

  await syncInventoryForStatusChange({
    order,
    nextStatus: normalizedStatus,
    changedBy,
    applyReason,
    restockReason,
    session,
  });

  order.status = normalizedStatus;
  if (normalizedStatus === 'delivered') {
    order.isDelivered = true;
    order.deliveredAt = order.deliveredAt || new Date();
  } else if (normalizedStatus !== 'delivered') {
    order.isDelivered = false;
  }

  if (normalizedStatus !== currentStatus) {
    appendOrderStatusHistory(order, {
      status: normalizedStatus,
      source,
      actor: changedBy ? String(changedBy) : '',
      note,
    });
  }

  return order;
};

export const deleteUploadRecordAndFile = async (uploadFile) => {
  if (!uploadFile) return;
  const absPath = (() => {
    try {
      return resolveUploadAbsolutePath(uploadFile);
    } catch {
      return null;
    }
  })();
  if (absPath) {
    await fs.unlink(absPath).catch(() => {});
  }
  await uploadFile.deleteOne().catch(() => {});
};

export const cleanupOrderFiles = async (orderId) => {
  if (!orderId) return;
  const files = await UploadFile.find({ order: orderId });
  for (const file of files) {
    await deleteUploadRecordAndFile(file);
  }
  const orderDir = (() => {
    try {
      return resolveOrderUploadsDir(orderId);
    } catch {
      return null;
    }
  })();
  if (orderDir) {
    await fs.rm(orderDir, { recursive: true, force: true }).catch(() => {});
  }
};

export const cleanupUserOrderAndFiles = async (userId) => {
  if (!userId) return;
  const tempFiles = await UploadFile.find({ owner: userId });
  for (const file of tempFiles) {
    await deleteUploadRecordAndFile(file);
  }
  const orders = await Order.find({ user: userId }).select('_id');
  for (const order of orders) {
    await cleanupOrderFiles(order._id);
  }
  await Order.deleteMany({ user: userId });
};

export const moveUploadFilesToOrder = async ({ order, userId }) => {
  if (!order?.serviceItems?.length) return;
  const ordersDir = resolveOrderUploadsDir(order?._id);
  await fs.mkdir(ordersDir, { recursive: true });

  for (const serviceItem of order.serviceItems) {
    const nextFiles = [];
    for (const rawFile of serviceItem.files) {
      const plainFile = rawFile?.toObject ? rawFile.toObject() : rawFile;
      const uploadFile = await UploadFile.findById(plainFile.fileId);
      if (!uploadFile || String(uploadFile.owner) != String(userId) || uploadFile.scope !== 'temp') {
        throw createError(`Файл заказа недоступен: ${plainFile?.originalName || 'unknown'}`, 400);
      }

      const sourcePath = resolveUploadAbsolutePath(uploadFile);
      const fileName = path.basename(uploadFile.relPath);
      const targetPath = path.join(ordersDir, fileName);
      await fs.rename(sourcePath, targetPath).catch(async () => {
        await fs.copyFile(sourcePath, targetPath);
        await fs.unlink(sourcePath).catch(() => {});
      });

      const nextRelPath = path.relative(UPLOADS_DIR, targetPath).split(path.sep).join('/');
      uploadFile.scope = 'order';
      uploadFile.order = order._id;
      uploadFile.relPath = nextRelPath;
      uploadFile.url = buildProtectedUploadUrl(uploadFile._id);
      await uploadFile.save({ validateBeforeSave: false });

      nextFiles.push({
        ...plainFile,
        url: uploadFile.url,
      });
    }
    serviceItem.files = nextFiles;
  }

  await order.save();
};

export const applyInventoryForOrder = async ({ order, changedBy, reason = 'order_paid', session = null }) => {
  if (!order?.orderItems?.length || order.inventoryApplied) return order;

  const productIds = order.orderItems.map((item) => item.product).filter(Boolean);
  const productsQuery = Product.find({ _id: { $in: productIds } }).select('stock');
  const products = session ? await productsQuery.session(session) : await productsQuery;
  const beforeMap = new Map(products.map((product) => [String(product._id), Number(product.stock || 0)]));

  const decremented = [];
  for (const item of order.orderItems) {
    const quantity = Number(item.quantity || 0);
    if (!quantity) continue;
    const result = await Product.updateOne(
      { _id: item.product, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      session ? { session } : undefined
    );
    if (result.modifiedCount !== 1) {
      for (const done of decremented) {
        await Product.updateOne({ _id: done.product }, { $inc: { stock: done.quantity } }, session ? { session } : undefined);
      }
      throw createError(`Недостаточно товара на складе для оплаты заказа: ${item.name}`, 409);
    }
    decremented.push({ product: item.product, quantity });
  }

  try {
    if (decremented.length) {
      await StockLog.insertMany(
        decremented.map((done) => ({
          product: done.product,
          changedBy,
          delta: -Number(done.quantity),
          before: Number(beforeMap.get(String(done.product)) || 0),
          after: round2(Number(beforeMap.get(String(done.product)) || 0) - Number(done.quantity)),
          reason,
          order: order._id,
        })),
        session ? { session } : undefined
      );
    }
  } catch (error) {
    console.warn('⚠️ StockLog insert failed:', error?.message || error);
  }

  order.inventoryApplied = true;
  await order.save(session ? { session } : undefined);
  return order;
};

export const restockOrderInventory = async ({ order, changedBy, reason = 'order_cancelled', session = null }) => {
  if (!order?.orderItems?.length || !order.inventoryApplied) return order;

  const productIds = order.orderItems.map((item) => item.product).filter(Boolean);
  const productsQuery = Product.find({ _id: { $in: productIds } }).select('stock');
  const products = session ? await productsQuery.session(session) : await productsQuery;
  const beforeMap = new Map(products.map((product) => [String(product._id), Number(product.stock || 0)]));

  for (const item of order.orderItems) {
    const quantity = Number(item.quantity || 0);
    if (!quantity) continue;
    await Product.updateOne({ _id: item.product }, { $inc: { stock: quantity } }, session ? { session } : undefined);
  }

  try {
    const logs = order.orderItems
      .filter((item) => Number(item.quantity || 0) > 0)
      .map((item) => ({
        product: item.product,
        changedBy,
        delta: Number(item.quantity),
        before: Number(beforeMap.get(String(item.product)) || 0),
        after: Number(beforeMap.get(String(item.product)) || 0) + Number(item.quantity),
        reason,
        order: order._id,
      }));
    if (logs.length) {
      await StockLog.insertMany(logs, session ? { session } : undefined);
    }
  } catch (error) {
    console.warn('⚠️ StockLog restock insert failed:', error?.message || error);
  }

  order.inventoryApplied = false;
  await order.save(session ? { session } : undefined);
  return order;
};
