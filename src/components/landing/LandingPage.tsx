'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';

const fadeRise = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.07 * i,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

const steps = [
  {
    n: '01',
    title: 'Save',
    text: 'Capture an article, video, or thread the moment it catches your eye.',
  },
  {
    n: '02',
    title: 'Organize',
    text: 'Collections and tags keep topics findable without becoming another feed.',
  },
  {
    n: '03',
    title: 'Schedule',
    text: 'Block a quiet slot. Return with attention. Finish what you meant to read.',
  },
];

const features = [
  {
    title: 'A library, not a pile',
    body: 'Everything you save lives in one calm place. Less open-tab guilt. More return visits.',
  },
  {
    title: 'Time you can keep',
    body: 'Reading gets a place on the calendar, so important ideas stop competing with the scroll.',
  },
  {
    title: 'A digest, not a stream',
    body: 'Short briefings surface themes and takeaways so you choose what deserves your morning.',
  },
];

function Connector({ children }: { children: React.ReactNode }) {
  return (
    <div className="band band-paper">
      <p className="connector">{children}</p>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="site-header">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="relative z-10 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-ink text-paper">
              <BookOpen className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <span className="font-serif text-xl tracking-display text-ink">ScrollLater</span>
          </Link>

          <nav className="relative z-10 hidden items-center gap-8 text-sm text-ink-muted sm:flex">
            <a href="#how" className="link-underline decoration-transparent hover:decoration-ink">
              How it works
            </a>
            <a href="#features" className="link-underline decoration-transparent hover:decoration-ink">
              Why it helps
            </a>
            <Link href="/library" className="link-underline">
              Try the library
            </Link>
          </nav>

          <div className="relative z-10 flex items-center gap-5">
            <Link href="/login" className="link-underline text-sm">
              Sign in
            </Link>
            <Link
              href="/library"
              className="inline-flex items-center rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity duration-craft hover:opacity-90"
            >
              Open library
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="band band-paper">
          <div className="mx-auto max-w-6xl px-5 pb-12 pt-16 sm:px-8 sm:pb-16 sm:pt-20">
            <motion.p
              custom={0}
              variants={fadeRise}
              initial="hidden"
              animate="visible"
              className="mb-5 max-w-xl text-sm uppercase tracking-[0.16em] text-ink-subtle"
            >
              Quiet reading room
            </motion.p>

            <motion.h1
              custom={1}
              variants={fadeRise}
              initial="hidden"
              animate="visible"
              className="max-w-4xl font-serif text-4xl leading-[1.12] tracking-display text-ink text-balance sm:text-5xl md:text-6xl lg:text-[4.35rem]"
            >
              Save it. Schedule it.{' '}
              <em className="italic text-terracotta-500">Actually read it.</em>
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeRise}
              initial="hidden"
              animate="visible"
              className="mt-6 max-w-2xl font-sans text-lg leading-relaxed text-ink-muted sm:text-xl"
            >
              ScrollLater is a calm library for the internet. Save what matters, set time
              aside, and finish ideas instead of losing them to the pile.
            </motion.p>

            <motion.div
              custom={3}
              variants={fadeRise}
              initial="hidden"
              animate="visible"
              className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8"
            >
              <Link href="/library" className="btn-primary">
                Explore the demo library
              </Link>
              <Link href="/signup" className="link-underline text-sm font-medium">
                Create a free account
              </Link>
            </motion.div>
          </div>
        </section>

        <Connector>First, make a little room.</Connector>

        <section className="band band-warm">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 sm:py-20 md:grid-cols-2 md:gap-16">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-ink-subtle">In the library</p>
              <ul className="mt-8 divide-y divide-paper-deep/80">
                {[
                  { title: 'AI safety briefings', meta: '12 min' },
                  { title: 'React Server Components', meta: '8 min' },
                  { title: 'Weekend longreads', meta: '24 min' },
                ].map((item) => (
                  <li key={item.title} className="flex items-baseline justify-between gap-4 py-4">
                    <span className="font-serif text-xl tracking-display text-ink sm:text-2xl">
                      {item.title}
                    </span>
                    <span className="shrink-0 text-xs uppercase tracking-[0.12em] text-ink-faint">
                      {item.meta}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-6">
                <Link href="/library" className="link-underline text-sm">
                  Browse the full demo
                </Link>
              </p>
            </div>

            <div className="flex flex-col justify-center md:border-l md:border-paper-deep/80 md:pl-16">
              <p className="text-xs uppercase tracking-[0.16em] text-ink-subtle">Today</p>
              <h2 className="mt-4 font-serif text-3xl tracking-display text-ink text-balance sm:text-4xl">
                Forty quiet minutes. Three things worth finishing.
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-ink-muted">
                Your digest names the themes across what you saved, so the next session
                feels chosen, not crowded.
              </p>
            </div>
          </div>
        </section>

        <Connector>Then give reading a place to land.</Connector>

        <section id="how" className="band band-paper">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <p className="text-xs uppercase tracking-[0.16em] text-ink-subtle">How it works</p>
            <h2 className="mt-4 max-w-3xl font-serif text-3xl tracking-display text-ink sm:text-4xl md:text-5xl">
              Three gentle steps from save to done.
            </h2>

            <div className="mt-12 divide-y divide-paper-deep">
              {steps.map((step, i) => (
                <motion.div
                  key={step.n}
                  custom={i}
                  variants={fadeRise}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-40px' }}
                  className="grid gap-3 py-8 sm:grid-cols-[5rem_1fr] sm:gap-10"
                >
                  <p className="font-serif text-sm text-ink-faint">{step.n}</p>
                  <div>
                    <h3 className="font-serif text-2xl tracking-display text-ink">{step.title}</h3>
                    <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-muted">
                      {step.text}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <Connector>Built for attention, not for feeds.</Connector>

        <section id="features" className="band band-warm">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <p className="text-xs uppercase tracking-[0.16em] text-ink-subtle">Why ScrollLater</p>
            <h2 className="mt-4 max-w-3xl font-serif text-3xl tracking-display text-ink sm:text-4xl md:text-5xl">
              Made like a reading product, not a dashboard.
            </h2>

            <div className="mt-12 grid gap-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
              {features.map((feature, i) => (
                <motion.article
                  key={feature.title}
                  custom={i}
                  variants={fadeRise}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-40px' }}
                >
                  <h3 className="font-serif text-2xl tracking-display text-ink">{feature.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-ink-muted">{feature.body}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <Connector>When you are ready, begin.</Connector>

        <section className="band band-ink">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <h2 className="max-w-3xl font-serif text-3xl tracking-display text-paper sm:text-4xl md:text-5xl">
              Make room for the ideas you already care about.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-paper/70 sm:text-lg">
              Start with the interactive demo, or create an account and build your own quiet library.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
              <Link href="/library" className="btn-primary-inverse">
                Try the library
              </Link>
              <Link
                href="/signup"
                className="text-sm font-medium text-paper underline decoration-paper/30 underline-offset-[0.18em] transition-colors duration-craft hover:decoration-paper"
              >
                Sign up free
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="band band-paper border-t border-paper-deep">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-10 text-sm text-ink-subtle sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-ink-faint" />
            <span className="font-serif text-base text-ink">ScrollLater</span>
          </div>
          <p className="font-serif italic">Save it. Schedule it. Actually read it.</p>
          <div className="flex gap-6">
            <Link href="/library" className="link-underline">Library</Link>
            <Link href="/login" className="link-underline">Sign in</Link>
            <Link href="/signup" className="link-underline">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
