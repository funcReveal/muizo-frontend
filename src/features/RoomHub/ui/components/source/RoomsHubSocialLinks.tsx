const socialLinks = [
  {
    key: "discord",
    label: "Discord",
    title: "Discord",
    href: import.meta.env.VITE_DISCORD_INVITE_URL?.trim() ?? "",
    iconSrc: "/brand-icons/Discord-Symbol-Blurple.svg",
  },
  {
    key: "threads",
    label: "Threads",
    title: "Threads",
    href: import.meta.env.VITE_THREADS_URL?.trim() ?? "",
    iconSrc: "/brand-icons/threads-logo-white.svg",
  },
];

const RoomsHubSocialLinks = () => (
  <div className="mb-2 flex items-center gap-2">
    {socialLinks.map((item) =>
      item.href ? (
        <a
          key={item.key}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          title={item.title}
          aria-label={item.title}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-cyan-100/85 transition hover:text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35"
        >
          <img
            src={item.iconSrc}
            alt=""
            className="h-4 w-4 object-contain"
            aria-hidden="true"
          />
        </a>
      ) : (
        <span
          key={item.key}
          title={`${item.title} 連結尚未設定`}
          aria-label={`${item.title} 連結尚未設定`}
          className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-full text-slate-500"
        >
          <img
            src={item.iconSrc}
            alt=""
            className="h-4 w-4 object-contain opacity-40 grayscale"
            aria-hidden="true"
          />
        </span>
      ),
    )}
  </div>
);

export default RoomsHubSocialLinks;
