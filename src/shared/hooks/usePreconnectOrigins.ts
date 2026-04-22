import { useEffect } from "react";

type PreconnectOrigin = {
  href: string;
  crossOrigin?: "" | "anonymous" | "use-credentials";
};

export function usePreconnectOrigins(origins: PreconnectOrigin[]) {
  useEffect(() => {
    const addedLinks: HTMLLinkElement[] = [];

    origins.forEach(({ href, crossOrigin }) => {
      const existing = document.head.querySelector<HTMLLinkElement>(
        `link[rel="preconnect"][href="${href}"]`,
      );
      if (existing) return;

      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = href;
      if (crossOrigin !== undefined) {
        link.crossOrigin = crossOrigin;
      }
      document.head.appendChild(link);
      addedLinks.push(link);
    });

    return () => {
      addedLinks.forEach((link) => {
        if (link.parentNode === document.head) {
          document.head.removeChild(link);
        }
      });
    };
  }, [origins]);
}
