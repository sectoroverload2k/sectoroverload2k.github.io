---
title: "Let's Encrypt Certificates Behind Round-Robin DNS with Ansible"
description: "Issuing and deploying Let's Encrypt certificates across multiple servers sharing a round-robin DNS name, using DNS-01 challenges across Cloudflare and Route53"
date: 2026-09-20
draft: false
category: "Security"
icon: "shield-lock"
difficulty: "Advanced"
toc: true
tags:
  - "Let's Encrypt"
  - "ACME"
  - "Ansible"
  - "TLS"
  - "DNS"
  - "Cloudflare"
  - "Route53"
---

## Overview

This is how I issue and deploy Let's Encrypt certificates for a service that sits behind round-robin DNS — two or more independent servers, each with its own public IP, all answering for the same hostname. No load balancer, no shared filesystem, no ACME proxy. Just DNS handing out a different A record each time somebody resolves the name.

The short version: **stop using HTTP-01 and switch to DNS-01.** Everything after that is plumbing, and I automate the plumbing with Ansible.

<div class="info-box">
<div class="info-box-title">The Setup I'm Working With</div>
<p>Two nodes in different facilities. Each has its own permanent hostname under <code>mywebsite.net</code> (delegated to Route53), and both answer for a shared service name under <code>mywebsite.com</code> (hosted on Cloudflare). Clients hit the shared name and land on whichever node DNS picks.</p>
</div>

## The Problem: HTTP-01 Does Not Survive Round-Robin

HTTP-01 validation works like this: your ACME client writes a token to `/.well-known/acme-challenge/<TOKEN>` and Let's Encrypt fetches it over port 80.

The catch is *which server* it fetches from. Let's Encrypt resolves your hostname, picks an address from the answer set, and retrieves the file — and it does this from multiple network vantage points as part of multi-perspective validation. With round-robin DNS you have no control over which IP any given attempt lands on.

So you get one of three outcomes:

1. **It works** — you got lucky and every perspective hit the node that has the token.
2. **It fails** — a perspective hit a node that has never heard of that token.
3. **It works today and fails in 60 days** — the worst one, because it fails at 3am during unattended renewal.

Here's the topology that causes it:

```
                    myservice.mywebsite.com
                              │
                    ┌─────────┴─────────┐
                    │  Round-Robin DNS  │
                    │  A → 203.0.113.10 │
                    │  A → 198.51.100.20│
                    └─────────┬─────────┘
                              │
         ┌────────────────────┴────────────────────┐
         │                                         │
         ▼                                         ▼
┌──────────────────────┐              ┌──────────────────────┐
│ server1.clt          │              │ server2.hil          │
│   .mywebsite.net     │              │   .mywebsite.net     │
│ 203.0.113.10         │              │ 198.51.100.20        │
│                      │              │                      │
│ /.well-known/        │              │ /.well-known/        │
│   acme-challenge/    │              │   acme-challenge/    │
│   TOKEN-A  ✓         │              │   (empty)  ✗         │
└──────────────────────┘              └──────────────────────┘
         ▲                                         ▲
         └──────── Let's Encrypt picks one ────────┘
                   (you don't get a vote)
```

<div class="info-box warning">
<div class="info-box-title">Why the Common Workarounds Are Worse</div>
<p>You <em>can</em> make HTTP-01 work: share <code>.well-known/acme-challenge/</code> over NFS, or redirect that path from every node to one designated validation server. Both work, and both add a hard dependency to your renewal path. Now a stale NFS mount or a down primary node doesn't just degrade a feature — it silently stops certificate renewal until something expires. I don't want my TLS lifecycle coupled to a shared mount.</p>
</div>

## Why DNS-01 Fixes It

DNS-01 proves control of the *domain*, not the *host*. You publish a TXT record at `_acme-challenge.<name>`, Let's Encrypt queries DNS for it, and your web servers are never contacted at all.

That means:

- **Zero relevance of round-robin.** The A records are not part of validation.
- **No port 80 requirement.** Nodes can be firewalled off entirely from the public internet.
- **Wildcards become possible.** Let's Encrypt only issues wildcard certs via DNS-01.
- **The control node doesn't have to be a web server.** I run this from my Ansible box.

The cost is that your DNS provider needs an API, and your automation needs credentials for it.

## Certificate Architecture

The design decision that trips people up: **each node gets its own certificate, and both certificates carry the shared round-robin name as a SAN.**

```
server1 cert:
  CN  = server1.clt.mywebsite.net
  SAN = server1.clt.mywebsite.net
  SAN = myservice.mywebsite.com     ← shared

server2 cert:
  CN  = server2.hil.mywebsite.net
  SAN = server2.hil.mywebsite.net
  SAN = myservice.mywebsite.com     ← shared
```

Whichever node a client lands on, the presented certificate validates for `myservice.mywebsite.com`. Each node also keeps a certificate valid for its own name, which matters for monitoring, direct admin access, and internal health checks that bypass the round-robin name.

<div class="info-box">
<div class="info-box-title">The Alternative: One Cert Everywhere</div>
<p>You can instead issue a single certificate carrying every name and copy it to all nodes. It's fewer moving parts and fewer ACME orders. I don't do it because it means the same private key lives on every box — compromise one node and you've compromised the certificate for all of them. Per-node keys contain the blast radius. If your nodes are identical cattle behind the same trust boundary, the single-cert approach is defensible and simpler.</p>
</div>

## Prerequisites

On the Ansible control node:

```bash
# Ansible collections
ansible-galaxy collection install community.crypto
ansible-galaxy collection install community.general
ansible-galaxy collection install community.dns
ansible-galaxy collection install amazon.aws

# Python dependencies
pip install cryptography    # community.crypto backend
pip install boto3 botocore  # Route53
```

Credentials:

- **Cloudflare** — a scoped API token with `Zone:DNS:Edit` on `mywebsite.com` only. Do not use a global API key.
- **AWS** — an IAM principal allowed `route53:ChangeResourceRecordSets` and `route53:GetChange` on the relevant hosted zones, and `route53:ListHostedZones`.

Both go in Ansible Vault. Nothing in this playbook should contain a plaintext secret.

```bash
ansible-vault create group_vars/all/vault.yml
```

## Inventory

I put the per-node DNS facts in inventory so the playbook doesn't have to guess anything:

```yaml
# inventory/hosts.yml
all:
  children:
    certnodes:
      hosts:
        server1.clt.mywebsite.net:
          node_dns_zone: "clt.mywebsite.net"
          cert_reload_service: "nginx"
        server2.hil.mywebsite.net:
          node_dns_zone: "hil.mywebsite.net"
          cert_reload_service: "nginx"
```

<div class="info-box warning">
<div class="info-box-title">Don't Derive the Zone With a Regex</div>
<p>You will see examples that strip the first label off the FQDN with <code>regex_replace</code> to guess the hosted zone. That only works if <code>clt.mywebsite.net</code> is genuinely its own hosted zone. If the delegation is at <code>mywebsite.net</code> instead, the API call fails with a confusing zone-not-found error. Declare the zone explicitly, or pass <code>hosted_zone_id</code> and remove the ambiguity entirely.</p>
</div>

## Play 1: Issue the Certificates

This runs entirely on the control node. Nothing touches the web servers yet.

```yaml
# site.yml
---
- name: Issue Let's Encrypt certificates for round-robin cluster
  hosts: localhost
  connection: local
  gather_facts: false
  vars:
    acme_email: "admin@mywebsite.com"

    # Production. Swap to staging for testing — see the testing section below.
    acme_directory: "https://acme-v02.api.letsencrypt.org/directory"

    local_cert_dir: "/srv/acme/certs"
    shared_rr_domain: "myservice.mywebsite.com"
    shared_rr_zone: "mywebsite.com"

    # From vault
    cloudflare_api_token: "{{ vault_cloudflare_api_token }}"

  tasks:
    - name: Create local certificate working directory
      ansible.builtin.file:
        path: "{{ local_cert_dir }}"
        state: directory
        owner: root
        group: root
        mode: '0700'

    - name: Generate ACME account key
      community.crypto.openssl_privatekey:
        path: "{{ local_cert_dir }}/account.key"
        type: RSA
        size: 4096
        mode: '0600'

    - name: Issue certificate for each cluster node
      ansible.builtin.include_tasks: tasks/issue_node_cert.yml
      loop: "{{ groups['certnodes'] }}"
      loop_control:
        loop_var: node
        label: "{{ node }}"
```

<div class="info-box warning">
<div class="info-box-title">Keep This Loop Serial</div>
<p>Both nodes need a TXT record at the <em>same</em> name: <code>_acme-challenge.myservice.mywebsite.com</code>. If you parallelize this, node 2's cleanup task will happily delete node 1's still-in-use challenge record and you'll get a validation failure that looks like a DNS propagation problem. <code>include_tasks</code> with a loop runs serially — leave it that way.</p>
</div>

## The Per-Node Issuance Tasks

This is where the actual ACME work happens. `community.crypto.acme_certificate` implements the two-phase pattern: the first call creates the order and hands back the challenge data, you publish it, then the second call tells the CA to validate and downloads the certificate.

```yaml
# tasks/issue_node_cert.yml
---
- name: "Generate private key for {{ node }}"
  community.crypto.openssl_privatekey:
    path: "{{ local_cert_dir }}/{{ node }}.key"
    type: RSA
    size: 2048
    mode: '0600'

- name: "Generate CSR for {{ node }} including shared round-robin SAN"
  community.crypto.openssl_csr:
    path: "{{ local_cert_dir }}/{{ node }}.csr"
    privatekey_path: "{{ local_cert_dir }}/{{ node }}.key"
    common_name: "{{ node }}"
    subject_alt_name:
      - "DNS:{{ node }}"
      - "DNS:{{ shared_rr_domain }}"
    mode: '0644'

- name: "Create ACME order and fetch challenge data for {{ node }}"
  community.crypto.acme_certificate:
    acme_directory: "{{ acme_directory }}"
    account_key_src: "{{ local_cert_dir }}/account.key"
    account_email: "{{ acme_email }}"
    terms_agreed: true
    csr: "{{ local_cert_dir }}/{{ node }}.csr"
    dest: "{{ local_cert_dir }}/{{ node }}.crt"
    fullchain_dest: "{{ local_cert_dir }}/{{ node }}-fullchain.crt"
    challenge: dns-01
    remaining_days: 30
  register: acme_order

# --- Publish challenges: Cloudflare for .com, Route53 for .net ---

- name: "Publish TXT challenge to Cloudflare for {{ node }}"
  community.general.cloudflare_dns:
    zone: "{{ shared_rr_zone }}"
    record: "{{ item.key }}"
    type: TXT
    value: "{{ txt_value }}"
    ttl: 60
    api_token: "{{ cloudflare_api_token }}"
    state: present
  loop: "{{ acme_order.challenge_data_dns | dict2items }}"
  loop_control:
    label: "{{ item.key }}"
  vars:
    txt_value: "{{ item.value | first }}"
  when:
    - acme_order is changed
    - item.key.endswith(shared_rr_zone)

- name: "Publish TXT challenge to Route53 for {{ node }}"
  amazon.aws.route53:
    state: present
    zone: "{{ hostvars[node].node_dns_zone }}"
    record: "{{ item.key }}"
    type: TXT
    ttl: 60
    # Route53 requires TXT values to be quoted
    value: "{{ item.value | map('community.dns.quote_txt', always_quote=true) | list }}"
    overwrite: true
    wait: true
  loop: "{{ acme_order.challenge_data_dns | dict2items }}"
  loop_control:
    label: "{{ item.key }}"
  when:
    - acme_order is changed
    - item.key.endswith(hostvars[node].node_dns_zone)

- name: "Allow DNS propagation for {{ node }}"
  ansible.builtin.pause:
    seconds: 30
  when: acme_order is changed

- name: "Validate challenge and retrieve certificate for {{ node }}"
  community.crypto.acme_certificate:
    acme_directory: "{{ acme_directory }}"
    account_key_src: "{{ local_cert_dir }}/account.key"
    account_email: "{{ acme_email }}"
    csr: "{{ local_cert_dir }}/{{ node }}.csr"
    dest: "{{ local_cert_dir }}/{{ node }}.crt"
    fullchain_dest: "{{ local_cert_dir }}/{{ node }}-fullchain.crt"
    challenge: dns-01
    remaining_days: 30
    data: "{{ acme_order }}"
  when: acme_order is changed

# --- Cleanup: always, even if validation failed ---

- name: "Remove Cloudflare TXT challenge for {{ node }}"
  community.general.cloudflare_dns:
    zone: "{{ shared_rr_zone }}"
    record: "{{ item.key }}"
    type: TXT
    value: "{{ item.value | first }}"
    api_token: "{{ cloudflare_api_token }}"
    state: absent
  loop: "{{ acme_order.challenge_data_dns | dict2items }}"
  loop_control:
    label: "{{ item.key }}"
  when:
    - acme_order is changed
    - item.key.endswith(shared_rr_zone)
  failed_when: false

- name: "Remove Route53 TXT challenge for {{ node }}"
  amazon.aws.route53:
    state: absent
    zone: "{{ hostvars[node].node_dns_zone }}"
    record: "{{ item.key }}"
    type: TXT
    ttl: 60
    value: "{{ item.value | map('community.dns.quote_txt', always_quote=true) | list }}"
  loop: "{{ acme_order.challenge_data_dns | dict2items }}"
  loop_control:
    label: "{{ item.key }}"
  when:
    - acme_order is changed
    - item.key.endswith(hostvars[node].node_dns_zone)
  failed_when: false
```

### What `challenge_data_dns` Actually Gives You

This is the detail that saves you from string-concatenation bugs. `acme_certificate` returns two related structures, and for DNS-01 you want the second one:

```
challenge_data:
  "server1.clt.mywebsite.net":
    "dns-01":
      record: "_acme-challenge.server1.clt.mywebsite.net"
      resource_value: "IlirfxKKXA...17Dt3juxGJ-PCt92wr-oA"

challenge_data_dns:
  "_acme-challenge.server1.clt.mywebsite.net":
    - "IlirfxKKXA...17Dt3juxGJ-PCt92wr-oA"
  "_acme-challenge.myservice.mywebsite.com":
    - "n7pQ2vLxYz...4Kd8Ba1Rc-Tf93qm-xE"
```

`challenge_data_dns` is keyed by the **complete DNS record name** and its value is a **list** of TXT values. Loop over it with `dict2items` and `item.key` is already the full record name — no gluing `_acme-challenge` onto a domain and hoping you got the dots right.

The list-of-values shape exists because a single record name can legitimately need multiple TXT values at once. That happens when a certificate covers both `example.com` and `*.example.com`, since both validate against the same `_acme-challenge.example.com` name. My per-node certs don't hit that case, so I take `item.value | first` for Cloudflare, which wants a single value per call. Route53's `value` parameter takes a list natively, so I pass the whole thing.

<div class="info-box warning">
<div class="info-box-title">Never Set <code>solo: true</code> on Cloudflare Challenge Records</div>
<p>The <code>cloudflare_dns</code> module has a <code>solo</code> option that deletes every other record with the same name and type. On an ACME challenge record that is exactly the wrong behavior — it's the same race the serial loop is protecting you from, just automated. Leave it unset.</p>
</div>

### Corrections Worth Calling Out

If you're adapting an existing playbook, these are the four things I see wrong most often:

| Wrong | Right | Why |
|-------|-------|-----|
| `acme_directory: "https://letsencrypt.org"` | `https://acme-v02.api.letsencrypt.org/directory` | The first is a marketing website. The ACME directory is a specific JSON endpoint. |
| `item.key is endingwith('...')` | `item.key.endswith('...')` | `endingwith` is not a Jinja2 test. Use the Python string method, or `is search('\\.com$')`. |
| Building the record as `resource + '.' + domain` | `challenge_data_dns` keys | The module already returns the exact record name. |
| `acme_version: 2` | omit it | It's the default and the only supported value since community.crypto 3.0.0. |

One more: `acme_directory` is now a **required** parameter. Older examples omit it and rely on a staging default — current versions will refuse to run.

## Play 2: Deploy and Reload

Issuance and deployment are separate plays on purpose. Play 1 can fail without touching production, and Play 2 is safe to re-run on its own.

```yaml
# site.yml (continued)
- name: Deploy certificates to cluster nodes
  hosts: certnodes
  become: true
  gather_facts: false
  vars:
    local_cert_dir: "/srv/acme/certs"

  tasks:
    - name: Ensure TLS directories exist
      ansible.builtin.file:
        path: "{{ item.path }}"
        state: directory
        owner: root
        group: root
        mode: "{{ item.mode }}"
      loop:
        - { path: "/etc/ssl/private", mode: '0700' }
        - { path: "/etc/ssl/certs",   mode: '0755' }

    - name: Install private key
      ansible.builtin.copy:
        src: "{{ local_cert_dir }}/{{ inventory_hostname }}.key"
        dest: "/etc/ssl/private/{{ inventory_hostname }}.key"
        owner: root
        group: root
        mode: '0600'
      notify: Reload web service

    - name: Install fullchain certificate
      ansible.builtin.copy:
        src: "{{ local_cert_dir }}/{{ inventory_hostname }}-fullchain.crt"
        dest: "/etc/ssl/certs/{{ inventory_hostname }}-fullchain.crt"
        owner: root
        group: root
        mode: '0644'
      notify: Reload web service

  handlers:
    - name: Reload web service
      ansible.builtin.systemd_service:
        name: "{{ cert_reload_service }}"
        state: reloaded
```

The handler only fires when a file actually changed, so running this playbook daily is a no-op until a renewal happens. That's the property you want — the same command is both "issue" and "renew."

<div class="info-box success">
<div class="info-box-title">Key Before Certificate</div>
<p>Install the private key first, certificate second. If the deploy is interrupted between the two tasks, a node with a new key and an old certificate will fail to start. A node with a new key and no new certificate yet simply keeps serving the old pair until the next run. Order the tasks so the interrupted state is the recoverable one.</p>
</div>

## Testing Against Staging First

Do not debug against production. Let's Encrypt's failed-validation limit is **5 authorization failures per identifier per account per hour**, and you will burn through that fast while getting your DNS API calls right.

```yaml
acme_directory: "https://acme-staging-v02.api.letsencrypt.org/directory"
```

Staging issues certificates from an untrusted root, which is fine — you're testing the workflow, not the trust chain. When it works end to end, switch the variable and clear out `/srv/acme/certs` so you get a clean production issuance.

Worth knowing about the other limits while you're at it:

- **50 certificates per registered domain per 7 days**, refilling at one per 202 minutes.
- **5 certificates per identical set of identifiers per 7 days**, refilling at one per 34 hours. This is the one that bites during debugging, because every re-run of a working playbook with the same name set counts.
- **100 identifiers per certificate.**

## Verifying the Round-Robin Actually Works

This is the step people skip, and it's the entire point of the exercise. Testing `https://myservice.mywebsite.com` in a browser proves that *one* node is correct. You need to check *every* node.

Use `--resolve` to pin curl to a specific IP while still sending the right SNI and Host header:

```bash
# Test each backend IP individually with the shared hostname
for ip in 203.0.113.10 198.51.100.20; do
  echo "=== $ip ==="
  curl -sS -o /dev/null -w '%{http_code} %{ssl_verify_result}\n' \
    --resolve myservice.mywebsite.com:443:$ip \
    https://myservice.mywebsite.com/
done
```

`ssl_verify_result` of `0` means the chain validated. Anything else is a failure on that node.

For the certificate details, `openssl s_client` with an explicit SNI:

```bash
openssl s_client -connect 203.0.113.10:443 \
  -servername myservice.mywebsite.com </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -ext subjectAltName -dates
```

You should see the shared name in the SAN list on every node:

```
subject=CN = server1.clt.mywebsite.net
X509v3 Subject Alternative Name:
    DNS:server1.clt.mywebsite.net, DNS:myservice.mywebsite.com
notBefore=Sep 20 14:22:31 2026 GMT
notAfter=Dec 19 14:22:30 2026 GMT
```

And confirm the round-robin set itself hasn't drifted from your node list:

```bash
dig +short myservice.mywebsite.com A
```

If that returns an IP that isn't in your inventory, you have a node serving traffic that this playbook has never issued a certificate for.

## Automating Renewal

Because `acme_certificate` checks expiry itself via `remaining_days`, renewal is just the playbook on a timer. It does nothing until a certificate is inside the 30-day window.

```bash
# /etc/cron.d/acme-renew
# Run daily at 03:17, offset from the top of the hour to spread CA load
17 3 * * * root /usr/bin/ansible-playbook \
  -i /srv/acme/inventory/hosts.yml \
  /srv/acme/site.yml \
  --vault-password-file /root/.acme-vault \
  >> /var/log/acme-renew.log 2>&1
```

Two things I add in production:

1. **Alert on staleness, not on failure.** A cron job that fails silently is indistinguishable from one that had nothing to do. Monitor the actual `notAfter` date on each node's live certificate and alert below 21 days. That catches broken automation regardless of why it broke.
2. **Never renew all nodes in the same run window** if you can avoid it. Staggering means a bad renewal takes out one node, not the whole pool.

## Troubleshooting

### Validation fails with "DNS problem: NXDOMAIN looking up TXT"

The record wasn't published, or wasn't published where Let's Encrypt looked. Check the authoritative nameservers directly rather than your local resolver:

```bash
# Find the authoritative servers, then query one directly
dig +short NS mywebsite.com
dig +short TXT _acme-challenge.myservice.mywebsite.com @<authoritative-ns>
```

If the record is there but validation still fails, you're almost certainly querying a different zone than the delegation actually uses. Verify with `dig +trace`.

### Validation fails intermittently on the shared name

Something is racing on `_acme-challenge.myservice.mywebsite.com`. Confirm the node loop is serial, confirm `solo: true` isn't set anywhere, and check that no other automation (an older certbot cron, a second playbook) is managing the same record.

### Route53 accepts the record but the value looks wrong

Route53 stores TXT values with literal quotes as part of the value. If you write the raw challenge string without quoting, the record content is malformed and validation fails with an "Incorrect TXT record" error. That's what `community.dns.quote_txt` is handling — don't hand-roll it with escaped quotes in YAML, the escaping is easy to get subtly wrong.

### "Zone not found" from Route53

The `zone` you passed isn't a hosted zone in that account. `clt.mywebsite.net` being resolvable does not mean it's a separate hosted zone. List what actually exists:

```bash
aws route53 list-hosted-zones --query 'HostedZones[].[Name,Id]' --output table
```

Then either fix `node_dns_zone` in inventory or switch to `hosted_zone_id`.

### Second acme_certificate call is skipped and no certificate appears

The `when: acme_order is changed` guard is doing its job — the existing certificate is still outside the `remaining_days` window, so there was nothing to do. This is correct idempotent behavior, not a bug. To force a reissue, delete the `.crt` file and re-run.

### Browser trusts one node but not the other

The nodes have different certificates and only one was deployed. Run the `--resolve` loop from the verification section — it will tell you exactly which node is wrong. Usually the handler didn't fire because the web service was reloaded manually mid-run.

## Additional Resources

- [Let's Encrypt: Challenge Types](https://letsencrypt.org/docs/challenge-types/)
- [Let's Encrypt: Rate Limits](https://letsencrypt.org/docs/rate-limits/)
- [Let's Encrypt: Staging Environment](https://letsencrypt.org/docs/staging-environment/)
- [community.crypto.acme_certificate module](https://docs.ansible.com/ansible/latest/collections/community/crypto/acme_certificate_module.html)
- [community.general.cloudflare_dns module](https://docs.ansible.com/ansible/latest/collections/community/general/cloudflare_dns_module.html)
- [amazon.aws.route53 module](https://docs.ansible.com/ansible/latest/collections/amazon/aws/route53_module.html)
- [RFC 8555 — Automatic Certificate Management Environment](https://www.rfc-editor.org/rfc/rfc8555.html)

## Key Takeaways

- **Round-robin DNS and HTTP-01 are fundamentally incompatible.** You cannot control which IP the CA validates against, so every workaround is a way of making all nodes look identical — which is added infrastructure in your renewal path.
- **DNS-01 sidesteps the problem entirely** because validation never touches your web servers.
- **Put the shared name as a SAN on every node's certificate** and give each node its own key and its own certificate. Per-node keys limit blast radius.
- **Use `challenge_data_dns`** instead of assembling record names by hand. The module returns the exact name.
- **Keep the node loop serial.** Nodes sharing a round-robin name share a challenge record name, and parallel cleanup will delete a live challenge.
- **Separate issuance from deployment** into two plays so a CA failure never touches production.
- **Test against staging** until the workflow is clean. The failed-validation limit is 5 per identifier per hour.
- **Verify with `--resolve` against every backend IP.** A browser test only proves one node works.
- **Monitor certificate expiry on the live nodes,** not the exit code of the renewal job. Silent automation failure is the real risk.
