// Matriks hak akses per role (dipakai di UI dan di server)
export const can = {
  manageProducts: (u) => ["admin", "manager"].includes(u?.role),
  viewProducts: (u) => ["admin", "manager", "staff"].includes(u?.role),
  manageCategories: (u) => ["admin", "manager"].includes(u?.role),
  viewTransactions: (u) => ["admin", "manager", "staff"].includes(u?.role),
  createTransactions: (u) => ["manager", "staff"].includes(u?.role),
  approveTransactions: (u) => u?.role === "manager",
  viewRestock: (u) => ["admin", "manager", "supplier"].includes(u?.role),
  manageRestock: (u) => u?.role === "manager",
  verifySuppliers: (u) => u?.role === "admin",
};

// Modul yang boleh diekspor per role
export const EXPORTABLE = {
  admin: ["products", "transactions", "restock", "categories", "suppliers"],
  manager: ["products", "transactions", "restock"],
  staff: ["transactions"],
  supplier: [],
};
