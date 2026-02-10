import time
from typing import List, Dict
from sqlalchemy.orm import Session, joinedload
from models import Post, User

class CommunityService:
    def get_posts(self, db: Session) -> List[Post]:
        # Return posts sorted by timestamp descending, eager loading author
        return db.query(Post).options(joinedload(Post.author)).order_by(Post.timestamp.desc()).all()

    def create_post(self, db: Session, author_id: int, content: str) -> Post:
        new_post = Post(
            author_id=author_id,
            content=content,
            likes=0
        )
        try:
            db.add(new_post)
            db.commit()
            db.refresh(new_post)
            return new_post
        except Exception as e:
            db.rollback()
            print(f"Error creating post: {e}")
            return None

    def like_post(self, db: Session, post_id: int) -> Post:
        post = db.query(Post).filter(Post.id == post_id).first()
        if post:
            post.likes += 1
            db.commit()
            db.refresh(post)
            return post
        return None

# Singleton instance
community_service = CommunityService()
