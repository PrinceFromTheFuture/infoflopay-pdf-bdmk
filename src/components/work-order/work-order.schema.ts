import { z } from 'zod';

// ─── Work order data schema ───────────────────────────────────
// Validates the shape of the data rendered by the work-order PDF template.
// Use `workOrderSchema.parse(data)` to fail fast on malformed input, and the
// inferred `WorkOrderData` type to keep the template and its callers in sync.

const headerSchema = z.object({
    workOrder: z.string(),
    dueDate: z.string(),
    priority: z.string(),
});

const orderSchema = z.object({
    customer: z.string(),
    notes: z.string(),
    jobName: z.string(),
    quantity: z.string(),
    po: z.string(),
    orderDate: z.string(),
    dataIn: z.string(),
    materialIn: z.string(),
    dueDate: z.string(),
});

const designSchema = z.object({
    dp: z.string(),
    hp: z.string(),
    vp: z.string(),
    pp: z.string(),
});

const sortPostageSchema = z.object({
    catSize: z.string(),
    classOfMail: z.string(),
    postageAffix: z.string(),
    data: z.string(),
    postageStatus: z.string(),
    piNumber: z.string(),
    destitrack: z.string(),
    itSpecial: z.string(),
    mailingList: z.string(),
});

const deliverySchema = z.object({
    deliverToPo: z.string(),
    deliverToClient: z.string(),
    clientPuOrShip: z.string(),
    leftovers: z.string(),
});

const printingRowSchema = z.object({
    qty: z.number(),
    size: z.string(),
    type: z.string(),
    material: z.string(),
    via: z.string(),
    psiz: z.string(),
    sht: z.number(),
    up: z.number(),
    crn: z.string(),
    bth: z.number(),
    bld: z.string(),
    sd: z.string(),
    cb: z.string(),
    uv: z.string(),
    vdp: z.string(),
});

const lettershopRowSchema = z.object({
    qty: z.number(),
    description: z.string(),
    comment: z.string(),
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
