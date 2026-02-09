import json
import os
import time
from typing import List, Dict

class CommunityService:
    def __init__(self, data_file="community_data.json"):
        self.data_file = os.path.join(os.path.dirname(__file__), data_file)
        self.posts = self._load_data()

    def _load_data(self) -> List[Dict]:
        if not os.path.exists(self.data_file):
            return []
        try:
            with open(self.data_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading community data: {e}")
            return []

    def _save_data(self):
        try:
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(self.posts, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving community data: {e}")

    def get_posts(self) -> List[Dict]:
        # Return posts sorted by timestamp descending (newest first)
        return sorted(self.posts, key=lambda x: x['timestamp'], reverse=True)

    def create_post(self, author: str, content: str) -> Dict:
        new_post = {
            "id": str(int(time.time() * 1000)), # Simple ID based on timestamp
            "author": author,
            "content": content,
            "timestamp": time.time(),
            "likes": 0
        }
        self.posts.append(new_post)
        self._save_data()
        return new_post

    def like_post(self, post_id: str) -> Dict:
        for post in self.posts:
            if post['id'] == post_id:
                post['likes'] += 1
                self._save_data()
                return post
        return None

# Singleton instance
community_service = CommunityService()
