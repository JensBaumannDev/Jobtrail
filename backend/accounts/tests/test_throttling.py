import pytest
from rest_framework.test import APIRequestFactory

from accounts.throttling import IpRateThrottle

from .helpers import login_as_guest

pytestmark = pytest.mark.django_db


def ident_for(address):
    request = APIRequestFactory().post('/api/auth/guest/', REMOTE_ADDR=address)
    return IpRateThrottle().get_ident(request)


class TestIdent:
    def test_ipv4_address_is_used_as_it_is(self):
        assert ident_for('192.0.2.10') == '192.0.2.10'

    def test_ipv6_addresses_in_the_same_64_network_share_one_ident(self):
        assert ident_for('2001:db8:1:2::1') == ident_for('2001:db8:1:2:ffff:ffff:ffff:ffff')

    def test_ipv6_ident_is_the_64_network(self):
        assert ident_for('2001:db8:1:2:abcd::5') == '2001:db8:1:2::/64'

    def test_different_ipv6_networks_get_different_idents(self):
        assert ident_for('2001:db8:1:2::1') != ident_for('2001:db8:1:3::1')

    def test_unparsable_address_is_kept(self):
        assert ident_for('not-an-ip') == 'not-an-ip'


class TestIpv6GuestLimit:
    def test_rotating_addresses_inside_one_64_network_hits_the_limit(self, csrf_checking_client, frozen_now):
        for host in range(1, 6):
            assert login_as_guest(csrf_checking_client, REMOTE_ADDR=f'2001:db8:1:2::{host}').status_code == 201
        assert login_as_guest(csrf_checking_client, REMOTE_ADDR='2001:db8:1:2::99').status_code == 429

    def test_another_64_network_is_not_blocked(self, csrf_checking_client, frozen_now):
        for host in range(1, 6):
            login_as_guest(csrf_checking_client, REMOTE_ADDR=f'2001:db8:1:2::{host}')
        assert login_as_guest(csrf_checking_client, REMOTE_ADDR='2001:db8:1:3::1').status_code == 201
