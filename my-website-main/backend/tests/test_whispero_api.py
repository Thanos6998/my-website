"""
Whispero Nepal API Tests
Tests for confession platform: sessions, confessions, comments, reactions, admin
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasicEndpoints:
    """Basic API health and root endpoint tests"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ API root: {data['message']}")
    
    def test_online_count(self):
        """Test online count endpoint"""
        response = requests.get(f"{BASE_URL}/api/online-count")
        assert response.status_code == 200
        data = response.json()
        assert "online" in data
        assert "waiting" in data
        print(f"✓ Online count: {data}")


class TestSessionManagement:
    """Session creation and management tests"""
    
    def test_create_session(self):
        """Test session creation"""
        device_id = f"test_device_{uuid.uuid4()}"
        response = requests.post(f"{BASE_URL}/api/auth/session", json={"device_id": device_id})
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["device_id"] == device_id
        print(f"✓ Session created: {data['id']}")
        return data["id"]
    
    def test_session_idempotent(self):
        """Test that same device_id returns same session"""
        device_id = f"test_device_idempotent_{uuid.uuid4()}"
        
        # First request
        response1 = requests.post(f"{BASE_URL}/api/auth/session", json={"device_id": device_id})
        assert response1.status_code == 200
        session1 = response1.json()
        
        # Second request with same device_id
        response2 = requests.post(f"{BASE_URL}/api/auth/session", json={"device_id": device_id})
        assert response2.status_code == 200
        session2 = response2.json()
        
        assert session1["id"] == session2["id"]
        print(f"✓ Session idempotent: same device_id returns same session")


class TestConfessions:
    """Confession CRUD tests"""
    
    @pytest.fixture
    def session_id(self):
        """Create a session for testing"""
        device_id = f"test_device_{uuid.uuid4()}"
        response = requests.post(f"{BASE_URL}/api/auth/session", json={"device_id": device_id})
        return response.json()["id"]
    
    def test_get_confessions(self):
        """Test getting confessions list"""
        response = requests.get(f"{BASE_URL}/api/confessions", params={"limit": 5})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} confessions")
    
    def test_get_confessions_with_category_filter(self):
        """Test getting confessions with category filter"""
        response = requests.get(f"{BASE_URL}/api/confessions", params={"category": "love", "limit": 5})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for confession in data:
            assert confession["category"] == "love"
        print(f"✓ Category filter works: {len(data)} love confessions")
    
    def test_get_confessions_trending_sort(self):
        """Test getting confessions sorted by trending"""
        response = requests.get(f"{BASE_URL}/api/confessions", params={"sort": "trending", "limit": 5})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Trending sort works: {len(data)} confessions")
    
    def test_create_confession(self, session_id):
        """Test creating a confession"""
        response = requests.post(
            f"{BASE_URL}/api/confessions",
            params={
                "text": f"TEST_confession_{uuid.uuid4()}",
                "category": "secrets",
                "is_adult": False
            },
            headers={"X-Session-Id": session_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["category"] == "secrets"
        assert data["session_id"] == session_id
        print(f"✓ Confession created: {data['id']}")
        return data["id"]
    
    def test_create_confession_with_nickname(self, session_id):
        """Test creating a confession with custom nickname"""
        response = requests.post(
            f"{BASE_URL}/api/confessions",
            params={
                "text": f"TEST_confession_nickname_{uuid.uuid4()}",
                "category": "life",
                "nickname": "TestNickname"
            },
            headers={"X-Session-Id": session_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["nickname"] == "TestNickname"
        print(f"✓ Confession with nickname created")
    
    def test_get_single_confession(self, session_id):
        """Test getting a single confession by ID"""
        # First create a confession
        create_response = requests.post(
            f"{BASE_URL}/api/confessions",
            params={"text": f"TEST_single_{uuid.uuid4()}", "category": "college"},
            headers={"X-Session-Id": session_id}
        )
        confession_id = create_response.json()["id"]
        
        # Then get it
        response = requests.get(f"{BASE_URL}/api/confessions/{confession_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == confession_id
        print(f"✓ Single confession retrieved: {confession_id}")
    
    def test_get_nonexistent_confession(self):
        """Test getting a non-existent confession returns 404"""
        response = requests.get(f"{BASE_URL}/api/confessions/nonexistent-id-12345")
        assert response.status_code == 404
        print(f"✓ Non-existent confession returns 404")
    
    def test_create_confession_invalid_session(self):
        """Test creating confession with invalid session fails"""
        response = requests.post(
            f"{BASE_URL}/api/confessions",
            params={"text": "Test", "category": "love"},
            headers={"X-Session-Id": "invalid-session-id"}
        )
        assert response.status_code == 401
        print(f"✓ Invalid session returns 401")


class TestReactions:
    """Reaction tests for confessions"""
    
    @pytest.fixture
    def session_and_confession(self):
        """Create session and confession for testing"""
        device_id = f"test_device_{uuid.uuid4()}"
        session_response = requests.post(f"{BASE_URL}/api/auth/session", json={"device_id": device_id})
        session_id = session_response.json()["id"]
        
        confession_response = requests.post(
            f"{BASE_URL}/api/confessions",
            params={"text": f"TEST_reaction_{uuid.uuid4()}", "category": "love"},
            headers={"X-Session-Id": session_id}
        )
        confession_id = confession_response.json()["id"]
        
        return session_id, confession_id
    
    def test_like_confession(self, session_and_confession):
        """Test liking a confession"""
        session_id, confession_id = session_and_confession
        
        response = requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/react",
            json={"type": "like"},
            headers={"X-Session-Id": session_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["action"] == "added"
        print(f"✓ Like added to confession")
    
    def test_toggle_like(self, session_and_confession):
        """Test toggling like removes it"""
        session_id, confession_id = session_and_confession
        
        # First like
        requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/react",
            json={"type": "like"},
            headers={"X-Session-Id": session_id}
        )
        
        # Second like (toggle off)
        response = requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/react",
            json={"type": "like"},
            headers={"X-Session-Id": session_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["action"] == "removed"
        print(f"✓ Like toggle works")


class TestComments:
    """Comment tests for confessions"""
    
    @pytest.fixture
    def session_and_confession(self):
        """Create session and confession for testing"""
        device_id = f"test_device_{uuid.uuid4()}"
        session_response = requests.post(f"{BASE_URL}/api/auth/session", json={"device_id": device_id})
        session_id = session_response.json()["id"]
        
        confession_response = requests.post(
            f"{BASE_URL}/api/confessions",
            params={"text": f"TEST_comment_{uuid.uuid4()}", "category": "college"},
            headers={"X-Session-Id": session_id}
        )
        confession_id = confession_response.json()["id"]
        
        return session_id, confession_id
    
    def test_create_comment(self, session_and_confession):
        """Test creating a comment"""
        session_id, confession_id = session_and_confession
        
        response = requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/comments",
            json={"text": f"TEST_comment_text_{uuid.uuid4()}"},
            headers={"X-Session-Id": session_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["confession_id"] == confession_id
        print(f"✓ Comment created: {data['id']}")
    
    def test_get_comments(self, session_and_confession):
        """Test getting comments for a confession"""
        session_id, confession_id = session_and_confession
        
        # Create a comment first
        requests.post(
            f"{BASE_URL}/api/confessions/{confession_id}/comments",
            json={"text": f"TEST_get_comment_{uuid.uuid4()}"},
            headers={"X-Session-Id": session_id}
        )
        
        # Get comments
        response = requests.get(f"{BASE_URL}/api/confessions/{confession_id}/comments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        print(f"✓ Got {len(data)} comments")


class TestReports:
    """Report functionality tests"""
    
    @pytest.fixture
    def session_and_confession(self):
        """Create session and confession for testing"""
        device_id = f"test_device_{uuid.uuid4()}"
        session_response = requests.post(f"{BASE_URL}/api/auth/session", json={"device_id": device_id})
        session_id = session_response.json()["id"]
        
        confession_response = requests.post(
            f"{BASE_URL}/api/confessions",
            params={"text": f"TEST_report_{uuid.uuid4()}", "category": "secrets"},
            headers={"X-Session-Id": session_id}
        )
        confession_id = confession_response.json()["id"]
        
        return session_id, confession_id
    
    def test_create_report(self, session_and_confession):
        """Test creating a report"""
        session_id, confession_id = session_and_confession
        
        response = requests.post(
            f"{BASE_URL}/api/reports",
            json={
                "target_type": "confession",
                "target_id": confession_id,
                "reason": "TEST_inappropriate content"
            },
            headers={"X-Session-Id": session_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["status"] == "pending"
        print(f"✓ Report created: {data['id']}")


class TestAdminEndpoints:
    """Admin functionality tests"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": "admin@guptkura.com", "password": "admin123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print(f"✓ Admin login successful")
        return data["access_token"]
    
    def test_admin_login_invalid(self):
        """Test admin login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": "admin@guptkura.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401
        print(f"✓ Invalid admin login returns 401")
    
    def test_admin_auto_login(self):
        """Test admin auto-login with special username"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auto-login",
            params={"name": "Santoshi@60poudel"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print(f"✓ Admin auto-login successful")
    
    def test_admin_auto_login_unauthorized(self):
        """Test admin auto-login with wrong username"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auto-login",
            params={"name": "WrongUsername"}
        )
        assert response.status_code == 403
        print(f"✓ Unauthorized auto-login returns 403")
    
    def test_admin_analytics(self):
        """Test admin analytics endpoint"""
        # First login
        login_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": "admin@guptkura.com", "password": "admin123"}
        )
        token = login_response.json()["access_token"]
        
        # Get analytics
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_confessions" in data
        assert "total_comments" in data
        print(f"✓ Admin analytics: {data['total_confessions']} confessions, {data['total_comments']} comments")
    
    def test_admin_reports_list(self):
        """Test admin reports list endpoint"""
        login_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": "admin@guptkura.com", "password": "admin123"}
        )
        token = login_response.json()["access_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/admin/reports",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin reports: {len(data)} reports")


class TestFeaturedConfession:
    """Featured/Confession of the day tests"""
    
    def test_get_featured_confession(self):
        """Test getting featured confession"""
        response = requests.get(f"{BASE_URL}/api/confessions/featured/top")
        assert response.status_code == 200
        # Can be null if no confessions
        data = response.json()
        if data:
            assert "id" in data
            print(f"✓ Featured confession: {data['id']}")
        else:
            print(f"✓ No featured confession (empty database)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
