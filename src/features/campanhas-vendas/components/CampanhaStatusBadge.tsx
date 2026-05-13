import { Pill } from "@/components/common/Pill";
import { STATUS_CAMPANHA_LABEL, STATUS_CAMPANHA_VARIANT, type StatusCampanha } from "../types";

export function CampanhaStatusBadge({ status }: { status: StatusCampanha }) {
  return (
    <Pill variant={STATUS_CAMPANHA_VARIANT[status]}>
      {STATUS_CAMPANHA_LABEL[status]}
    </Pill>
  );
}
