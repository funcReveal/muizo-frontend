import { isAdminRole } from "../../../shared/auth/roles";

export const MAX_COLLECTIONS_PER_USER = 5;
export const MAX_COLLECTION_ITEMS_PER_COLLECTION = 500;
export const MAX_PRIVATE_COLLECTIONS_PER_USER = 2;

const PLAN_COLLECTION_ITEM_LIMITS: Record<string, number | null> = {
  free: MAX_COLLECTION_ITEMS_PER_COLLECTION,
  basic: MAX_COLLECTION_ITEMS_PER_COLLECTION,
  starter: MAX_COLLECTION_ITEMS_PER_COLLECTION,
  plus: 1000,
  pro: 1000,
  premium: 2000,
  business: 5000,
  unlimited: null,
};

const normalizePlanKey = (plan?: string | null) => {
  if (typeof plan !== "string") return "";
  return plan.trim().toLowerCase();
};

export const resolveCollectionItemLimit = ({
  role,
  plan,
  itemLimitOverride,
}: {
  role?: string | null;
  plan?: string | null;
  itemLimitOverride?: number | null;
}) => {
  if (
    typeof itemLimitOverride === "number" &&
    Number.isFinite(itemLimitOverride) &&
    itemLimitOverride > 0
  ) {
    return Math.floor(itemLimitOverride);
  }
  if (isAdminRole(role)) {
    return null;
  }
  const normalizedPlan = normalizePlanKey(plan);
  if (normalizedPlan && normalizedPlan in PLAN_COLLECTION_ITEM_LIMITS) {
    return PLAN_COLLECTION_ITEM_LIMITS[normalizedPlan];
  }
  return MAX_COLLECTION_ITEMS_PER_COLLECTION;
};
