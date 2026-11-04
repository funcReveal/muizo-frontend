import LandingFeatureArtwork from "./LandingFeatureArtwork";
import {useEffect, useRef, useState} from "react";
import {useReducedMotion} from "motion/react";

const features = [
  {kind: "live", title: "搶答拚排名"},
  {kind: "library", title: "歌單變題庫"},
  {kind: "play", title: "設定你的玩法"},
] as const;

export default function LandingFeatures() {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= .35), {threshold: [0,.35]});
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const reduceMotion = useReducedMotion();
  const select = (index: number) => {
    const element = track.current;
    const card = element?.children[index] as HTMLElement | undefined;
    const first = element?.children[0] as HTMLElement | undefined;
    if (!element || !card || !first) return;
    element.scrollTo({left: card.offsetLeft - first.offsetLeft, behavior: reduceMotion ? "instant" : "smooth"});
  };
  return <section className="landing-features" aria-label="Muizo 特色">
    <h2 className="landing-features-heading">猜歌、出題、玩法一次掌握</h2>
    <div className="landing-hero-proof" ref={track} tabIndex={0} role="group" aria-label="功能演示" onKeyDown={(event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      select(event.key === "Home" ? 0 : event.key === "End" ? features.length - 1 : Math.max(0,Math.min(features.length - 1, active + (event.key === "ArrowRight" ? 1 : -1))));
    }} onScroll={() => {
      const element = track.current;
      if (!element) return;
      const cards = Array.from(element.children) as HTMLElement[];
      const first = cards[0];
      if (!first) return;
      const distances = cards.map(card => Math.abs(card.offsetLeft - first.offsetLeft - element.scrollLeft));
      setActive(distances.indexOf(Math.min(...distances)));
    }}>
      {features.map(({kind, title}, index) => <article className="landing-feature-card" key={kind} data-playing={inView && active === index}>
        <div className="landing-feature-copy"><h3>{title}</h3></div>
        <LandingFeatureArtwork kind={kind} />
      </article>)}
    </div>
    <div className="landing-feature-pagination" role="group" aria-label="特色卡片切換">
      {features.map(({kind,title},index) => <button type="button" key={kind} aria-label={`查看${title}`} aria-pressed={active === index} onClick={() => select(index)}><span /></button>)}
    </div>
  </section>;
}
