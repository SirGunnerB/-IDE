interface CodeReview {
  id: string;
  title: string;
  description: string;
  author: string;
  reviewers: string[];
  files: ReviewFile[];
  comments: ReviewComment[];
  status: ReviewStatus;
  created: Date;
  updated: Date;
}

interface ReviewFile {
  path: string;
  changes: {
    oldContent: string;
    newContent: string;
    hunks: DiffHunk[];
  };
}

interface ReviewComment {
  id: string;
  author: string;
  content: string;
  line: number;
  file: string;
  replies: ReviewComment[];
}

export class CodeReviewService {
  private reviews: Map<string, CodeReview> = new Map();
  private subscribers: Set<(review: CodeReview) => void> = new Set();

  async createReview(files: string[]): Promise<CodeReview> {
    const review: CodeReview = {
      id: crypto.randomUUID(),
      title: await this.generateReviewTitle(),
      description: '',
      author: await this.getCurrentUser(),
      reviewers: [],
      files: await this.prepareReviewFiles(files),
      comments: [],
      status: 'open',
      created: new Date(),
      updated: new Date()
    };

    await this.saveReview(review);
    this.notifySubscribers(review);
    return review;
  }

  async addComment(reviewId: string, comment: Omit<ReviewComment, 'id'>) {
    const review = this.reviews.get(reviewId);
    if (!review) throw new Error('Review not found');

    const newComment = {
      id: crypto.randomUUID(),
      ...comment,
      timestamp: new Date()
    };

    review.comments.push(newComment);
    review.updated = new Date();

    await this.saveReview(review);
    await this.notifyReviewers(review, newComment);
  }
} 