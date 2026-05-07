"""
Whispero Nepal - Nested Reply System Tests
Tests for the new nested reply feature: parent_id, replies_count, reply endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestNestedRepliesBackend:
    """Tests for nested reply system - new feature"""
    
    @pytest.fixture
    def session_id(self):
        """Create a session for testing"""
        device_id = f"test_device_{uuid.uuid4()}"
        response = requests.post(f"{BASE_URL}/api/auth/session", json={"device_id": device_id})
        assert response.status_code == 200
        return response.json()["id"]
    
    @pytest.fixture
    def confession_id(self, session_id):
        """Create a confession for testing"""
        response = requests.post(
            f"{BASE_URL}/api/confessions",
            params={"text": f"TEST_nested_reply_confession_{uuid.uuid4()}", "category": "secrets"},
            headers={"X-Session-Id": session_id}
        )
        assert response.status_code == 200
        return response.json()["id"]
    
    # Test 1: POST /api/confessions/{id}/comments creates top-level comment with parent_id=null
    def test_create_top_level_comment_has_null_parent_id(self, session_id, confession_id):
        """Test that creating a comment via POST /confessions/{id}/comments has parent_id=null"""
        response = requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/comments",
            json={"text": f"TEST_top_level_comment_{uuid.uuid4()}"},
            headers={"X-Session-Id": session_id}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify comment structure
        assert "id" in data
        assert data["confession_id"] == confession_id
        assert data["parent_id"] is None, f"Expected parent_id=None for top-level comment, got {data.get('parent_id')}"
        assert "replies_count" in data
        assert data["replies_count"] == 0
        print(f"✓ Top-level comment created with parent_id=None: {data['id']}")
        return data["id"]
    
    # Test 2: POST /api/confessions/{id}/comments/{comment_id}/replies creates reply with correct parent_id
    def test_create_reply_has_correct_parent_id(self, session_id, confession_id):
        """Test that creating a reply sets correct parent_id"""
        # First create a top-level comment
        comment_response = requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/comments",
            json={"text": f"TEST_parent_comment_{uuid.uuid4()}"},
            headers={"X-Session-Id": session_id}
        )
        assert comment_response.status_code == 200
        parent_comment_id = comment_response.json()["id"]
        
        # Create a reply to that comment
        reply_response = requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/comments/{parent_comment_id}/replies",
            json={"text": f"TEST_reply_{uuid.uuid4()}"},
            headers={"X-Session-Id": session_id}
        )
        assert reply_response.status_code == 200
        reply_data = reply_response.json()
        
        # Verify reply structure
        assert "id" in reply_data
        assert reply_data["confession_id"] == confession_id
        assert reply_data["parent_id"] == parent_comment_id, f"Expected parent_id={parent_comment_id}, got {reply_data.get('parent_id')}"
        print(f"✓ Reply created with correct parent_id: {reply_data['id']} -> parent: {parent_comment_id}")
    
    # Test 3: GET /api/confessions/{id}/comments returns ONLY top-level comments (parent_id=null)
    def test_get_comments_returns_only_top_level(self, session_id, confession_id):
        """Test that GET /confessions/{id}/comments returns only top-level comments, not replies"""
        # Create a top-level comment
        comment_response = requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/comments",
            json={"text": f"TEST_top_level_for_filter_{uuid.uuid4()}"},
            headers={"X-Session-Id": session_id}
        )
        assert comment_response.status_code == 200
        parent_comment_id = comment_response.json()["id"]
        
        # Create a reply to that comment
        reply_response = requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/comments/{parent_comment_id}/replies",
            json={"text": f"TEST_reply_for_filter_{uuid.uuid4()}"},
            headers={"X-Session-Id": session_id}
        )
        assert reply_response.status_code == 200
        reply_id = reply_response.json()["id"]
        
        # Get comments - should only return top-level
        get_response = requests.get(f"{BASE_URL}/api/confessions/{confession_id}/comments")
        assert get_response.status_code == 200
        comments = get_response.json()
        
        # Verify all returned comments have parent_id=None
        for comment in comments:
            assert comment.get("parent_id") is None, f"Found reply in top-level comments: {comment['id']}"
        
        # Verify the reply is NOT in the list
        comment_ids = [c["id"] for c in comments]
        assert reply_id not in comment_ids, f"Reply {reply_id} should not be in top-level comments"
        assert parent_comment_id in comment_ids, f"Parent comment {parent_comment_id} should be in top-level comments"
        
        print(f"✓ GET comments returns only top-level: {len(comments)} comments, reply {reply_id} excluded")
    
    # Test 4: GET /api/confessions/{id}/comments/{comment_id}/replies returns only replies for that comment
    def test_get_replies_returns_only_replies_for_comment(self, session_id, confession_id):
        """Test that GET /confessions/{id}/comments/{comment_id}/replies returns only replies for that specific comment"""
        # Create two top-level comments
        comment1_response = requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/comments",
            json={"text": f"TEST_comment1_{uuid.uuid4()}"},
            headers={"X-Session-Id": session_id}
        )
        comment1_id = comment1_response.json()["id"]
        
        comment2_response = requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/comments",
            json={"text": f"TEST_comment2_{uuid.uuid4()}"},
            headers={"X-Session-Id": session_id}
        )
        comment2_id = comment2_response.json()["id"]
        
        # Create replies for comment1
        reply1_response = requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/comments/{comment1_id}/replies",
            json={"text": f"TEST_reply1_to_comment1_{uuid.uuid4()}"},
            headers={"X-Session-Id": session_id}
        )
        reply1_id = reply1_response.json()["id"]
        
        reply2_response = requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/comments/{comment1_id}/replies",
            json={"text": f"TEST_reply2_to_comment1_{uuid.uuid4()}"},
            headers={"X-Session-Id": session_id}
        )
        reply2_id = reply2_response.json()["id"]
        
        # Create reply for comment2
        reply3_response = requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/comments/{comment2_id}/replies",
            json={"text": f"TEST_reply_to_comment2_{uuid.uuid4()}"},
            headers={"X-Session-Id": session_id}
        )
        reply3_id = reply3_response.json()["id"]
        
        # Get replies for comment1
        get_replies_response = requests.get(
            f"{BASE_URL}/api/confessions/{confession_id}/comments/{comment1_id}/replies"
        )
        assert get_replies_response.status_code == 200
        replies = get_replies_response.json()
        
        # Verify only replies for comment1 are returned
        reply_ids = [r["id"] for r in replies]
        assert reply1_id in reply_ids, f"Reply1 {reply1_id} should be in replies for comment1"
        assert reply2_id in reply_ids, f"Reply2 {reply2_id} should be in replies for comment1"
        assert reply3_id not in reply_ids, f"Reply3 {reply3_id} should NOT be in replies for comment1"
        
        # Verify all replies have correct parent_id
        for reply in replies:
            assert reply["parent_id"] == comment1_id, f"Reply {reply['id']} has wrong parent_id"
        
        print(f"✓ GET replies returns only replies for specific comment: {len(replies)} replies for comment1")
    
    # Test 5: replies_count on parent comment increments when a reply is posted
    def test_replies_count_increments(self, session_id, confession_id):
        """Test that replies_count on parent comment increments when a reply is posted"""
        # Create a top-level comment
        comment_response = requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/comments",
            json={"text": f"TEST_count_parent_{uuid.uuid4()}"},
            headers={"X-Session-Id": session_id}
        )
        assert comment_response.status_code == 200
        parent_comment = comment_response.json()
        parent_comment_id = parent_comment["id"]
        initial_count = parent_comment.get("replies_count", 0)
        assert initial_count == 0, f"Initial replies_count should be 0, got {initial_count}"
        
        # Create first reply
        reply1_response = requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/comments/{parent_comment_id}/replies",
            json={"text": f"TEST_reply1_count_{uuid.uuid4()}"},
            headers={"X-Session-Id": session_id}
        )
        assert reply1_response.status_code == 200
        
        # Verify replies_count incremented by fetching replies
        get_replies_response = requests.get(
            f"{BASE_URL}/api/confessions/{confession_id}/comments/{parent_comment_id}/replies"
        )
        assert get_replies_response.status_code == 200
        replies_after_1 = get_replies_response.json()
        assert len(replies_after_1) == 1, f"Expected 1 reply, got {len(replies_after_1)}"
        
        # Create second reply
        reply2_response = requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/comments/{parent_comment_id}/replies",
            json={"text": f"TEST_reply2_count_{uuid.uuid4()}"},
            headers={"X-Session-Id": session_id}
        )
        assert reply2_response.status_code == 200
        
        # Verify replies_count is now 2
        get_replies_response2 = requests.get(
            f"{BASE_URL}/api/confessions/{confession_id}/comments/{parent_comment_id}/replies"
        )
        replies_after_2 = get_replies_response2.json()
        assert len(replies_after_2) == 2, f"Expected 2 replies, got {len(replies_after_2)}"
        
        # Also verify by getting top-level comments and checking replies_count field
        get_comments_response = requests.get(f"{BASE_URL}/api/confessions/{confession_id}/comments")
        comments = get_comments_response.json()
        parent_in_list = next((c for c in comments if c["id"] == parent_comment_id), None)
        assert parent_in_list is not None, "Parent comment not found in comments list"
        assert parent_in_list["replies_count"] == 2, f"Expected replies_count=2, got {parent_in_list['replies_count']}"
        
        print(f"✓ replies_count increments correctly: 0 -> 1 -> 2")
    
    # Test 6: Reply to non-existent comment returns 404
    def test_reply_to_nonexistent_comment_returns_404(self, session_id, confession_id):
        """Test that replying to a non-existent comment returns 404"""
        fake_comment_id = "nonexistent-comment-id-12345"
        
        response = requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/comments/{fake_comment_id}/replies",
            json={"text": "This should fail"},
            headers={"X-Session-Id": session_id}
        )
        assert response.status_code == 404
        print(f"✓ Reply to non-existent comment returns 404")
    
    # Test 7: Get replies for non-existent comment returns empty list (or 404)
    def test_get_replies_for_nonexistent_comment(self, session_id, confession_id):
        """Test getting replies for a non-existent comment"""
        fake_comment_id = "nonexistent-comment-id-67890"
        
        response = requests.get(
            f"{BASE_URL}/api/confessions/{confession_id}/comments/{fake_comment_id}/replies"
        )
        # Should return 200 with empty list or 404
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 0
            print(f"✓ Get replies for non-existent comment returns empty list")
        else:
            print(f"✓ Get replies for non-existent comment returns 404")
    
    # Test 8: Reply with nickname
    def test_reply_with_nickname(self, session_id, confession_id):
        """Test creating a reply with custom nickname"""
        # Create parent comment
        comment_response = requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/comments",
            json={"text": f"TEST_parent_nickname_{uuid.uuid4()}"},
            headers={"X-Session-Id": session_id}
        )
        parent_comment_id = comment_response.json()["id"]
        
        # Create reply with nickname
        reply_response = requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/comments/{parent_comment_id}/replies",
            json={"text": f"TEST_reply_nickname_{uuid.uuid4()}", "nickname": "TestReplyNickname"},
            headers={"X-Session-Id": session_id}
        )
        assert reply_response.status_code == 200
        reply_data = reply_response.json()
        assert reply_data["nickname"] == "TestReplyNickname"
        print(f"✓ Reply with custom nickname created: {reply_data['nickname']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
