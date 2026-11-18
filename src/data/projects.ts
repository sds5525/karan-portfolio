export interface Testimonial {
  source: string;
  quote: string;
  rating?: number;
}

export interface Credit {
  label: string;
  names: string[];
}

export interface MetaItem {
  label: string;
  value: string;
}

export interface ProjectLink {
  label: string;
  href: string;
}

export interface Project {
  slug: string;
  title: string;
  role: string[];
  year: number;
  tools: string[];
  hue: number;
  by: string;
  note: string;
  description: string;
  credits: Credit[];
  meta: MetaItem[];
  links: ProjectLink[];
  heroImage: string;
  quote: string;
  reel?: string;
  summary: string;
  recognition: string[];
  testimonials: Testimonial[];
}

export const projects: Project[] = [
  {
    slug: 'project-one',
    title: 'Project One',
    role: ['Design Lead'],
    year: 2026,
    tools: ['Figma', 'React'],
    hue: 18,
    by: 'Client name',
    note: 'A short line about the result',
    description:
      'Replace this with a paragraph about the project: the problem, your approach, and what shipped. Two or three sentences is plenty.',
    summary:
      'A holistic design overhaul creating an ultra-responsive design language, cutting design debt and accelerating shipped product features.',
    quote: 'SHAPING THE FUTURE OF INTERFACES',
    reel: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    heroImage: '/projects/project-one/hero.webp',
    credits: [
      { label: 'Role', names: ['Design Lead', 'Art Direction'] },
      { label: 'Client', names: ['Acme Labs'] },
      { label: 'Team', names: ['Karan S Achar', 'Studio Lab'] },
    ],
    meta: [
      { label: 'Year', value: '2026' },
      { label: 'Discipline', value: 'Product Design & Design Systems' },
      { label: 'Tools', value: 'Figma, React, TypeScript' },
      { label: 'Duration', value: '8 Weeks' },
    ],
    links: [
      { label: 'View live', href: 'https://example.com' },
      { label: 'Case study', href: 'https://example.com/case-study' },
    ],
    recognition: ['Awwwards Site of the Day', 'FWA of the Day'],
    testimonials: [
      {
        rating: 5,
        source: 'Acme Studio · Design Director',
        quote: 'A short line about the result',
      },
      {
        rating: 5,
        source: 'Engineering Lead',
        quote: 'Exceptional systems thinking and velocity',
      },
    ],
  },
  {
    slug: 'project-two',
    title: 'Project Two',
    role: ['Art Direction', 'Motion'],
    year: 2025,
    tools: ['After Effects', 'Blender'],
    hue: 200,
    by: 'Client name',
    note: 'A quote or result worth highlighting',
    description:
      'Describe the brief, the constraints, and the outcome. Add links to live work or case studies below.',
    summary:
      'Dynamic visual narratives and physics-driven 3D animation systems built to redefine spatial brand identities.',
    quote: 'MOMENTUM THROUGH MOTION AND FORM',
    heroImage: '/projects/project-two/hero.webp',
    credits: [
      { label: 'Role', names: ['Art Direction', '3D Motion Lead'] },
      { label: 'Client', names: ['Mono Studio'] },
      { label: 'Team', names: ['Karan S Achar', 'Render Co.'] },
    ],
    meta: [
      { label: 'Year', value: '2025' },
      { label: 'Discipline', value: '3D Art Direction & Motion Graphics' },
      { label: 'Tools', value: 'After Effects, Blender, Cycles' },
      { label: 'Duration', value: '6 Weeks' },
    ],
    links: [
      { label: 'View live', href: 'https://example.com' },
      { label: 'Case study', href: 'https://example.com/case-study' },
    ],
    recognition: ['Type Directors Club 2025', 'Motion Design Awards'],
    testimonials: [
      {
        rating: 5,
        source: 'Creative Director · Studio Mono',
        quote: 'A quote or result worth highlighting',
      },
      {
        rating: 5,
        source: 'Motion Producer',
        quote: 'Brought cinematic weight to the product narrative',
      },
    ],
  },
  {
    slug: 'project-three',
    title: 'Project Three',
    role: ['Full-stack Dev'],
    year: 2025,
    tools: ['Next.js', 'Postgres', 'Tailwind'],
    hue: 320,
    by: 'Client name',
    note: 'Shipped in six weeks',
    description:
      'Explain your role, the tech decisions you made, and the measurable impact.',
    summary:
      'Engineered a high-performance web platform with sub-second page loads, instant real-time sync, and scalable database architecture.',
    quote: 'BUILT FOR SCALE AND SPEED',
    reel: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    heroImage: '/projects/project-three/hero.webp',
    credits: [
      { label: 'Role', names: ['Full-stack Lead'] },
      { label: 'Client', names: ['FinTech Global'] },
      { label: 'Team', names: ['Karan S Achar', 'Infra Team'] },
    ],
    meta: [
      { label: 'Year', value: '2025' },
      { label: 'Discipline', value: 'Full-stack Engineering' },
      { label: 'Tools', value: 'Next.js, Postgres, Tailwind, Edge' },
      { label: 'Duration', value: '6 Weeks' },
    ],
    links: [
      { label: 'View live', href: 'https://example.com' },
      { label: 'Case study', href: 'https://example.com/case-study' },
    ],
    recognition: ['GitHub Trending Top 10', 'Product Hunt #1 Product of the Day'],
    testimonials: [
      {
        rating: 5,
        source: 'Head of Product',
        quote: 'Shipped in six weeks',
      },
      {
        rating: 5,
        source: 'VP Engineering',
        quote: 'Flawless execution from data schema to client bundle',
      },
    ],
  },
  {
    slug: 'project-four',
    title: 'Project Four',
    role: ['Brand Identity'],
    year: 2024,
    tools: ['Illustrator', 'Type design'],
    hue: 95,
    by: 'Client name',
    note: 'Identity for a new studio',
    description:
      'Share the story behind the identity system and how it was applied across touchpoints.',
    summary:
      'Crafted a bespoke typographic brand identity and editorial guidelines for an international architecture and design practice.',
    quote: 'DISTINCTIVE CHARACTERS CRAFTED WITH RESTRAINT',
    heroImage: '/projects/project-four/hero.webp',
    credits: [
      { label: 'Role', names: ['Lead Identity Designer', 'Type Designer'] },
      { label: 'Client', names: ['Atelier North'] },
      { label: 'Team', names: ['Karan S Achar', 'Foundry Friends'] },
    ],
    meta: [
      { label: 'Year', value: '2024' },
      { label: 'Discipline', value: 'Brand Identity & Custom Type' },
      { label: 'Tools', value: 'Illustrator, Glyphs, Indesign' },
      { label: 'Duration', value: '10 Weeks' },
    ],
    links: [
      { label: 'View live', href: 'https://example.com' },
      { label: 'Case study', href: 'https://example.com/case-study' },
    ],
    recognition: ['Brand New Award 2024', 'Tokyo TDC Annual Book'],
    testimonials: [
      {
        rating: 5,
        source: 'Founder & CEO',
        quote: 'Identity for a new studio',
      },
      {
        rating: 5,
        source: 'Creative Partner',
        quote: 'A bespoke typographic identity that stands out globally',
      },
    ],
  },
  {
    slug: 'project-five',
    title: 'Project Five',
    role: ['Product Design', 'Research'],
    year: 2023,
    tools: ['Figma', 'Maze'],
    hue: 260,
    by: 'Client name',
    note: 'Conversion up across the board',
    description:
      'Summarize the research, the redesign, and the numbers that moved.',
    summary:
      'End-to-end qualitative and quantitative UX research resulting in simplified user onboarding flows and a 42% bump in active retention.',
    quote: 'INTUITIVE WORKFLOWS ROOTED IN INSIGHT',
    heroImage: '/projects/project-five/hero.webp',
    credits: [
      { label: 'Role', names: ['Senior Product Designer', 'UX Researcher'] },
      { label: 'Client', names: ['SaaS Analytics Inc.'] },
      { label: 'Team', names: ['Karan S Achar', 'Growth Core'] },
    ],
    meta: [
      { label: 'Year', value: '2023' },
      { label: 'Discipline', value: 'User Research & Interface Design' },
      { label: 'Tools', value: 'Figma, Maze, Dovetail' },
      { label: 'Duration', value: '12 Weeks' },
    ],
    links: [
      { label: 'View live', href: 'https://example.com' },
      { label: 'Case study', href: 'https://example.com/case-study' },
    ],
    recognition: ['Fast Company Innovation by Design', 'UX Design Awards Nominee'],
    testimonials: [
      {
        rating: 5,
        source: 'VP Growth',
        quote: 'Conversion up across the board',
      },
      {
        rating: 5,
        source: 'Principal Researcher',
        quote: 'Groundbreaking redesign guided by rigorous user insight',
      },
    ],
  },
  {
    slug: 'project-six',
    title: 'Project Six',
    role: ['Creative Dev'],
    year: 2022,
    tools: ['WebGL', 'GSAP'],
    hue: 40,
    by: 'Client name',
    note: 'An experiment that took off',
    description:
      'Tell the story of this experiment and where people can see it.',
    summary:
      'An exploratory interactive WebGL experience blending volumetric particle systems, audio-reactive simulation, and fluid page transitions.',
    quote: 'EXPLORING THE EDGES OF CODE',
    heroImage: '/projects/project-six/hero.webp',
    credits: [
      { label: 'Role', names: ['Creative Developer'] },
      { label: 'Client', names: ['Digital Arts Guild'] },
      { label: 'Team', names: ['Karan S Achar'] },
    ],
    meta: [
      { label: 'Year', value: '2022' },
      { label: 'Discipline', value: 'Creative Development & WebGL' },
      { label: 'Tools', value: 'WebGL, Three.js, GSAP, GLSL' },
      { label: 'Duration', value: '4 Weeks' },
    ],
    links: [
      { label: 'View live', href: 'https://example.com' },
      { label: 'Case study', href: 'https://example.com/case-study' },
    ],
    recognition: ['Awwwards Experimental of the Year', 'CSSDA Special Kudos'],
    testimonials: [
      {
        rating: 5,
        source: 'Exhibition Curator',
        quote: 'An experiment that took off',
      },
      {
        rating: 5,
        source: 'Tech Lead',
        quote: 'Pushed real-time WebGL rendering to its highest level',
      },
    ],
  },
];
