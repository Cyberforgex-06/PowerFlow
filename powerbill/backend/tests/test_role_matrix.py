from __future__ import annotations

import pytest
from tests.conftest import ORIGIN, login, patch, post

STAFF_GETS = [
    "/api/v1/staff/stats", "/api/v1/staff/meters", "/api/v1/staff/bills", "/api/v1/staff/complaints",
]
ADMIN_GETS = ["/api/v1/admin/users", "/api/v1/admin/tariffs", "/api/v1/admin/audit"]

@pytest.mark.parametrize("path", STAFF_GETS + ADMIN_GETS)
def test_anonymous_cannot_use_protected_role_endpoints(client, path):
    response = client.get(path, base_url=ORIGIN)
    assert response.status_code == 401

@pytest.mark.parametrize("path", STAFF_GETS + ADMIN_GETS)
def test_customer_cannot_use_staff_or_admin_endpoints(client, seeded, path):
    assert login(client, "adaeze@example.com").status_code == 200
    response = client.get(path, base_url=ORIGIN)
    assert response.status_code == 403

@pytest.mark.parametrize("path", ADMIN_GETS)
def test_billing_officer_cannot_use_admin_endpoints(client, seeded, path):
    assert login(client, "officer@example.com").status_code == 200
    response = client.get(path, base_url=ORIGIN)
    assert response.status_code == 403

@pytest.mark.parametrize("path", STAFF_GETS)
def test_admin_can_use_staff_get_endpoints(client, seeded, path):
    assert login(client, "admin@example.com").status_code == 200
    assert client.get(path, base_url=ORIGIN).status_code == 200

def test_customer_cannot_mutate_staff_or_admin_resources(client, seeded):
    assert login(client, "adaeze@example.com").status_code == 200
    assert post(client, "/api/v1/staff/meters", json={}).status_code == 403
    assert post(client, "/api/v1/staff/readings", json={}).status_code == 403
    assert post(client, "/api/v1/staff/bills/not-a-bill/pay", json={"method":"cash"}).status_code == 403
    assert patch(client, "/api/v1/staff/complaints/not-a-complaint", json={"response":"No"}).status_code == 403
    assert patch(client, f"/api/v1/admin/users/{seeded['customer_b']}", json={"role":"billing_officer"}).status_code == 403
    assert post(client, "/api/v1/admin/tariffs", json={}).status_code == 403
