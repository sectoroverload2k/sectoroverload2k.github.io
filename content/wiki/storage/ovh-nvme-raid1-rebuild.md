---
title: "Replacing a Failed NVMe in an OVH mdadm RAID1 Mirror"
description: "What to do after OVH swaps a dead NVMe: spot rescue mode, prove the OS survived, clone the partition layout, and resync the mirror without touching the good disk"
date: 2026-10-22
draft: false
category: "Storage"
icon: "hdd-stack"
difficulty: "Advanced"
toc: true
tags:
  - "Linux"
  - "mdadm"
  - "RAID1"
  - "NVMe"
  - "OVH"
  - "Disaster Recovery"
---

## Overview

One of the two NVMe drives in a software RAID1 mirror dropped out, and nobody noticed for five weeks. I opened a ticket, OVH swapped the drive, and the server came back in their rescue system with the mirror still degraded. This is how I worked out what state the box was in, proved the OS and data had survived, and rebuilt the mirror onto the new drive.

The short version: **OVH replaces the hardware and nothing else.** The new disk arrives blank. Partitioning it, cloning the EFI partition, recreating swap, and adding it back to the arrays are all your job.

<div class="info-box">
<div class="info-box-title">The Setup I'm Working With</div>
<p>An OVH dedicated server (Ryzen 9 5900X, 128 GB RAM) running Ubuntu 24.04 on OVH's default partition template: two 512 GB NVMe drives mirrored with mdadm for <code>/boot</code> and <code>/</code>, plus two 6 TB HGST SATA drives in a separate RAID1 for media. A Western Digital SN810 fell out of the NVMe mirror; the Samsung beside it held the only current copy of everything.</p>
</div>

## The Disk Layout

There are two independent mirrors. Only the NVMe one was degraded.

| Device | Role | State after the swap |
|---|---|---|
| `nvme1n1` (Samsung, kept) | Surviving NVMe member | Healthy, sole member of md2/md3 |
| `nvme0n1` (Samsung, new) | Replacement for the dead WD | Blank, no partitions |
| `sda`, `sdb` (HGST 6 TB) | md127 data mirror | In sync, untouched |

Each NVMe uses the same GPT layout:

| Partition | Size | Use |
|---|---|---|
| p1 | 511 MiB | EFI system partition (vfat, label `EFI_SYSPART`), **not RAIDed**: one copy per disk |
| p2 | 1 GiB | md2 → `/boot` |
| p3 | 474.9 GiB | md3 → `/` |
| p4 | 512 MiB | Swap, one per disk, both listed in fstab by UUID |

`/etc/mdadm/mdadm.conf` references arrays by array UUID, so a new member disk needs no config change.

## Step 1: The Host Key Changed

The first SSH attempt after the swap failed loudly:

```
@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @
```

Every host key was different. A drive swap never changes host keys, so the possibilities were an OS reinstall, a man-in-the-middle, or a different OS booted. **Don't run `ssh-keygen -R` yet.** Look first:

```bash
# Fingerprints you trusted before vs. what the server presents now
ssh-keygen -F host.example.com | awk 'NR>1{print $2" "$3}' | ssh-keygen -lf -
ssh-keyscan -t ed25519,ecdsa host.example.com 2>/dev/null | ssh-keygen -lf -

# Read the SSH banner without trusting the key
ssh -v -o UserKnownHostsFile=/tmp/kh host.example.com true 2>&1 | grep 'remote software'
```

The banner answered it:

```
remote software version OpenSSH_9.2p1 Debian-2+deb12u10 rescue12-customer
```

`rescue12-customer` is OVH's Debian 12 rescue image. It has its own host keys and doesn't have your `authorized_keys`, which explains both the key warning and the rejected public key. A quick port probe showed only 22 open, so none of my services were running.

OVH's intervention note read: *"Host booted into customer rescue for troubleshooting… ping is OK and all services are back up."* That means the **rescue system** answers ping, not that your OS is running.

## Step 2: Log Into Rescue Mode

Rescue takes `root` over SSH with a one-time password that OVH emails to the account contact. **The password changes every time the server boots into rescue**, so after any reboot use the newest email. The first one I tried was from an earlier boot and was rejected.

Keep the rescue host key out of your real `known_hosts`, so the production key stays intact for when the server comes back:

```bash
ssh -o UserKnownHostsFile=/tmp/rescue_kh \
    -o StrictHostKeyChecking=accept-new \
    -o PubkeyAuthentication=no -o ForwardAgent=no \
    root@<server-ip>
```

<div class="info-box">
<div class="info-box-title">About the KVM Console</div>
<p>The IPMI console in rescue shows a status splash (hostname, kernel, uptime, disk list) that doesn't accept input. <code>Alt+F2</code> only changes the keyboard layout; switch to another TTY with <code>Ctrl+Alt+F3</code> for a login prompt. The splash's disk list is a quick check that the new drive was detected. SSH is still the better tool here: you can paste commands and read the output exactly.</p>
</div>

## Step 3: Assess Everything Read-Only

Nothing in this step writes to disk.

**Array status:**

```bash
cat /proc/mdstat
```

```
md2 : active raid1 nvme1n1p2[1]                     [2/1] [_U]
md3 : active (auto-read-only) raid1 nvme1n1p3[1]    [2/1] [_U]
md127 : active raid1 sdb[1] sda[0]                  [2/2] [UU]
```

`[_U]` means one of two members is present. Rescue auto-assembles md3 as `auto-read-only`; it switches to read-write when you add a member.

**Map device names to serials.** Never trust `nvme0`/`nvme1` ordering: the new drive took `nvme0n1`, the slot the dead WD used to have.

```bash
lsblk -o NAME,SIZE,TYPE,MODEL,SERIAL,FSTYPE,LABEL
smartctl -i -H /dev/nvme0n1
smartctl -i -H /dev/nvme1n1
```

**Check the superblocks.** Compare `Events` and `Update Time` across members:

```bash
mdadm --examine /dev/nvme1n1p2 /dev/nvme1n1p3 /dev/sda /dev/sdb | \
  grep -E 'Name|Creation Time|Update Time|Events|Device Role|Array State'
```

The arrays' creation dates matched the original install, and both HGST members had identical event counts.

**Rule out a reinstall** by mounting root read-only:

```bash
mkdir -p /mnt/r && mount -o ro /dev/md3 /mnt/r
grep PRETTY /mnt/r/etc/os-release
ls -l --time-style=full-iso /mnt/r/etc/ssh/ssh_host_ed25519_key.pub
cat /mnt/r/etc/fstab /mnt/r/etc/mdadm/mdadm.conf
umount /mnt/r
```

The host keys on disk dated from the original install. No reinstall. While root is mounted, note the two swap UUIDs in `/etc/fstab`: one belongs to the surviving disk's p4, and the other belonged to the dead drive. You'll reuse that one.

## Step 4: Rebuild the Mirror

Every write goes to the new disk only, and the script refuses to run unless both serials match and the target is empty.

```bash
set -e
SRC=/dev/nvme1n1   # surviving disk
DST=/dev/nvme0n1   # new disk

# 0. Guards: right disks, and the target is empty
[ "$(lsblk -dno SERIAL $SRC)" = <SURVIVING-SERIAL> ] || exit 1
[ "$(lsblk -dno SERIAL $DST)" = <NEW-SERIAL> ]       || exit 1
[ -z "$(lsblk -no NAME $DST | tail -n +2)" ]         || exit 1

# 1. Back up the good GPT, then replicate it onto the new disk
sgdisk -b /root/gpt-$(basename $SRC).bak $SRC
sgdisk $SRC -R $DST     # copy FROM $SRC TO $DST
sgdisk -G $DST          # new random disk/partition GUIDs
partprobe $DST

# 2. EFI system partition: not RAIDed, so clone it
dd if=${SRC}p1 of=${DST}p1 bs=4M conv=fsync

# 3. Swap: recreate it with the dead drive's UUID from fstab
mkswap -L swap-nvme0n1p4 -U <old-swap-uuid> ${DST}p4

# 4. Add the new partitions to the arrays (this starts the resync)
mdadm /dev/md2 --add ${DST}p2
mdadm /dev/md3 --add ${DST}p3
cat /proc/mdstat
```

What matters in each step:

- **`sgdisk $SRC -R $DST`**: the argument order is the dangerous part. The disk named first is the source, and the disk after `-R` gets overwritten. Reversed, it wipes your only good copy. That's why the serial guards exist.
- **`sgdisk -G`**: without it both disks share GUIDs, which confuses udev and anything that mounts by PARTUUID.
- **ESP clone**: OVH's template puts an `EFI_SYSPART` on every disk and fstab mounts it by label. A copy lets the server boot from either disk. Re-sync it after bootloader updates.
- **Swap UUID**: fstab lists both swaps by UUID. A new random UUID leaves systemd waiting about 90 seconds on a missing swap device at every boot.
- **`mdadm --add`**: md2 (1 GiB) resyncs in seconds. md3 (475 GiB) ran at about 200 MB/s, so roughly 40 minutes.

```
md2 : active raid1 nvme0n1p2[2] nvme1n1p2[1]   [2/2] [UU]
md3 : active raid1 nvme0n1p3[2] nvme1n1p3[1]   [2/1] [_U]
      [>....................]  recovery =  1.4% (7001984/497875968) finish=40.8min speed=200056K/sec
```

## Step 5: Boot Back to Disk and Verify

Switch netboot back to the hard disk **before** rebooting, or the server goes straight back into rescue:

1. OVH manager → your server → General information → Boot → **Hard disk**.
2. Reboot. You don't need to wait for the resync; it picks up where it stopped after boot.
3. The normal host key is back. Confirm it matches your original `known_hosts` entry (it should connect with no warning).
4. Verify on the running system:

```bash
cat /proc/mdstat                     # md2, md3, md127 all [UU] once recovery finishes
sudo mdadm --detail /dev/md3 | grep -E 'State|Active|Rebuild'
lsblk -o NAME,SERIAL,MOUNTPOINT      # both NVMe serials under md2/md3
swapon --show                        # two swap devices
findmnt /boot/efi
systemctl --failed
```

Ubuntu came up in about a minute, md3 resumed at 30% and finished clean within half an hour, and every service came back on its own.

## Set Up Alerts So This Doesn't Happen Again

The drive sat out of the mirror for five weeks because nobody was told. Check two things:

```bash
grep ^MAILADDR /etc/mdadm/mdadm.conf     # mine was "root", a local mailbox nobody reads
command -v sendmail                      # mine had no MTA at all
```

`mdadm --monitor` hands alerts to `/usr/sbin/sendmail`. Set `MAILADDR` to a real address, install an MTA (`msmtp-mta` pointed at an SMTP relay is the lightest option), restart `mdmonitor`, and send yourself a test:

```bash
sudo mdadm --monitor --scan --test --oneshot
```

## Lessons Learned

- **A changed host key after hardware work usually means rescue mode, not a reinstall.** Read the SSH banner before you panic or wipe `known_hosts`.
- **The rescue password is per boot.** Each reboot into rescue sends a new one.
- **"All services are back up" in the ticket refers to the rescue OS.** Check yourself.
- **Identify disks by serial, never by `nvmeXn1`.**
- **`sgdisk SRC -R DST` reads backwards from `dd`.** Guard it with serial checks.
- **The ESP isn't mirrored.** Clone it, and keep the copies in sync after bootloader updates.
- **Keep fstab swap UUIDs stable** to avoid a boot-time hang.
- **A degraded mirror runs silently.** Make sure mdadm can actually send mail, and test it.
