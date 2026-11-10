import api from "../../services/api";
import type { CapacityPlan, PlanningFilters } from "./types";

export async function getCapacityPlan(filters: PlanningFilters) {
  const response = await api.get<CapacityPlan>("planning/capacity/", {
    params: Object.fromEntries(Object.entries(filters).filter(([, value]) => value.trim())),
  });
  return response.data;
}
