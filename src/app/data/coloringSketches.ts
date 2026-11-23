// Prototype "Create & Color" library.
//
// This is a fixed, pre-made set of sketches — NOT live AI generation.
// Picking a category + character here just looks up one of these
// pre-made line-art images, so there's no per-use API cost.
//
// NOTE: these image URLs are hotlinked to OpenArt's CDN as a quick
// prototype. They work for testing the flow, but for production they
// should be downloaded and self-hosted (e.g. in /public or Supabase
// Storage) so the app doesn't depend on a third party's CDN staying up,
// and so the in-browser coloring tool doesn't risk CORS issues reading
// pixel data from a cross-origin image.

export interface ColoringCategory {
  id: string;
  label: string;
  question: string;
  icon: string;
}

export interface ColoringSketch {
  id: string;
  categoryId: string;
  name: string;
  imageUrl: string;
}

export const coloringCategories: ColoringCategory[] = [
  { id: 'birds', label: 'Birds', question: 'Do you like birds?', icon: '🦅' },
  { id: 'horses', label: 'Horses & Unicorns', question: 'Do you like horses?', icon: '🦄' },
  { id: 'fantasy', label: 'Fantasy Friends', question: 'Do you like fantasy friends?', icon: '🧚' },
];

export const coloringSketches: ColoringSketch[] = [
  {
    id: 'hawk',
    categoryId: 'birds',
    name: 'Hawk',
    imageUrl: 'https://cdn.openart.ai/openart-ai/production/2026-11/create-image/Q5D7VNSV2eKTngAbhtiM/image_1795471769385_2eca1dce_1795471769863_f710372e.jpg',
  },
  {
    id: 'parrot',
    categoryId: 'birds',
    name: 'Parrot',
    imageUrl: 'https://cdn.openart.ai/openart-ai/production/2026-11/create-image/Q5D7VNSV2eKTngAbhtiM/image_1795471769541_0a836fe7_1795471769578_3915590c.jpg',
  },
  {
    id: 'owl',
    categoryId: 'birds',
    name: 'Owl',
    imageUrl: 'https://cdn.openart.ai/openart-ai/production/2026-11/create-image/Q5D7VNSV2eKTngAbhtiM/image_1795471771024_70cd0cf1_1795471771041_5b1f4c39.jpg',
  },
  {
    id: 'horse',
    categoryId: 'horses',
    name: 'Horse',
    imageUrl: 'https://cdn.openart.ai/openart-ai/production/2026-11/create-image/Q5D7VNSV2eKTngAbhtiM/image_1795471772683_6767ef12_1795471774290_b0d99485.jpg',
  },
  {
    id: 'unicorn',
    categoryId: 'horses',
    name: 'Unicorn',
    imageUrl: 'https://cdn.openart.ai/openart-ai/production/2026-11/create-image/Q5D7VNSV2eKTngAbhtiM/image_1795471812569_0886c4c9_1795471812594_ecbff022.jpg',
  },
  {
    id: 'pegasus',
    categoryId: 'horses',
    name: 'Pegasus',
    imageUrl: 'https://cdn.openart.ai/openart-ai/production/2026-11/create-image/Q5D7VNSV2eKTngAbhtiM/image_1795471812521_17a891d1_1795471812543_8f52440a.jpg',
  },
  {
    id: 'fairy',
    categoryId: 'fantasy',
    name: 'Fairy',
    imageUrl: 'https://cdn.openart.ai/openart-ai/production/2026-11/create-image/Q5D7VNSV2eKTngAbhtiM/image_1795471814738_f08c2d52_1795471814779_03238ebd.jpg',
  },
  {
    id: 'dragon',
    categoryId: 'fantasy',
    name: 'Dragon',
    imageUrl: 'https://cdn.openart.ai/openart-ai/production/2026-11/create-image/Q5D7VNSV2eKTngAbhtiM/image_1795471815240_afb95e65_1795471815259_50faaa20.jpg',
  },
  {
    id: 'mermaid',
    categoryId: 'fantasy',
    name: 'Mermaid',
    imageUrl: 'https://cdn.openart.ai/openart-ai/production/2026-11/create-image/Q5D7VNSV2eKTngAbhtiM/image_1795471849261_37acecf7_1795471849301_04c3d4d1.jpg',
  },
];

export function getSketchesByCategory(categoryId: string): ColoringSketch[] {
  return coloringSketches.filter((s) => s.categoryId === categoryId);
}

export function getSketchById(id: string): ColoringSketch | undefined {
  return coloringSketches.find((s) => s.id === id);
}
