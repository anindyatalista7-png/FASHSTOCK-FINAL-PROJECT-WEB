import { verifySupplier } from "@/actions/suppliers";
import ActionForm from "./client/ActionForm";
import SubmitButton from "./client/SubmitButton";
import Icon from "./Icon";

/** Tombol Approve / Reject supplier (dipakai di Dashboard Admin & halaman Supplier). */
export default function SupplierDecision({ supplier, from, show = ["Approved", "Rejected"] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {show.includes("Approved") && (
        <ActionForm action={verifySupplier.bind(null, supplier.id, "Approved")} confirmMessage={`Approve supplier ${supplier.company_name}?`}>
          {from && <input type="hidden" name="redirect_to" value={from} />}
          <SubmitButton className="btn btn-success btn-sm" pendingText="..."><Icon name="check" className="h-3.5 w-3.5" /> Approve</SubmitButton>
        </ActionForm>
      )}
      {show.includes("Rejected") && (
        <ActionForm action={verifySupplier.bind(null, supplier.id, "Rejected")} confirmMessage={`Reject supplier ${supplier.company_name}?`}>
          {from && <input type="hidden" name="redirect_to" value={from} />}
          <SubmitButton className="btn btn-outline btn-sm text-red-600 hover:bg-red-50" pendingText="..."><Icon name="x" className="h-3.5 w-3.5" /> Reject</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
