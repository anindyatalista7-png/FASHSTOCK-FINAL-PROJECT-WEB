export const SESSION_COOKIE = "fashstock_session";
export const SESSION_DAYS = 7;

export const ROLES = {
  admin: "Admin",
  manager: "Warehouse Manager",
  staff: "Staff Gudang",
  supplier: "Supplier",
};

export const STOCK_STATUSES = ["Out of Stock", "Severe", "Low", "Normal"];
export const TRX_STATUSES = ["Pending", "Approved", "Rejected", "Shipped"];
export const RESTOCK_STATUSES = ["Pending", "Confirmed", "Rejected", "In Transit", "Received"];
export const UNITS = ["pcs", "box", "kg", "gram", "liter", "ml", "pack", "rim", "roll", "set", "lusin", "karton"];

export const PAGE_SIZE = 10;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
