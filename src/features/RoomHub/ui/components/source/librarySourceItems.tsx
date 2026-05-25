import type { ReactNode } from "react";

import {
  BookmarkBorderRounded,
  LinkRounded,
  PublicOutlined,
  YouTube,
} from "@mui/icons-material";

export type CreateLibraryTab = "public" | "personal" | "youtube" | "link";

export type LibrarySourceItem = {
  key: CreateLibraryTab;
  label: string;
  icon: ReactNode;
};

export const librarySourceItems: LibrarySourceItem[] = [
  {
    key: "public",
    label: "公開收藏庫",
    icon: <PublicOutlined fontSize="small" />,
  },
  {
    key: "personal",
    label: "私人收藏庫",
    icon: <BookmarkBorderRounded fontSize="small" />,
  },
  {
    key: "youtube",
    label: "從 Youtube 匯入清單",
    icon: <YouTube fontSize="small" />,
  },
  {
    key: "link",
    label: "貼上清單連結",
    icon: <LinkRounded fontSize="small" />,
  },
];
