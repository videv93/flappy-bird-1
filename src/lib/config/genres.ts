export const GENRES = [
  'Fiction',
  'Non-Fiction',
  'Mystery',
  'Science Fiction',
  'Fantasy',
  'Romance',
  'Thriller',
  'Biography',
  'History',
  'Self-Help',
  'Business',
  'Science',
  'Technology',
  'Poetry',
  'Comics & Graphic Novels',
] as const;

export type Genre = (typeof GENRES)[number];
