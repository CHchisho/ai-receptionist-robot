import pytest
from unittest.mock import Mock, MagicMock
from app.services.catalog import StoreCatalogProvider, _normalize, _match_title


class TestNormalize:
    """Test query normalization."""

    def test_normalize_basic(self):
        assert _normalize("Hello World") == "hello world"

    def test_normalize_removes_punctuation(self):
        assert _normalize("What about Energy?") == "what about energy"
        assert _normalize("Energy Management.") == "energy management"

    def test_normalize_collapses_whitespace(self):
        assert _normalize("Hello    World") == "hello world"

    def test_normalize_empty_string(self):
        assert _normalize("") == ""


class TestMatchTitle:
    """Test partial title matching logic."""

    def test_exact_match(self):
        """Full title in query should match."""
        assert _match_title("energy management system", "Energy Management System")

    def test_partial_keyword_match(self):
        """Query with partial keywords should match."""
        # "energy" from title is in query
        assert _match_title("energy demo", "Energy Management System")

    def test_keyword_no_match(self):
        """Query without title keywords should not match."""
        assert not _match_title("temperature demo", "Energy Management System")

    def test_multiple_keywords_partial_match(self):
        """Match if any keyword from title is in query."""
        assert _match_title("tell me about innovation", "Innovation Garage Demo")

    def test_stopwords_filtered(self):
        """Common stop words should be filtered out."""
        # "system" is the only meaningful word in the title
        assert _match_title("system", "The System")

    def test_all_stopwords_in_title(self):
        """If title is all stop words, use exact match."""
        # Edge case: title is just stop words
        assert _match_title("and the", "and the")
        assert not _match_title("something else", "and the")

    def test_case_insensitive(self):
        """Matching should be case-insensitive."""
        # Both will be normalized to lowercase
        assert _match_title("ENERGY DEMO", "energy management system")
        assert _match_title("energy demo", "ENERGY MANAGEMENT SYSTEM")

    def test_punctuation_ignored(self):
        """Punctuation should be normalized away."""
        assert _match_title("energy? demo.", "Energy, Management System!")


class TestStoreCatalogProvider:
    """Test StoreCatalogProvider with real demo data."""

    def test_find_demo_exact_match(self):
        """Should find demo when keywords match."""
        provider = StoreCatalogProvider()
        
        mock_demo = {
            "id": 1,
            "title": "Energy Management System",
            "description": "A demo about energy",
            "location": "Building A",
            "url": "http://example.com/energy",
        }
        
        # Mock the store module
        mock_store = MagicMock()
        mock_store.list_demos.return_value = [mock_demo]
        mock_store.list_events.return_value = []
        
        import app.services.catalog
        original_store = None
        try:
            # Temporarily replace the store in the module
            import sys
            original_module = sys.modules.get("app.services.knowledge")
            
            # Create a mock module
            mock_knowledge = MagicMock()
            mock_knowledge.store = mock_store
            sys.modules["app.services.knowledge"] = mock_knowledge
            
            # Now test
            hit = provider.find("energy management system")
            
            assert hit is not None
            assert hit.kind == "demo"
            assert hit.title == "Energy Management System"
            assert hit.description == "A demo about energy"
            assert hit.location == "Building A"
        finally:
            # Restore the original module
            if original_module:
                sys.modules["app.services.knowledge"] = original_module
            elif "app.services.knowledge" in sys.modules:
                del sys.modules["app.services.knowledge"]

    def test_find_demo_partial_match(self):
        """Should find demo when query contains partial keywords."""
        provider = StoreCatalogProvider()
        
        mock_demo = {
            "id": 1,
            "title": "Energy Management System",
            "description": "A demo about energy",
            "location": "Building A",
            "url": None,
        }
        
        # Mock the store module
        mock_store = MagicMock()
        mock_store.list_demos.return_value = [mock_demo]
        mock_store.list_events.return_value = []
        
        import sys
        original_module = sys.modules.get("app.services.knowledge")
        
        try:
            mock_knowledge = MagicMock()
            mock_knowledge.store = mock_store
            sys.modules["app.services.knowledge"] = mock_knowledge
            
            hit = provider.find("Energy demo")
            
            assert hit is not None
            assert hit.kind == "demo"
            assert hit.title == "Energy Management System"
        finally:
            if original_module:
                sys.modules["app.services.knowledge"] = original_module
            elif "app.services.knowledge" in sys.modules:
                del sys.modules["app.services.knowledge"]

    def test_find_event_partial_match(self):
        """Should find event when query contains partial keywords."""
        provider = StoreCatalogProvider()
        
        mock_event = {
            "id": 2,
            "title": "Quarterly Planning Meeting",
            "description": "Team planning session",
            "event_time": "2026-10-15 10:00",
            "room": "Conference Room A",
        }
        
        # Mock the store module
        mock_store = MagicMock()
        mock_store.list_demos.return_value = []
        mock_store.list_events.return_value = [mock_event]
        
        import sys
        original_module = sys.modules.get("app.services.knowledge")
        
        try:
            mock_knowledge = MagicMock()
            mock_knowledge.store = mock_store
            sys.modules["app.services.knowledge"] = mock_knowledge
            
            hit = provider.find("planning meeting")
            
            assert hit is not None
            assert hit.kind == "event"
            assert hit.title == "Quarterly Planning Meeting"
            assert hit.event_time == "2026-10-15 10:00"
            assert hit.room == "Conference Room A"
        finally:
            if original_module:
                sys.modules["app.services.knowledge"] = original_module
            elif "app.services.knowledge" in sys.modules:
                del sys.modules["app.services.knowledge"]

    def test_no_match_returns_none(self):
        """Should return None when no demo/event matches."""
        provider = StoreCatalogProvider()
        
        mock_demo = {
            "id": 1,
            "title": "Energy Management System",
            "description": "A demo about energy",
            "location": "Building A",
            "url": None,
        }
        
        mock_store = MagicMock()
        mock_store.list_demos.return_value = [mock_demo]
        mock_store.list_events.return_value = []
        
        import sys
        original_module = sys.modules.get("app.services.knowledge")
        
        try:
            mock_knowledge = MagicMock()
            mock_knowledge.store = mock_store
            sys.modules["app.services.knowledge"] = mock_knowledge
            
            hit = provider.find("temperature sensor demo")
            
            assert hit is None
        finally:
            if original_module:
                sys.modules["app.services.knowledge"] = original_module
            elif "app.services.knowledge" in sys.modules:
                del sys.modules["app.services.knowledge"]

    def test_empty_query_returns_none(self):
        """Should return None for empty query."""
        provider = StoreCatalogProvider()
        
        mock_store = MagicMock()
        mock_store.list_demos.return_value = []
        mock_store.list_events.return_value = []
        
        import sys
        original_module = sys.modules.get("app.services.knowledge")
        
        try:
            mock_knowledge = MagicMock()
            mock_knowledge.store = mock_store
            sys.modules["app.services.knowledge"] = mock_knowledge
            
            hit = provider.find("")
            
            assert hit is None
        finally:
            if original_module:
                sys.modules["app.services.knowledge"] = original_module
            elif "app.services.knowledge" in sys.modules:
                del sys.modules["app.services.knowledge"]

    def test_demo_with_url(self):
        """Should preserve URL in demo hit."""
        provider = StoreCatalogProvider()
        
        mock_demo = {
            "id": 1,
            "title": "Innovation Garage Demo",
            "description": "Tour of the garage",
            "location": "Espoo",
            "url": "https://example.com/innovation",
        }
        
        mock_store = MagicMock()
        mock_store.list_demos.return_value = [mock_demo]
        mock_store.list_events.return_value = []
        
        import sys
        original_module = sys.modules.get("app.services.knowledge")
        
        try:
            mock_knowledge = MagicMock()
            mock_knowledge.store = mock_store
            sys.modules["app.services.knowledge"] = mock_knowledge
            
            hit = provider.find("innovation demo")
            
            assert hit.url == "https://example.com/innovation"
        finally:
            if original_module:
                sys.modules["app.services.knowledge"] = original_module
            elif "app.services.knowledge" in sys.modules:
                del sys.modules["app.services.knowledge"]

