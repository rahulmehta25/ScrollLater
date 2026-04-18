export type ContentType = 'article' | 'video' | 'tweet' | 'reddit';

export interface DemoItem {
  id: string;
  type: ContentType;
  title: string;
  source: string;
  excerpt: string;
  savedAgo: string;
  readTimeMinutes: number;
  category: string;
  tags: string[];
  scheduledDate: string | null;
  isRead: boolean;
}

export interface Collection {
  id: string;
  name: string;
  color: string;
  dotColor: string;
}

export const collections: Collection[] = [
  { id: 'tech', name: 'Tech', color: 'text-blue-600 bg-blue-50', dotColor: 'bg-blue-500' },
  { id: 'ai', name: 'AI & ML', color: 'text-violet-600 bg-violet-50', dotColor: 'bg-violet-500' },
  { id: 'finance', name: 'Finance', color: 'text-emerald-600 bg-emerald-50', dotColor: 'bg-emerald-500' },
  { id: 'design', name: 'Design', color: 'text-pink-600 bg-pink-50', dotColor: 'bg-pink-500' },
  { id: 'science', name: 'Science', color: 'text-cyan-600 bg-cyan-50', dotColor: 'bg-cyan-500' },
  { id: 'productivity', name: 'Productivity', color: 'text-amber-600 bg-amber-50', dotColor: 'bg-amber-500' },
];

export const categoryThumbBg: Record<string, string> = {
  tech: 'bg-blue-50',
  ai: 'bg-violet-50',
  finance: 'bg-emerald-50',
  design: 'bg-pink-50',
  science: 'bg-cyan-50',
  productivity: 'bg-amber-50',
};

export const categoryThumbIcon: Record<string, string> = {
  tech: 'text-blue-400',
  ai: 'text-violet-400',
  finance: 'text-emerald-400',
  design: 'text-pink-400',
  science: 'text-cyan-400',
  productivity: 'text-amber-400',
};

export const categoryBadge: Record<string, string> = {
  tech: 'bg-blue-50 text-blue-700',
  ai: 'bg-violet-50 text-violet-700',
  finance: 'bg-emerald-50 text-emerald-700',
  design: 'bg-pink-50 text-pink-700',
  science: 'bg-cyan-50 text-cyan-700',
  productivity: 'bg-amber-50 text-amber-700',
};

export const demoItems: DemoItem[] = [
  {
    id: '1',
    type: 'article',
    title: 'The Future of React Server Components',
    source: 'vercel.com',
    excerpt: 'How Server Components are reshaping the React ecosystem, reducing client-side JavaScript by up to 60% while improving performance and developer experience.',
    savedAgo: '2 hours ago',
    readTimeMinutes: 8,
    category: 'tech',
    tags: ['react', 'nextjs', 'performance'],
    scheduledDate: '2026-03-09',
    isRead: false,
  },
  {
    id: '2',
    type: 'video',
    title: 'Building a $1M SaaS in 12 Months',
    source: 'YouTube',
    excerpt: 'A founder breaks down the exact steps, metrics, and pivots that took their SaaS from zero to $1M ARR in just one year.',
    savedAgo: '3 hours ago',
    readTimeMinutes: 24,
    category: 'finance',
    tags: ['saas', 'startup', 'revenue'],
    scheduledDate: '2026-03-08',
    isRead: false,
  },
  {
    id: '3',
    type: 'tweet',
    title: 'Sam Altman on AI Safety and Regulation Frameworks',
    source: '@sama',
    excerpt: 'Thread discussing the need for international AI safety standards and how the industry should self-regulate before governments step in.',
    savedAgo: '4 hours ago',
    readTimeMinutes: 3,
    category: 'ai',
    tags: ['ai-safety', 'regulation', 'openai'],
    scheduledDate: '2026-03-07',
    isRead: false,
  },
  {
    id: '4',
    type: 'article',
    title: 'Design Systems at Scale: Lessons from Figma',
    source: 'figma.com',
    excerpt: 'How Figma manages their internal design system across 200+ designers, including governance, component APIs, and migration strategies.',
    savedAgo: '5 hours ago',
    readTimeMinutes: 12,
    category: 'design',
    tags: ['design-systems', 'figma', 'components'],
    scheduledDate: '2026-03-10',
    isRead: false,
  },
  {
    id: '5',
    type: 'reddit',
    title: 'Why Rust is Taking Over Systems Programming',
    source: 'r/programming',
    excerpt: 'Discussion on how Rust adoption in production systems has grown 300% in the last two years, with case studies from major tech companies.',
    savedAgo: 'Yesterday',
    readTimeMinutes: 6,
    category: 'tech',
    tags: ['rust', 'systems', 'programming'],
    scheduledDate: null,
    isRead: false,
  },
  {
    id: '6',
    type: 'article',
    title: 'GPT-5: What We Know So Far About the Next Leap',
    source: 'openai.com',
    excerpt: 'Early benchmarks show 40% improvement in reasoning tasks, with new capabilities in multi-modal understanding and long-context processing.',
    savedAgo: 'Yesterday',
    readTimeMinutes: 15,
    category: 'ai',
    tags: ['gpt-5', 'llm', 'benchmarks'],
    scheduledDate: '2026-03-08',
    isRead: false,
  },
  {
    id: '7',
    type: 'video',
    title: 'Understanding Transformers from Scratch',
    source: 'YouTube',
    excerpt: '3Blue1Brown style visual explanation of attention mechanisms, positional encoding, and why transformers revolutionized NLP.',
    savedAgo: 'Yesterday',
    readTimeMinutes: 32,
    category: 'ai',
    tags: ['transformers', 'deep-learning', 'attention'],
    scheduledDate: '2026-03-11',
    isRead: false,
  },
  {
    id: '8',
    type: 'article',
    title: 'The Art of Raising a Series A in 2026',
    source: 'firstround.com',
    excerpt: 'Series A rounds are averaging $15M in 2026. Here is what VCs look for, common pitfalls, and how to structure your pitch for maximum impact.',
    savedAgo: '2 days ago',
    readTimeMinutes: 18,
    category: 'finance',
    tags: ['fundraising', 'series-a', 'venture-capital'],
    scheduledDate: '2026-03-10',
    isRead: false,
  },
  {
    id: '9',
    type: 'tweet',
    title: '10 Lessons from Scaling to $100M ARR',
    source: '@jasonfried',
    excerpt: 'Thread covering the counterintuitive decisions that helped Basecamp reach $100M ARR without venture funding or a traditional sales team.',
    savedAgo: '2 days ago',
    readTimeMinutes: 4,
    category: 'finance',
    tags: ['bootstrapping', 'scaling', 'basecamp'],
    scheduledDate: '2026-03-07',
    isRead: true,
  },
  {
    id: '10',
    type: 'article',
    title: 'Atomic Design Methodology: A Practical Guide',
    source: 'bradfrost.com',
    excerpt: 'Updated guide to building UIs from atoms to templates, with new patterns for React component architecture and design token integration.',
    savedAgo: '2 days ago',
    readTimeMinutes: 10,
    category: 'design',
    tags: ['atomic-design', 'methodology', 'ui'],
    scheduledDate: null,
    isRead: false,
  },
  {
    id: '11',
    type: 'reddit',
    title: 'Show HN: I Built an AI-Powered Code Editor',
    source: 'r/programming',
    excerpt: 'Open-source code editor with inline AI suggestions, automatic refactoring, and context-aware documentation generation.',
    savedAgo: '3 days ago',
    readTimeMinutes: 5,
    category: 'tech',
    tags: ['ai', 'code-editor', 'open-source'],
    scheduledDate: null,
    isRead: false,
  },
  {
    id: '12',
    type: 'article',
    title: 'CRISPR Gene Editing: 2026 Breakthroughs',
    source: 'nature.com',
    excerpt: 'First CRISPR therapy approved for a common genetic condition, marking a turning point in personalized medicine and gene therapy accessibility.',
    savedAgo: '3 days ago',
    readTimeMinutes: 20,
    category: 'science',
    tags: ['crispr', 'gene-editing', 'medicine'],
    scheduledDate: '2026-03-12',
    isRead: false,
  },
  {
    id: '13',
    type: 'video',
    title: 'The Complete Guide to Notion Databases',
    source: 'YouTube',
    excerpt: 'Master relations, rollups, formulas, and views. Build a complete project management system from scratch in Notion.',
    savedAgo: '4 days ago',
    readTimeMinutes: 18,
    category: 'productivity',
    tags: ['notion', 'databases', 'project-management'],
    scheduledDate: '2026-03-09',
    isRead: false,
  },
  {
    id: '14',
    type: 'article',
    title: 'Building a Personal Knowledge Management System',
    source: 'fortelabs.com',
    excerpt: 'The PARA method explained: how to organize digital information for actionability, with examples from top creators and researchers.',
    savedAgo: '4 days ago',
    readTimeMinutes: 14,
    category: 'productivity',
    tags: ['pkm', 'para', 'note-taking'],
    scheduledDate: null,
    isRead: true,
  },
  {
    id: '15',
    type: 'tweet',
    title: 'The State of Web Development in 2026',
    source: '@dan_abramov',
    excerpt: 'Thread analyzing how the web platform has evolved: native CSS nesting, View Transitions API, and the decline of client-side routing.',
    savedAgo: '5 days ago',
    readTimeMinutes: 3,
    category: 'tech',
    tags: ['web-dev', 'css', 'trends'],
    scheduledDate: '2026-03-07',
    isRead: false,
  },
  {
    id: '16',
    type: 'article',
    title: 'Quantum Computing: From Theory to Practice',
    source: 'arxiv.org',
    excerpt: 'Survey of current quantum computing capabilities, error correction advances, and realistic timelines for quantum advantage in practical applications.',
    savedAgo: '5 days ago',
    readTimeMinutes: 25,
    category: 'science',
    tags: ['quantum', 'computing', 'research'],
    scheduledDate: null,
    isRead: false,
  },
  {
    id: '17',
    type: 'reddit',
    title: 'Best Design Tools and Workflows in 2026',
    source: 'r/design',
    excerpt: 'Community poll results: Figma still leads but new AI-native tools are gaining ground. Discussion of emerging workflows and tool combinations.',
    savedAgo: '6 days ago',
    readTimeMinutes: 7,
    category: 'design',
    tags: ['tools', 'workflow', 'figma'],
    scheduledDate: null,
    isRead: true,
  },
  {
    id: '18',
    type: 'video',
    title: 'How to Read Research Papers Effectively',
    source: 'YouTube',
    excerpt: 'A PhD researcher shares their three-pass method for reading academic papers, with techniques for extracting key insights quickly.',
    savedAgo: '1 week ago',
    readTimeMinutes: 15,
    category: 'productivity',
    tags: ['research', 'reading', 'academic'],
    scheduledDate: '2026-03-08',
    isRead: false,
  },
];

export interface DigestCategory {
  category: string;
  label: string;
  itemCount: number;
  totalMinutes: number;
  keyTheme: string;
  keyTakeaway: string;
}

export const digestCategories: DigestCategory[] = [
  {
    category: 'ai',
    label: 'AI & Machine Learning',
    itemCount: 3,
    totalMinutes: 50,
    keyTheme: 'Language model advances and safety regulation',
    keyTakeaway: 'GPT-5 benchmarks show 40% improvement in reasoning tasks, while global AI safety frameworks gain momentum.',
  },
  {
    category: 'tech',
    label: 'Tech & Engineering',
    itemCount: 4,
    totalMinutes: 22,
    keyTheme: 'React ecosystem evolution and Rust adoption',
    keyTakeaway: 'Server Components reduce client JS by up to 60%. Rust adoption in production grew 300% in two years.',
  },
  {
    category: 'finance',
    label: 'Finance & Business',
    itemCount: 3,
    totalMinutes: 46,
    keyTheme: 'SaaS scaling strategies and fundraising trends',
    keyTakeaway: 'Series A rounds averaging $15M in 2026. Bootstrapped companies proving alternative paths to $100M.',
  },
  {
    category: 'design',
    label: 'Design',
    itemCount: 3,
    totalMinutes: 29,
    keyTheme: 'Design systems and AI-native tooling',
    keyTakeaway: 'Figma leads design tooling but AI-native tools are reshaping component design workflows.',
  },
  {
    category: 'science',
    label: 'Science',
    itemCount: 2,
    totalMinutes: 45,
    keyTheme: 'Gene editing breakthroughs and quantum computing',
    keyTakeaway: 'First CRISPR therapy approved for common genetic condition. Quantum error correction advances continue.',
  },
  {
    category: 'productivity',
    label: 'Productivity',
    itemCount: 3,
    totalMinutes: 47,
    keyTheme: 'Knowledge management and research methods',
    keyTakeaway: 'The PARA method and second brain approaches show 3x improvement in information retention.',
  },
];

export const scheduleDays = [
  { date: '2026-03-07', label: 'Today', dayName: 'Sat' },
  { date: '2026-03-08', label: 'Tomorrow', dayName: 'Sun' },
  { date: '2026-03-09', label: 'Mar 9', dayName: 'Mon' },
  { date: '2026-03-10', label: 'Mar 10', dayName: 'Tue' },
  { date: '2026-03-11', label: 'Mar 11', dayName: 'Wed' },
  { date: '2026-03-12', label: 'Mar 12', dayName: 'Thu' },
  { date: '2026-03-13', label: 'Mar 13', dayName: 'Fri' },
];
