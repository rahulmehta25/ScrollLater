'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bookmark,
  Calendar,
  Clock,
  Sparkles,
  BookOpen,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.08 * i,
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

const features = [
  {
    icon: Bookmark,
    title: 'Save without the pile-up',
    body: 'Capture articles, videos, and threads in one calm library. No cluttered tabs. No forgotten bookmarks.',
  },
  {
    icon: Calendar,
    title: 'Schedule reading like meetings',
    body: 'Block time for what matters. ScrollLater helps you return to ideas when you actually have attention.',
  },
  {
    icon: Sparkles,
    title: 'A digest, not a feed',
    body: 'Start each day with a short briefing of themes and takeaways, so you choose thoughtfully instead of scrolling.',
  },
];

const steps = [
  { n: '01', title: 'Save', text: 'Drop a link from your browser, phone, or extension.' },
  { n: '02', title: 'Organize', text: 'Collections and tags keep topics easy to find later.' },
  { n: '03', title: 'Schedule', text: 'Pick a slot. Show up. Finish what you meant to read.' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-paper-deep/80 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-paper-raised transition-transform duration-300 ease-calm group-hover:scale-105">
              <BookOpen className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <span className="font-serif text-xl tracking-display text-ink">ScrollLater</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-ink-muted sm:flex">
            <a href="#how" className="transition-colors hover:text-ink">How it works</a>
            <a href="#features" className="transition-colors hover:text-ink">Features</a>
            <Link href="/library" className="transition-colors hover:text-ink">Try the library</Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-full px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              href="/library"
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper-raised transition-all duration-300 ease-calm hover:bg-ink/90 hover:shadow-soft"
            >
              Open library
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(232,196,176,0.35),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(205,211,184,0.28),_transparent_50%)]"
          />
          <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
            <motion.p
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mb-6 text-xs font-medium uppercase tracking-[0.18em] text-terracotta-600"
            >
              A quiet reading room for the internet
            </motion.p>

            <motion.h1
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="max-w-4xl font-serif text-4xl leading-[1.12] tracking-display text-ink text-balance sm:text-5xl md:text-6xl lg:text-[4.25rem]"
            >
              Save it. Schedule it.{' '}
              <em className="italic text-terracotta-600">Actually read it.</em>
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-7 max-w-2xl text-lg leading-relaxed text-ink-muted sm:text-xl"
            >
              ScrollLater turns the open-tab guilt pile into a calm library with time set aside
              to finish what you save. Thoughtful by design. Quiet by default.
            </motion.p>

            <motion.div
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Link
                href="/library"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-terracotta-500 px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-all duration-300 ease-calm hover:bg-terracotta-600"
              >
                Explore the demo library
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-paper-deep bg-paper-raised px-6 py-3.5 text-sm font-medium text-ink transition-all duration-300 ease-calm hover:border-ink-faint hover:shadow-soft"
              >
                Create a free account
              </Link>
            </motion.div>

            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-14 grid max-w-3xl grid-cols-3 gap-6 border-t border-paper-deep pt-8"
            >
              {[
                { label: 'Calm focus', value: 'Not another feed' },
                { label: 'Scheduled reading', value: 'Time you keep' },
                { label: 'AI digest', value: 'Themes, not noise' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-serif text-lg text-ink sm:text-xl">{stat.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-subtle">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="border-y border-paper-deep bg-paper-raised">
          <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
            <div className="overflow-hidden rounded-3xl border border-paper-deep bg-paper shadow-soft">
              <div className="flex items-center gap-2 border-b border-paper-deep px-5 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-terracotta-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-olive-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-paper-deep" />
                <span className="ml-3 text-xs text-ink-subtle">Your library preview</span>
              </div>
              <div className="grid gap-0 md:grid-cols-[1fr_1.2fr]">
                <div className="space-y-3 border-b border-paper-deep p-5 md:border-b-0 md:border-r">
                  {['AI safety briefings', 'React Server Components', 'Weekend longreads'].map((item, i) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-paper-deep bg-paper-soft p-4 transition-colors hover:bg-paper-muted/60"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-ink">{item}</p>
                          <p className="mt-1 text-xs text-ink-subtle">Saved for focused reading</p>
                        </div>
                        <Clock className="mt-0.5 h-3.5 w-3.5 text-ink-faint" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col justify-between p-6 sm:p-8">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-olive-600">Today</p>
                    <h2 className="mt-3 font-serif text-3xl tracking-display text-ink sm:text-4xl">
                      Forty quiet minutes.
                      <br />
                      Three things worth finishing.
                    </h2>
                    <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-muted">
                      Your digest surfaces themes across what you saved, so the next session
                      feels intentional instead of overwhelming.
                    </p>
                  </div>
                  <div className="mt-8 flex items-center gap-3 text-sm text-ink-muted">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-olive-50 text-olive-600">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    Smart digest ready for this morning
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-terracotta-600">How it works</p>
            <h2 className="mt-4 font-serif text-3xl tracking-display text-ink sm:text-4xl md:text-5xl">
              Three gentle steps from save to done.
            </h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={step.n}
                className="animate-fade-in-up rounded-3xl border border-paper-deep bg-paper-raised p-7 shadow-soft"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <p className="font-serif text-sm text-terracotta-500">{step.n}</p>
                <h3 className="mt-4 font-serif text-2xl tracking-display text-ink">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="border-t border-paper-deep bg-paper-soft/70">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-olive-600">Why ScrollLater</p>
              <h2 className="mt-4 font-serif text-3xl tracking-display text-ink sm:text-4xl md:text-5xl">
                Built like a reading product, not a dashboard.
              </h2>
            </div>
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title} className="group">
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-paper-deep bg-paper-raised text-terracotta-600 shadow-soft transition-transform duration-300 ease-calm group-hover:-translate-y-0.5">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-serif text-2xl tracking-display text-ink">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink-muted">{feature.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="relative overflow-hidden rounded-[2rem] border border-paper-deep bg-ink px-8 py-14 text-paper-raised sm:px-14 sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-terracotta-500/20 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-olive-500/15 blur-3xl"
            />
            <div className="relative max-w-2xl">
              <h2 className="font-serif text-3xl tracking-display sm:text-4xl md:text-5xl">
                Make room for the ideas you already care about.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-paper-deep sm:text-lg">
                Start with the interactive demo, or create an account and build your own quiet library.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/library"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-paper-raised px-6 py-3.5 text-sm font-semibold text-ink transition-all duration-300 ease-calm hover:bg-white"
                >
                  Try the library
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3.5 text-sm font-medium text-paper-raised transition-colors hover:bg-white/5"
                >
                  Sign up free
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-paper-deep">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-ink-subtle sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-ink-faint" />
            <span className="font-serif text-base text-ink">ScrollLater</span>
          </div>
          <p>Save it. Schedule it. Actually read it.</p>
          <div className="flex gap-5">
            <Link href="/library" className="hover:text-ink transition-colors">Library</Link>
            <Link href="/login" className="hover:text-ink transition-colors">Sign in</Link>
            <Link href="/signup" className="hover:text-ink transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
