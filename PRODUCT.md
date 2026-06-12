# Muizo Product Context

## Register

product

## Product Purpose

Muizo is a browser-based multiplayer music quiz app. Players create or join rooms, answer from short music clips, and review scores, rankings, and match history after each game.

The product should make online music guessing feel easy to start, fast to operate, and social enough for friends, Discord calls, livestreams, and remote parties.

## Primary Users

- Friends who want a lightweight music party game without setup friction.
- Hosts who curate YouTube playlists or platform collections into quiz rooms.
- Players who care about rankings, history, and repeat sessions across devices.
- Community or livestream organizers who need a predictable room flow.

## Core Jobs

- Create or join a music quiz room.
- Import or select song sources, especially YouTube playlists and saved collections.
- Play real-time rounds with clear answer states, timing, score feedback, and rankings.
- Save account-bound progress, collections, and career history.
- Share rooms and collections without exposing private or edit-only routes.

## Current Product Direction

Muizo is moving toward account-first usage. Guest entry should not be promoted in public onboarding. Login and registration should feel like the normal first step because many valuable features depend on identity: collections, YouTube imports, cross-device history, rankings, and profile data.

Google login is useful for YouTube access, but the auth surface must also support Email login and registration. Any header or menu login entry should lead to the full auth choice, not directly to Google.

## Brand Personality

- Direct, energetic, and social.
- Music-first, but not nightclub-generic.
- Friendly to casual players, precise enough for room hosts.
- Uses Traditional Chinese UI copy by default.

## Design Principles

- The first screen is an app entry point, not a marketing brochure.
- Account actions should be obvious, trustworthy, and complete.
- Realtime room surfaces should prioritize status, controls, and legibility.
- Visual effects can create atmosphere, but gameplay and form input must stay clear.
- Avoid UI that looks like a generic AI-generated SaaS landing page.

## Anti-References

- Generic purple/blue gradient SaaS pages.
- Overdecorated cards, stat strips, and floating dashboard mockups.
- Login buttons that only support Google when Email auth exists.
- Guest-first onboarding.
- Heavy glassmorphism everywhere. Glass or liquid material should be localized to important surfaces.
- Marketing copy that repeats what the heading already says.

## Content Rules

- Preserve Traditional Chinese copy unless a rewrite is explicitly requested.
- Keep labels short and action-oriented.
- Use "登入", "註冊", "建立房間", "加入房間", "題庫", "收藏庫", and "生涯紀錄" consistently.
- Avoid bilingual labels unless the secondary language has a clear purpose.
- Do not mention implementation details in UI copy.

## Technical Scope Notes

- This repository is the frontend app only.
- Frontend auth flows include Google, Email login, Email registration, password reset, and email verification resend.
- Public-facing route changes must consider `index.html`, `public/robots.txt`, and `public/sitemap.xml`.
- Private, edit, invite, and account-bound routes should not be added to sitemap entries.
