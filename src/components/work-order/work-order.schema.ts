import { z } from "zod";

// ─── Work order data schema ───────────────────────────────────
// Validates the shape of the data rendered by the work-order PDF template.
// Use `workOrderSchema.parse(data)` to fail fast on malformed input, and the
// inferred `WorkOrderData` type to keep the template and its callers in sync.

// Accepts strings, numbers, null, or undefined — always coerces to string.
const s = z.coerce.string();
// Accepts strings, numbers, null, or undefined — always coerces to number.
const n = z.coerce.number();
// Like `s`, but a missing or null value becomes an empty string instead of
// failing (or coercing into the literal text "null"). Used for fields added
// after the fact so payloads that predate them still validate.
const so = z.preprocess((v) => v ?? "", s);

const headerSchema = z.object({
  workOrder: s,
  dueDate: s,
  priority: s,
});

const orderSchema = z.object({
  customer: s,
  notes: s,
  jobName: s,
  quantity: s,
  po: s,
  orderDate: s,
  dataIn: s,
  materialIn: s,
  artworkIn: s,
  dueDate: s,
});

const designSchema = z.object({
  dp: s,
  hp: s,
  vp: s,
  pp: s,
  designer: s,
  estimatedHours: s,
  actualHours: s,
  dateApproved: s,
});

const sortPostageSchema = z.object({
  catSize: s,
  political: s,
  classOfMail: s,
  postageAffix: s,
  data: s,
  postageStatus: s,
  piNumber: s,
  destitrack: s,
  itSpecial: s,
  mailingList: s,
});

// Each delivery destination carries an optional quantity alongside its value.
const deliverySchema = z.object({
  deliverToPo: s,
  deliverToPoQty: so,
  deliverToClient: s,
  deliverToClientQty: so,
  clientPuOrShip: s,
  clientPuOrShipQty: so,
  leftovers: s,
  leftoversQty: so,
});

const printingRowSchema = z.object({
  qty: n,
  size: s,
  type: s,
  material: s,
  via: s,
  rc: s,
  sd: s,
  cb: s,
  uv:s,
  vdp: s,
  ext: s,
  comment: s,
});

const lettershopRowSchema = z.object({
  qty: n,
  description: s,
  comment: s,
});

export const workOrderSchema = z.object({
  header: headerSchema,
  order: orderSchema,
  design: designSchema,
  sortPostage: sortPostageSchema,
  delivery: deliverySchema,
  printing: z.array(printingRowSchema),
  lettershop: z.array(lettershopRowSchema),
  comments: z.string(),
  /** PHP-style date format string (e.g. "m/d/Y", "d-m-Y", "Y/m/d").  Defaults to "m/d/Y". */
  date_format: z.string().default("m/d/Y"),
});

export type WorkOrderData = z.infer<typeof workOrderSchema>;
export type PrintingRow = z.infer<typeof printingRowSchema>;
export type LettershopRow = z.infer<typeof lettershopRowSchema>;
