from __future__ import annotations

import pytest

from tests.conftest import ORIGIN, login, post

@pytest.mark.parametrize("payload,field", [
    ({"full_name":"","email":"valid@example.com","password":"StrongPass123"}, "full_name"),
    ({"full_name":"Valid Name","email":"invalid","password":"StrongPass123"}, "email"),
    ({"full_name":"Valid Name","email":"valid@example.com","password":"weak"}, "password"),
])
def test_registration_validation_matrix(client, payload, field):
    response = post(client, "/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    assert field in response.get_json()["error"]["fields"]

@pytest.mark.parametrize("reading", [None, "", "NaN", "Infinity", "-1", True, "1e999999"] )
def test_reading_numeric_validation_matrix(client, seeded, reading):
    assert login(client, "adaeze@example.com").status_code == 200
    response = post(client, "/api/v1/me/readings", json={"meter_id": seeded["meter_a"], "reading": reading})
    assert response.status_code == 400

def test_unknown_query_parameter_is_rejected(client, seeded):
    assert login(client, "adaeze@example.com").status_code == 200
    response = client.get("/api/v1/me/bills?sort=total_amount", base_url=ORIGIN)
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "invalid_filter"
