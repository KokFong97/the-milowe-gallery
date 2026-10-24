export type SlideshowPhoto = { id: string; url: string };
export const defaultSlideshowPhotos = [
  "000040450024.jpg",
  "8AE77C43-FA3F-47DD-BBB8-F420A9BA3B3F.JPG",
  "DSC03756-1.jpg",
  "DSC03848.jpg",
  "DSC03858-1.jpg",
  "F5230010.JPG",
  "IMG_0276.jpg",
  "photo_2025-05-05_11-50-16.jpg",
].map((name) => ({ id: name, url: `/wedding-photos/${name}` }));
