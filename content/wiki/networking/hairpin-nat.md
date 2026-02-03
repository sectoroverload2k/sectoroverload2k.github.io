---
title: "Linux Router: Port Forwarding and Hairpin NAT with iptables"
description: "Configure port forwarding and hairpin NAT (NAT loopback) on a Linux router using iptables"
date: 2025-11-15
draft: false
category: "Networking"
icon: "router"
difficulty: "Intermediate"
toc: true
tags:
  - "Linux"
  - "iptables"
  - "NAT"
  - "Networking"
  - "Hairpin NAT"
---

## Overview

This guide documents the configuration of port forwarding and hairpin NAT (also called NAT loopback) on a Linux router using iptables. The challenge: internal clients need to access an internal server using the router's public IP address, while external clients access it normally through the internet.

<div class="info-box">
<div class="info-box-title">Use Case</div>
<p>When you have services (like a web server) behind your router that need to be accessible both from the internet AND from your internal network using the same public IP/domain name. Without hairpin NAT, internal clients trying to access the public IP will fail.</p>
</div>

## Network Topology

```
Internet
   │
   │ (eth1: 67.197.49.87)
   │
┌──▼───────────────────────────┐
│  Linux Router (Gateway)      │
│  - eth1: WAN interface       │
│  - eth0: LAN bridge          │
│  - eth0.10: VLAN 10          │
└──┬───────────────────────────┘
   │
   │ 192.168.0.1/24
   │
   ├───────────────────────────┐
   │                           │
   │                           │
192.168.0.10              Other LAN
(Web Server)              Clients
                      (192.168.0.0/24)
```

### Network Details

- **WAN Interface:** eth1 with public IP 67.197.49.87
- **LAN Network:** 192.168.0.0/24 (gateway: 192.168.0.1)
- **Internal Server:** 192.168.0.10 (web server on ports 80/443)
- **VLAN Setup:** eth0.10 for captive portal (192.168.10.0/24)

## The Problem: Why Hairpin NAT?

Standard port forwarding works fine for external traffic. However, when an internal client (e.g., 192.168.0.50) tries to access the public IP (67.197.49.87), the following happens **without hairpin NAT:**

1. Client sends packet to 67.197.49.87:80
2. Router DNATs it to 192.168.0.10:80
3. Server sees source as 192.168.0.50, so it responds **directly** to 192.168.0.50
4. Client receives response from 192.168.0.10, but expected it from 67.197.49.87
5. **Connection fails!** The client drops the packet because the source IP doesn't match

<div class="info-box warning">
<div class="info-box-title">Key Issue</div>
<p>The server responds directly to the internal client, but the client expects the response to come from the public IP it originally contacted. This asymmetric routing breaks the TCP connection.</p>
</div>

## The Solution: Hairpin NAT Configuration

Hairpin NAT solves this by making the router MASQUERADE the source IP when internal clients access the public IP. This forces the server's response to go back through the router, which then translates it back to appear as coming from the public IP.

### Step 1: External Port Forwarding (PREROUTING)

First, configure standard port forwarding for external traffic coming in on eth1:

```bash
# Forward external traffic to internal server
iptables -t nat -A PREROUTING -i eth1 -p tcp --dport 80 -j DNAT --to-destination 192.168.0.10:80
iptables -t nat -A PREROUTING -i eth1 -p tcp --dport 443 -j DNAT --to-destination 192.168.0.10:443
```

### Step 2: Hairpin NAT PREROUTING Rules

Add DNAT rules for internal clients accessing the public IP:

```bash
# Hairpin NAT for internal clients accessing public IP
iptables -t nat -A PREROUTING -s 192.168.0.0/24 -d 67.197.49.87 -p tcp --dport 80 \
    -j DNAT --to-destination 192.168.0.10:80

iptables -t nat -A PREROUTING -s 192.168.0.0/24 -d 67.197.49.87 -p tcp --dport 443 \
    -j DNAT --to-destination 192.168.0.10:443
```

### Step 3: POSTROUTING MASQUERADE (Critical!)

This is the **crucial step** that makes hairpin NAT work. It masquerades the source IP so the server responds back through the router:

```bash
# MASQUERADE hairpin traffic - forces replies through router
iptables -t nat -A POSTROUTING -s 192.168.0.0/24 -d 192.168.0.10 -p tcp --dport 80 \
    -j MASQUERADE

iptables -t nat -A POSTROUTING -s 192.168.0.0/24 -d 192.168.0.10 -p tcp --dport 443 \
    -j MASQUERADE
```

<div class="info-box success">
<div class="info-box-title">How MASQUERADE Fixes It</div>
<p>When the router MASQUERADEs the source IP, the server sees the request coming from 192.168.0.1 (the router) instead of 192.168.0.50 (the client). The server then responds to 192.168.0.1, which translates it back and forwards to the original client with the correct source IP.</p>
</div>

### Step 4: FORWARD Chain Rules

Ensure the FORWARD chain allows traffic to the destination server:

```bash
# Allow established connections (should be at top of FORWARD chain)
iptables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow forwarded traffic to web server
iptables -A FORWARD -d 192.168.0.10 -p tcp --dport 80 -j ACCEPT
iptables -A FORWARD -d 192.168.0.10 -p tcp --dport 443 -j ACCEPT
```

## Complete Traffic Flow

### External Client → Server

1. Internet client sends packet to 67.197.49.87:80
2. Router receives on eth1, DNATs to 192.168.0.10:80
3. Server responds to external IP
4. Router translates response back and sends to client

### Internal Client → Server (Hairpin NAT)

1. Internal client (192.168.0.50) sends packet to 67.197.49.87:80
2. Router DNATs destination to 192.168.0.10:80 (PREROUTING)
3. Router MASQUERADEs source to 192.168.0.1 (POSTROUTING)
4. Server sees request from 192.168.0.1, responds to 192.168.0.1
5. Router translates response: source becomes 67.197.49.87, destination becomes 192.168.0.50
6. Client receives response from 67.197.49.87 as expected ✓

## Verification and Testing

### View NAT Rules

```bash
# View PREROUTING rules with packet counts
iptables -t nat -L PREROUTING -n -v --line-numbers

# View POSTROUTING rules
iptables -t nat -L POSTROUTING -n -v --line-numbers
```

### Test from Internal Network

From any machine on 192.168.0.0/24:

```bash
# Test using public IP
curl http://67.197.49.87
curl https://67.197.49.87

# Should get the same response as accessing directly
curl http://192.168.0.10
```

### Monitor Traffic

Watch packet counters in real-time:

```bash
watch -n 2 'iptables -t nat -L PREROUTING -n -v --line-numbers'
```

You should see counters increment on both external and hairpin NAT rules when traffic flows.

## Persistence

Save your iptables rules to persist across reboots:

```bash
# On RHEL/CentOS
service iptables save

# On Debian/Ubuntu
iptables-save > /etc/iptables/rules.v4

# Or use iptables-persistent package
apt-get install iptables-persistent
netfilter-persistent save
```

## Example Configuration Output

Here's what the final NAT table looks like:

```
Chain PREROUTING (policy ACCEPT 31 packets, 7053 bytes)
num   pkts bytes target     prot opt in     out     source               destination
1        0     0 DNAT       tcp  --  eth0.10 *      0.0.0.0/0            0.0.0.0/0           tcp dpt:80 to:192.168.10.1:80
2        0     0 DNAT       tcp  --  eth0.10 *      0.0.0.0/0            0.0.0.0/0           tcp dpt:443 to:192.168.10.1:443
3        1    60 DNAT       tcp  --  eth1    *      0.0.0.0/0            0.0.0.0/0           tcp dpt:80 to:192.168.0.10:80
4        0     0 DNAT       tcp  --  eth1    *      0.0.0.0/0            0.0.0.0/0           tcp dpt:443 to:192.168.0.10:443
5        0     0 DNAT       tcp  --  *       *      192.168.0.0/24       67.197.49.87        tcp dpt:80 to:192.168.0.10:80
6        0     0 DNAT       tcp  --  *       *      192.168.0.0/24       67.197.49.87        tcp dpt:443 to:192.168.0.10:443

Chain POSTROUTING (policy ACCEPT 0 packets, 0 bytes)
num   pkts bytes target     prot opt in     out     source               destination
1    6152K 1688M MASQUERADE all  --  *       eth1   0.0.0.0/0            0.0.0.0/0
2        0     0 MASQUERADE tcp  --  *       *      192.168.0.0/24       192.168.0.10        tcp dpt:80
3        0     0 MASQUERADE tcp  --  *       *      192.168.0.0/24       192.168.0.10        tcp dpt:443
```

<div class="info-box">
<div class="info-box-title">Rule Breakdown</div>
<p><strong>Lines 1-2:</strong> Captive portal rules (VLAN 10)</p>
<p><strong>Lines 3-4:</strong> External traffic forwarding (WAN → internal server)</p>
<p><strong>Lines 5-6:</strong> Hairpin NAT rules (internal clients → public IP → internal server)</p>
<p><strong>POSTROUTING Line 1:</strong> Standard NAT for outbound traffic</p>
<p><strong>POSTROUTING Lines 2-3:</strong> Hairpin NAT MASQUERADE (the magic!)</p>
</div>

## Troubleshooting

### Internal clients can't access via public IP

- Verify hairpin NAT PREROUTING rules match your public IP exactly
- Ensure POSTROUTING MASQUERADE rules are present
- Check that IP forwarding is enabled: `sysctl net.ipv4.ip_forward`
- Verify no FORWARD chain rules are blocking traffic

### External clients can't access

- Check that FORWARD chain allows traffic to destination
- Verify PREROUTING rules on eth1 interface are correct
- Ensure your ISP isn't blocking ports 80/443

### Packet counters not incrementing

- Rules might be in wrong order (more specific rules should come first)
- Check interface names match your actual configuration
- Use `tcpdump` on router to see actual traffic flow

## Additional Resources

- [Netfilter Documentation](https://www.netfilter.org/documentation/)
- [iptables man page](https://linux.die.net/man/8/iptables)
- Related: Proxy ARP for VLAN isolation
- Related: Transit VPC with hub/spoke model

## Key Takeaways

- **Hairpin NAT is essential** when internal clients need to access services via public IP
- **MASQUERADE is the critical component** that forces traffic through the router
- **Order matters** in iptables - more specific rules should come before general ones
- **Always test** from both internal and external networks
- **Save your rules** to make them persistent across reboots
