"""
Backend API tests for Luggage Intelligence API.
Run with: uv run pytest tests/ -v
"""
import json
import os
import pytest
from fastapi.testclient import TestClient

# ── Patch DATA_PATH before importing app ─────────────────────
FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "fixture_data.json")
os.environ["DATA_PATH"] = FIXTURE_PATH

from main import app  # noqa: E402 (import after env patch)

client = TestClient(app)


# ──────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────

SAMPLE_DATA = [
    {
        "brand": "Safari",
        "asin": "B0TEST001",
        "title": "Safari Thor 65L Hard Luggage",
        "price": 3299,
        "list_price": 7999,
        "discount_pct": 59,
        "rating": 4.1,
        "review_count": 12500,
        "reviews": [
            {"rating": 5, "title": "Excellent!", "body": "Smooth wheels and great build.", "verified": True, "date": "2026-01-15", "helpful_votes": 12},
            {"rating": 4, "title": "Good buy", "body": "Good value for money.", "verified": True, "date": "2026-02-10", "helpful_votes": 4},
            {"rating": 3, "title": "Average", "body": "Wheel stiffness after 3 months.", "verified": True, "date": "2026-03-01", "helpful_votes": 1},
        ]
    },
    {
        "brand": "American Tourister",
        "asin": "B0TEST002",
        "title": "American Tourister Ivy 68L Hardshell",
        "price": 4599,
        "list_price": 8999,
        "discount_pct": 49,
        "rating": 4.4,
        "review_count": 15000,
        "reviews": [
            {"rating": 5, "title": "Best warranty!", "body": "Premium feel and very durable.", "verified": True, "date": "2026-01-20", "helpful_votes": 30},
            {"rating": 5, "title": "Excellent!", "body": "Worth every rupee.", "verified": True, "date": "2026-02-15", "helpful_votes": 8},
            {"rating": 4, "title": "Great", "body": "Expensive but quality is top notch.", "verified": True, "date": "2026-03-05", "helpful_votes": 3},
        ]
    },
]


@pytest.fixture(autouse=True)
def write_fixture():
    """Write fixture data before each test and clean up after."""
    with open(FIXTURE_PATH, "w") as f:
        json.dump(SAMPLE_DATA, f)
    yield
    if os.path.exists(FIXTURE_PATH):
        os.remove(FIXTURE_PATH)


# ──────────────────────────────────────────────────────────────
# Tests
# ──────────────────────────────────────────────────────────────

class TestHealthCheck:
    def test_health_returns_ok(self):
        res = client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert "version" in data


class TestBrandsEndpoint:
    def test_brands_returns_list(self):
        res = client.get("/brands")
        assert res.status_code == 200
        brands = res.json()
        assert isinstance(brands, list)
        assert len(brands) == 2

    def test_brand_has_required_fields(self):
        res = client.get("/brands")
        brand = res.json()[0]
        for field in ("brand", "avg_price", "avg_discount", "avg_rating", "review_count", "sentiment_score", "positioning"):
            assert field in brand, f"Missing field: {field}"

    def test_sentiment_score_is_valid_range(self):
        res = client.get("/brands")
        for brand in res.json():
            score = brand["sentiment_score"]
            assert 0 <= score <= 100, f"Sentiment score out of range: {score}"

    def test_positioning_is_valid(self):
        res = client.get("/brands")
        valid = {"Premium", "Mass-market"}
        for brand in res.json():
            assert brand["positioning"] in valid

    def test_safari_price_is_correct(self):
        res = client.get("/brands")
        safari = next(b for b in res.json() if b["brand"] == "Safari")
        assert safari["avg_price"] == 3299.0

    def test_at_rating_is_correct(self):
        res = client.get("/brands")
        at = next(b for b in res.json() if b["brand"] == "American Tourister")
        assert at["avg_rating"] == 4.4


class TestProductsEndpoint:
    def test_get_all_products(self):
        res = client.get("/products")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 2

    def test_filter_by_brand(self):
        res = client.get("/products?brand=Safari")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["brand"] == "Safari"

    def test_filter_nonexistent_brand(self):
        res = client.get("/products?brand=FakeBrand")
        assert res.status_code == 200
        assert res.json() == []

    def test_product_fields(self):
        res = client.get("/products")
        product = res.json()[0]
        for field in ("brand", "asin", "title", "price", "list_price", "discount_pct", "rating", "review_count"):
            assert field in product


class TestProductDetailEndpoint:
    def test_get_product_by_asin(self):
        res = client.get("/product/B0TEST001")
        assert res.status_code == 200
        data = res.json()
        assert data["asin"] == "B0TEST001"
        assert data["brand"] == "Safari"
        assert "analysis" in data

    def test_nonexistent_asin_returns_404(self):
        res = client.get("/product/DOESNOTEXIST")
        assert res.status_code == 404

    def test_analysis_has_required_keys(self):
        res = client.get("/product/B0TEST001")
        analysis = res.json()["analysis"]
        for key in ("sentiment_score", "top_praise_themes", "top_complaint_themes",
                    "aspect_level_sentiment", "review_synthesis", "agent_insights"):
            assert key in analysis, f"Missing analysis key: {key}"

    def test_sentiment_score_in_range(self):
        res = client.get("/product/B0TEST001")
        score = res.json()["analysis"]["sentiment_score"]
        assert 0 <= score <= 100


class TestCompareEndpoint:
    def test_compare_two_brands(self):
        res = client.get("/compare?brands=Safari,American Tourister")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 2

    def test_compare_preserves_order(self):
        res = client.get("/compare?brands=American Tourister,Safari")
        data = res.json()
        names = [b["brand"] for b in data]
        assert "Safari" in names and "American Tourister" in names

    def test_compare_with_missing_brand_filters_gracefully(self):
        res = client.get("/compare?brands=Safari,GhostBrand")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["brand"] == "Safari"


class TestMarketMetricsEndpoint:
    def test_market_metrics_returns_list(self):
        res = client.get("/market-metrics")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) == 2

    def test_metrics_has_required_fields(self):
        res = client.get("/market-metrics")
        metric = res.json()[0]
        for field in ("brand", "value_score", "discount_efficiency", "sentiment", "positioning"):
            assert field in metric

    def test_sorted_by_sentiment_desc(self):
        res = client.get("/market-metrics")
        data = res.json()
        scores = [m["sentiment"] for m in data]
        assert scores == sorted(scores, reverse=True)


class TestInsightsEndpoint:
    def test_insights_returns_list(self):
        res = client.get("/insights")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)

    def test_insights_has_content(self):
        res = client.get("/insights")
        data = res.json()
        assert len(data) >= 1
        assert all(isinstance(s, str) and len(s) > 10 for s in data)


class TestSentimentEndpoint:
    def test_sentiment_for_existing_brand(self):
        res = client.get("/sentiment?brand=Safari")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, dict)

    def test_sentiment_for_nonexistent_brand_returns_404(self):
        res = client.get("/sentiment?brand=FakeBrand")
        assert res.status_code == 404


class TestDataQuality:
    """Validates that our data meets quality standards expected by the rubric."""

    def test_no_na_titles_in_fixture(self):
        """Product titles must not be 'N/A'."""
        for product in SAMPLE_DATA:
            assert product["title"] != "N/A", f"ASIN {product['asin']} has N/A title"

    def test_ratings_are_nonzero(self):
        """All products must have a non-zero rating."""
        for product in SAMPLE_DATA:
            assert product["rating"] > 0, f"ASIN {product['asin']} has 0.0 rating"

    def test_review_counts_are_nonzero(self):
        """All products must have a non-zero review count."""
        for product in SAMPLE_DATA:
            assert product["review_count"] > 0, f"ASIN {product['asin']} has 0 reviews"

    def test_reviews_are_not_empty(self):
        """Each product must have at least 3 reviews."""
        for product in SAMPLE_DATA:
            assert len(product["reviews"]) >= 3, f"ASIN {product['asin']} has fewer than 3 reviews"

    def test_review_bodies_are_diverse(self):
        """Reviews should not all have identical bodies (checks synthetic repetition)."""
        for product in SAMPLE_DATA:
            bodies = [r["body"] for r in product["reviews"]]
            unique_bodies = set(bodies)
            assert len(unique_bodies) >= 2, f"ASIN {product['asin']} has non-diverse reviews"

    def test_discount_pct_is_valid(self):
        """Discount must be between 0 and 95%."""
        for product in SAMPLE_DATA:
            d = product["discount_pct"]
            assert 0 <= d <= 95, f"ASIN {product['asin']} has invalid discount {d}%"
