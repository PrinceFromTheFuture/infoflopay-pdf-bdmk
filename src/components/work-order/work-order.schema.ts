import { z } from 'zod';

// ─── Work order data schema ───────────────────────────────────
// Validates the shape of the data rendered by the work-order PDF template.
// Use `workOrderSchema.parse(data)` to fail fast on malformed input, and the
// inferred `WorkOrderData` type to keep the template and its callers in sync.

// Accepts strings, numbers, null, or undefined — always coerces to string.
const s = z.coerce.string();
// Accepts strings, numbers, null, or undefined — always coerces to number.
const n = z.coerce.number();

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
    dueDate: s,
});

const designSchema = z.object({
    dp: s,
    hp: s,
    vp: s,
    pp: s,
});

const sortPostageSchema = z.object({
    catSize: s,
    classOfMail: s,
    postageAffix: s,
    data: s,
    postageStatus: s,
    piNumber: s,
    destitrack: s,
    itSpecial: s,
    mailingList: s,
});

const deliverySchema = z.object({
    deliverToPo: s,
    deliverToClient: s,
    clientPuOrShip: s,
    leftovers: s,
});

const printingRowSchema = z.object({
    qty: n,
    size: s,
    type: s,
    material: s,
    via: s,
    psiz: s,
    sht: n,
    up: n,
    crn: s,
    bth: n,
    bld: s,
    sd: s,
    cb: s,
    uv: s,
    vdp: s,
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
});

export type WorkOrderData = z.infer<typeof workOrderSchema>;
export type PrintingRow = z.infer<typeof printingRowSchema>;
export type LettershopRow = z.infer<typeof lettershopRowSchema>;
