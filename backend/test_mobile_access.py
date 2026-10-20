import unittest
from unittest.mock import patch, MagicMock
import mysql.connector
import app as server


class MobileAccessTests(unittest.TestCase):
    def setUp(self):
        server.app.config['TESTING'] = True
        self.client = server.app.test_client()
        server.CLAIM_RATE_LIMITS.clear()

    def test_signed_in_claims_blocked_before_side_effects(self):
        for role in ('Admin', 'Staff'):
            with self.subTest(role=role):
                with self.client.session_transaction() as session:
                    session['user_id'] = 1
                    session['user_role'] = role
                with patch.object(server, 'get_db_connection') as database, patch.object(server, 'save_evidence_file') as upload:
                    response = self.client.post('/api/claims', data={'item_code': 'TEST'})
                    self.assertEqual(response.status_code, 403)
                    database.assert_not_called()
                    upload.assert_not_called()

    def test_guest_reaches_claim_validation(self):
        response = self.client.post('/api/claims', data={})
        self.assertEqual(response.status_code, 400)

    def test_guest_can_submit_valid_claim(self):
        connection = MagicMock()
        with patch.object(server, 'get_db_connection', return_value=connection):
            response = self.client.post('/api/claims', data={
                'item_code': 'ITEM_TEST',
                'claimer_first_name': 'Test',
                'claimer_last_name': 'Visitor',
                'contact_number': '09123456789',
                'claimant_email': 'visitor@example.com',
                'claimant_affiliation': 'Student',
                'item_description': 'A lost bag',
                'identifying_features': 'A distinctive tear inside',
            })
        self.assertEqual(response.status_code, 201)
        connection.commit.assert_called_once()

    def test_guest_cannot_report(self):
        self.assertEqual(self.client.post('/api/items', data={}).status_code, 401)

    def test_liveness_does_not_use_database(self):
        with patch.object(server, 'get_db_connection') as database:
            self.assertEqual(self.client.get('/api/health').status_code, 200)
            database.assert_not_called()

    def test_readiness_closes_resources(self):
        connection = MagicMock()
        with patch.object(server, 'get_db_connection', return_value=connection):
            self.assertEqual(self.client.get('/api/ready').status_code, 200)
        connection.cursor.return_value.close.assert_called_once()
        connection.close.assert_called_once()

    def test_readiness_failure_has_safe_response(self):
        with patch.object(server, 'get_db_connection', side_effect=mysql.connector.Error('private details')):
            response = self.client.get('/api/ready')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.get_json(), {'status': 'unavailable'})


if __name__ == '__main__':
    unittest.main()
