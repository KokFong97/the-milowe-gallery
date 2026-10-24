import type { MilloweSubmission } from "./millowe-types";

export function compareJudgingPhotos(a: MilloweSubmission, b: MilloweSubmission) {
  return Number(b.isWinner) - Number(a.isWinner)
    || Number(b.isFinalist) - Number(a.isFinalist)
    || b.likeCount - a.likeCount
    || a.createdAt.localeCompare(b.createdAt)
    || a.id.localeCompare(b.id);
}
