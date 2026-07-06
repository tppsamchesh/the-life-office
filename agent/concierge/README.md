# TLO Concierge Daemon

Messaging spine for The Life Office concierge agent. Receives client WhatsApp/SMS
via Twilio webhooks, stores conversations in the TLO Dashboard Supabase project,
runs the Meg-first grace timer, and sends all outbound messages (Meg's queued
replies now; agent replies arrive in Plan 3).

Spec: `docs/superpowers/specs/2026-07-06-concierge-agent-design.md`

## Run locally

    cd agent/concierge
    python3 -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    export SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
           TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... \
           TWILIO_WHATSAPP_FROM='whatsapp:+44...' TWILIO_SMS_FROM='+1...' \
           PUBLIC_BASE_URL=https://tlo-concierge.sitbacksystems.com \
           VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:sam@theprocesspartners.com
    python -m concierge.run

Push notifications are disabled when `VAPID_PRIVATE_KEY` is unset; everything
else runs normally.

## Tests

    python -m pytest tests/ -v

## Production

Runs as `tlo-concierge.service` (systemd) on the TPP VPS, port 8090, behind
cloudflared (`tlo-concierge.sitbacksystems.com`). Env lives in
`/etc/tlo-concierge.env` (populated from the VPS secrets manager, never
committed). Heartbeat row: `service_heartbeats.service = 'tlo-concierge'`.
Startup also sweeps any messages stranded in `sending` from a prior crash back
into the send queue.

    systemctl status tlo-concierge
    journalctl -u tlo-concierge -n 100 --no-pager
