import { useMemo } from "react";

import { useSubTagsQuery } from "../hooks/useSubTagsQuery";

export type CollectionMetaChipSource = {
  category?: {
    key: string;
    label: string;
    parentKey?: string | null;
    parentLabel?: string | null;
  } | null;
  sub_tag_keys?: string[] | null;
};

export type CollectionMetaChip = {
  key: string;
  label: string;
  tone: "category" | "language";
};

export const formatCollectionCategoryLabel = (
  category: CollectionMetaChipSource["category"],
) => {
  if (!category) return null;
  const label = category.label?.trim();
  if (!label) return null;
  const parentLabel = category.parentLabel?.trim();
  return parentLabel ? `${parentLabel} › ${label}` : label;
};

export const useCollectionMetaChips = (
  collection: CollectionMetaChipSource | null | undefined,
) => {
  const { data: subTags = [] } = useSubTagsQuery();

  const subTagLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    subTags.forEach((tag) => {
      if (tag.key && tag.label) map.set(tag.key, tag.label);
    });
    return map;
  }, [subTags]);

  return useMemo(() => {
    const chips: CollectionMetaChip[] = [];
    const categoryLabel = formatCollectionCategoryLabel(collection?.category);

    if (categoryLabel) {
      chips.push({
        key: `category:${collection?.category?.key ?? categoryLabel}`,
        label: categoryLabel,
        tone: "category",
      });
    }

    (collection?.sub_tag_keys ?? []).forEach((key) => {
      const label = subTagLabelByKey.get(key)?.trim();
      if (!label) return;
      chips.push({
        key: `language:${key}`,
        label,
        tone: "language",
      });
    });

    return chips;
  }, [collection?.category, collection?.sub_tag_keys, subTagLabelByKey]);
};
