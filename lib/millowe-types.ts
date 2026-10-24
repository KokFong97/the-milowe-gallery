export type EventStatus = "collecting" | "voting" | "judging" | "closed";
export type SubmissionStatus = "approved" | "hidden";

export type MilloweCategory = {
  id: string;
  eventId: string;
  title: string;
  prompt: string;
  icon: string;
  sortOrder: number;
  active: boolean;
  submissionCount?: number;
};

export type MilloweSubmission = {
  id: string;
  eventId: string;
  categoryId: string;
  guestName: string;
  caption: string;
  status: SubmissionStatus;
  isFinalist: boolean;
  isWinner: boolean;
  createdAt: string;
  imageUrl: string;
  likeCount: number;
  likedByMe: boolean;
};

export type MilloweEvent = {
  id: string;
  code: string;
  title: string;
  eventDate: string | null;
  location: string;
  status: EventStatus;
  judgingCategoryId: string | null;
  createdAt: string;
};

export type EventSnapshot = {
  spotlight: { photoId: string; expiresAt: number } | null;
  slideshow: { seconds: number; photos: { id: string; url: string }[] };
  event: MilloweEvent;
  categories: MilloweCategory[];
  submissions: MilloweSubmission[];
};

