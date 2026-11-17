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
    description: 'Replace this with a paragraph about the project: the problem, your approach, and what shipped. Two or three sentences is plenty.',
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
    description: 'Describe the brief, the constraints, and the outcome. Add links to live work or case studies below.',
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
    description: 'Explain your role, the tech decisions you made, and the measurable impact.',
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
    description: 'Share the story behind the identity system and how it was applied across touchpoints.',
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
    description: 'Summarize the research, the redesign, and the numbers that moved.',
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
    description: 'Tell the story of this experiment and where people can see it.',
  },
];

