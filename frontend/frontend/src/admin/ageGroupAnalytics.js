const CANONICAL_AGE_GROUPS = {
  UNDER_18: "Dưới 18 tuổi",
  FROM_18_TO_25: "18–25 tuổi",
  FROM_26_TO_35: "26–35 tuổi",
  FROM_36_TO_45: "36–45 tuổi",
  OVER_35: "Trên 35 tuổi",
  OVER_45: "Trên 45 tuổi",
  OTHER: "Khác",
  PRIVATE: "Không chia sẻ",
  UNKNOWN: "Chưa xác định",
};

const EXACT_AGE_GROUP_MAPPING = new Map([
  ["16", CANONICAL_AGE_GROUPS.UNDER_18],
  ["17", CANONICAL_AGE_GROUPS.UNDER_18],
  ["17 tuổi", CANONICAL_AGE_GROUPS.UNDER_18],
  ["18-25", CANONICAL_AGE_GROUPS.FROM_18_TO_25],
  ["Từ 18 đến 25 tuổi", CANONICAL_AGE_GROUPS.FROM_18_TO_25],
  ["Từ 18-25 tuổi", CANONICAL_AGE_GROUPS.FROM_18_TO_25],
  ["18_24", CANONICAL_AGE_GROUPS.FROM_18_TO_25],
  ["26-35", CANONICAL_AGE_GROUPS.FROM_26_TO_35],
  ["Từ 25 đến 35 tuổi", CANONICAL_AGE_GROUPS.FROM_26_TO_35],
  ["Từ 25-35 tuổi", CANONICAL_AGE_GROUPS.FROM_26_TO_35],
  ["Từ 35-45 tuổi", CANONICAL_AGE_GROUPS.FROM_36_TO_45],
  ["Trên 35 tuổi", CANONICAL_AGE_GROUPS.OVER_35],
  ["Trên 45 tuổi", CANONICAL_AGE_GROUPS.OVER_45],
  ["Khác", CANONICAL_AGE_GROUPS.OTHER],
  ["Không chia sẻ", CANONICAL_AGE_GROUPS.PRIVATE],
]);

const SORT_ORDER = new Map([
  [CANONICAL_AGE_GROUPS.UNDER_18, 1],
  [CANONICAL_AGE_GROUPS.FROM_18_TO_25, 2],
  [CANONICAL_AGE_GROUPS.FROM_26_TO_35, 3],
  [CANONICAL_AGE_GROUPS.FROM_36_TO_45, 4],
  [CANONICAL_AGE_GROUPS.OVER_35, 5],
  [CANONICAL_AGE_GROUPS.OVER_45, 6],
  [CANONICAL_AGE_GROUPS.OTHER, 7],
  [CANONICAL_AGE_GROUPS.PRIVATE, 8],
  [CANONICAL_AGE_GROUPS.UNKNOWN, 9],
]);

function getCanonicalAgeGroup(rawValue) {
  const value = String(rawValue ?? "").trim();

  if (!value || value.toUpperCase() === "UNKNOWN") {
    return CANONICAL_AGE_GROUPS.UNKNOWN;
  }

  return EXACT_AGE_GROUP_MAPPING.get(value) || value;
}

export function normalizeAgeGroupAnalytics(items = []) {
  const totals = new Map();
  const totalBefore = items.reduce(
    (sum, item) => sum + Number(item?.value || 0),
    0,
  );

  items.forEach((item) => {
    const name = getCanonicalAgeGroup(item?.name ?? item?.age_group);
    totals.set(name, (totals.get(name) || 0) + Number(item?.value || 0));
  });

  const normalized = [...totals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => {
      const leftOrder = SORT_ORDER.get(left.name) ?? 10;
      const rightOrder = SORT_ORDER.get(right.name) ?? 10;

      return leftOrder - rightOrder || left.name.localeCompare(right.name, "vi");
    });
  const totalAfter = normalized.reduce((sum, item) => sum + item.value, 0);

  if (totalBefore !== totalAfter) {
    throw new Error("Tổng age-group analytics thay đổi sau normalization.");
  }

  return normalized;
}
