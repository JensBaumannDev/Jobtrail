import ipaddress

from rest_framework.throttling import ScopedRateThrottle

IPV6_NETWORK_PREFIX = 64


class IpRateThrottle(ScopedRateThrottle):
    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}

    def get_ident(self, request):
        return network_ident(super().get_ident(request))


def network_ident(address):
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return address
    if ip.version == 4:
        return str(ip)
    return str(ipaddress.ip_network(f'{ip}/{IPV6_NETWORK_PREFIX}', strict=False))
