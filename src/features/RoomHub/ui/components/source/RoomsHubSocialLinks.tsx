import "./sourceNavigation.css";

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

const RoomsHubSocialLinks = () => {
  const availableLinks = socialLinks.filter((item) => item.href);
  if (!availableLinks.length) return null;
  return (
  <div className="hub-source-community">
    <div>
    {availableLinks.map((item) => (
        <a
          key={item.key}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          title={item.title}
          aria-label={item.title}
          className="hub-source-community__link"
        >
          <img
            src={item.iconSrc}
            alt=""
            aria-hidden="true"
          />
          <span>{item.label}</span>
        </a>
      ))}
    </div>
  </div>
);
};

export default RoomsHubSocialLinks;
