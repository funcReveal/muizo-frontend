import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_ORIGIN = "https://muizo.org";
const SITE_NAME = "Muizo";
const SITE_IMAGE = `${SITE_ORIGIN}/muizo.png`;

type RouteSeo = {
  title: string;
  description: string;
  canonicalPath: string;
  robots: string;
  keywords?: string;
  ogType?: "website" | "article";
};

const DEFAULT_KEYWORDS =
  "Muizo, 猜歌, 猜歌遊戲, 線上猜歌, 猜歌網站, 多人猜歌, 歌曲問答, YouTube 猜歌, 音樂遊戲, 派對遊戲";

const PUBLIC_ROUTE_SEO: Record<string, RouteSeo> = {
  "/": {
    title: "Muizo - 線上多人即時猜歌遊戲",
    description:
      "Muizo 是線上多人猜歌遊戲與歌曲問答平台，支援 YouTube 播放清單題庫、即時開房、朋友派對對戰、排行榜與結算回顧。",
    canonicalPath: "/",
    robots: "index, follow, max-image-preview:large",
    keywords: DEFAULT_KEYWORDS,
  },
  "/rooms": {
    title: "Muizo Rooms - 建立或加入線上猜歌房間",
    description:
      "在 Muizo Rooms 建立線上猜歌房間、加入公開房間、套用 YouTube 播放清單或公開收藏題庫，和朋友即時進行多人歌曲問答對戰。",
    canonicalPath: "/rooms",
    robots: "index, follow, max-image-preview:large",
    keywords:
      "Muizo Rooms, 線上猜歌房間, 多人猜歌房, 猜歌開房, 加入猜歌遊戲, YouTube 播放清單猜歌, 公開猜歌題庫",
  },
  "/privacy": {
    title: "隱私權政策 - Muizo",
    description:
      "查看 Muizo 如何處理登入、遊戲紀錄、播放清單與服務使用資料，了解線上猜歌平台的隱私權政策。",
    canonicalPath: "/privacy",
    robots: "index, follow",
  },
  "/terms": {
    title: "服務條款 - Muizo",
    description:
      "查看 Muizo 線上猜歌遊戲與多人歌曲問答平台的服務條款、使用規範與內容責任說明。",
    canonicalPath: "/terms",
    robots: "index, follow",
  },
};

const PRIVATE_ROUTE_SEO_BY_PATH: Record<string, RouteSeo> = {
  "/collections": {
    title: "我的題庫收藏 - Muizo",
    description:
      "管理你的 Muizo 猜歌題庫收藏、公開分享狀態與開房套用內容。此頁需登入使用，不會被搜尋引擎索引。",
    canonicalPath: "/",
    robots: "noindex, nofollow",
  },
  "/collections/new": {
    title: "建立猜歌題庫 - Muizo",
    description:
      "建立 Muizo 猜歌題庫，匯入播放清單、整理題目內容並設定公開或私人收藏。此頁需登入使用，不會被搜尋引擎索引。",
    canonicalPath: "/",
    robots: "noindex, nofollow",
  },
  "/career": {
    title: "生涯戰績總覽 - Muizo",
    description:
      "查看你的 Muizo 猜歌對戰紀錄、生涯表現、題庫排行與分享資料。此頁需登入使用，不會被搜尋引擎索引。",
    canonicalPath: "/",
    robots: "noindex, nofollow",
  },
};

const PRIVATE_ROUTE_SEO: RouteSeo = {
  title: "Muizo 功能頁 - 線上多人猜歌",
  description:
    "Muizo 線上多人猜歌遊戲的功能頁面。這類個人、邀請或編輯頁不會被搜尋引擎索引。",
  canonicalPath: "/",
  robots: "noindex, nofollow",
};

const setMeta = (
  selector: string,
  attribute: "name" | "property",
  key: string,
  content: string,
) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
};

const setCanonical = (href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
};

const setStructuredData = (data: unknown) => {
  const scriptId = "muizo-route-seo-jsonld";
  let element = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!element) {
    element = document.createElement("script");
    element.id = scriptId;
    element.type = "application/ld+json";
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(data);
};

const resolveRouteSeo = (pathname: string): RouteSeo => {
  if (PUBLIC_ROUTE_SEO[pathname]) return PUBLIC_ROUTE_SEO[pathname];
  if (PRIVATE_ROUTE_SEO_BY_PATH[pathname]) {
    return PRIVATE_ROUTE_SEO_BY_PATH[pathname];
  }
  if (pathname.startsWith("/rooms/")) {
    return {
      ...PRIVATE_ROUTE_SEO,
      title: "Muizo 房間大廳 - 線上多人猜歌",
      description:
        "Muizo 線上多人猜歌房間大廳。房間連結通常由朋友或主持人分享，搜尋引擎不會索引個別房間。",
      canonicalPath: "/rooms",
    };
  }
  if (pathname.startsWith("/collections/") && pathname.endsWith("/edit")) {
    return {
      ...PRIVATE_ROUTE_SEO,
      title: "編輯猜歌題庫 - Muizo",
      description:
        "編輯 Muizo 猜歌題庫內容、題目設定、播放片段與收藏資訊。此頁需登入使用，不會被搜尋引擎索引。",
    };
  }
  if (pathname.startsWith("/invited/")) {
    return {
      ...PRIVATE_ROUTE_SEO,
      title: "房間邀請 - Muizo",
      description:
        "透過 Muizo 房間邀請連結加入朋友的線上猜歌遊戲。邀請連結不會被搜尋引擎索引。",
      canonicalPath: "/rooms",
    };
  }
  return PRIVATE_ROUTE_SEO;
};

const buildStructuredData = (seo: RouteSeo, pathname: string) => {
  const canonicalUrl = `${SITE_ORIGIN}${seo.canonicalPath}`;
  const graph: unknown[] = [
    {
      "@type": "Organization",
      "@id": `${SITE_ORIGIN}/#organization`,
      name: SITE_NAME,
      url: SITE_ORIGIN,
      logo: SITE_IMAGE,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_ORIGIN}/#website`,
      name: SITE_NAME,
      url: SITE_ORIGIN,
      inLanguage: "zh-Hant",
      publisher: { "@id": `${SITE_ORIGIN}/#organization` },
      description: PUBLIC_ROUTE_SEO["/"].description,
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_ORIGIN}/#app`,
      name: SITE_NAME,
      alternateName: ["線上猜歌遊戲", "多人猜歌平台", "歌曲問答平台"],
      url: SITE_ORIGIN,
      applicationCategory: "GameApplication",
      operatingSystem: "Web",
      inLanguage: "zh-Hant",
      description: PUBLIC_ROUTE_SEO["/"].description,
      keywords: DEFAULT_KEYWORDS,
      image: SITE_IMAGE,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "TWD",
      },
    },
    {
      "@type": "WebPage",
      "@id": `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: seo.title,
      description: seo.description,
      isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: SITE_IMAGE,
      },
      inLanguage: "zh-Hant",
    },
  ];

  if (pathname === "/") {
    graph.push({
      "@type": "FAQPage",
      "@id": `${SITE_ORIGIN}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "Muizo 可以用來玩線上猜歌嗎？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "可以。Muizo 是多人即時猜歌平台，玩家可以建立房間、邀請朋友加入，透過歌曲片段進行猜歌遊戲。",
          },
        },
        {
          "@type": "Question",
          name: "Muizo 支援 YouTube 播放清單嗎？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "支援。登入 Google 後可以匯入 YouTube 播放清單，也可以建立平台收藏題庫，快速套用到猜歌房間。",
          },
        },
        {
          "@type": "Question",
          name: "Muizo 適合哪些場合？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "適合朋友聚會、線上派對、社群語音、直播互動與音樂主題活動，讓多人一起進行歌曲問答與排行榜競賽。",
          },
        },
      ],
    });
  }

  if (pathname === "/rooms") {
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${SITE_ORIGIN}/rooms#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Muizo",
          item: SITE_ORIGIN,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "線上猜歌房間",
          item: `${SITE_ORIGIN}/rooms`,
        },
      ],
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
};

export default function RouteSeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = resolveRouteSeo(pathname);
    const canonicalUrl = `${SITE_ORIGIN}${seo.canonicalPath}`;

    document.title = seo.title;
    setCanonical(canonicalUrl);
    setMeta(
      "meta[name=\"description\"]",
      "name",
      "description",
      seo.description,
    );
    setMeta(
      "meta[name=\"keywords\"]",
      "name",
      "keywords",
      seo.keywords ?? DEFAULT_KEYWORDS,
    );
    setMeta("meta[name=\"robots\"]", "name", "robots", seo.robots);
    setMeta("meta[name=\"author\"]", "name", "author", SITE_NAME);
    setMeta(
      "meta[property=\"og:type\"]",
      "property",
      "og:type",
      seo.ogType ?? "website",
    );
    setMeta("meta[property=\"og:url\"]", "property", "og:url", canonicalUrl);
    setMeta(
      "meta[property=\"og:site_name\"]",
      "property",
      "og:site_name",
      SITE_NAME,
    );
    setMeta("meta[property=\"og:title\"]", "property", "og:title", seo.title);
    setMeta(
      "meta[property=\"og:description\"]",
      "property",
      "og:description",
      seo.description,
    );
    setMeta("meta[property=\"og:image\"]", "property", "og:image", SITE_IMAGE);
    setMeta(
      "meta[property=\"og:image:width\"]",
      "property",
      "og:image:width",
      "1200",
    );
    setMeta(
      "meta[property=\"og:image:height\"]",
      "property",
      "og:image:height",
      "630",
    );
    setMeta(
      "meta[name=\"twitter:card\"]",
      "name",
      "twitter:card",
      "summary_large_image",
    );
    setMeta("meta[name=\"twitter:title\"]", "name", "twitter:title", seo.title);
    setMeta(
      "meta[name=\"twitter:description\"]",
      "name",
      "twitter:description",
      seo.description,
    );
    setMeta(
      "meta[name=\"twitter:image\"]",
      "name",
      "twitter:image",
      SITE_IMAGE,
    );
    setStructuredData(buildStructuredData(seo, pathname));
  }, [pathname]);

  return null;
}
