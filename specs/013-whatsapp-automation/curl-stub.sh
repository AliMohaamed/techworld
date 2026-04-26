#!/usr/bin/env bash
# Stub-mode test harness for the WhatsApp inbound webhook.
# Usage: bash specs/013-whatsapp-automation/curl-stub.sh
#
# Overrides via environment:
#   TW_CODE=TW-ABC123  PHONE=201012345678  BASE_URL=http://localhost:3000  AUTH_TOKEN=test-token

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
AUTH_TOKEN="${AUTH_TOKEN:-test-token}"
TW_CODE="${TW_CODE:-TW-AAAAAA}"       # replace with a real code from an open order
PHONE="${PHONE:-201012345678}"         # must match the customerPhone on that order
MEDIA_URL="${MEDIA_URL:-https://picsum.photos/600}"

ENDPOINT="${BASE_URL}/api/webhook/whatsapp"
MSG_ID_TEXT="stub-text-$(date +%s)"
MSG_ID_IMAGE="stub-image-$(date +%s)"

echo ""
echo "=== Test 1: bad bearer token — expect 401 ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer wrong-token" \
  -d '{"typeWebhook":"incomingMessageReceived","idMessage":"bad-auth-test"}'

echo ""
echo "=== Test 2: non-message webhook type — expect 200, no processing ==="
curl -s -w "\n%{http_code}\n" \
  -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d "{
    \"typeWebhook\": \"outgoingMessageStatus\",
    \"idMessage\": \"status-test\",
    \"status\": \"delivered\"
  }"

echo ""
echo "=== Test 3: text message with TW- code (phone=${PHONE}, code=${TW_CODE}) ==="
curl -s -w "\n%{http_code}\n" \
  -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d "{
    \"typeWebhook\": \"incomingMessageReceived\",
    \"idMessage\": \"${MSG_ID_TEXT}\",
    \"timestamp\": $(date +%s),
    \"senderData\": {
      \"chatId\": \"${PHONE}@c.us\",
      \"sender\": \"${PHONE}@c.us\",
      \"senderName\": \"Stub Customer\"
    },
    \"messageData\": {
      \"typeMessage\": \"textMessage\",
      \"textMessageData\": {
        \"textMessage\": \"هذا إيصال الدفع ${TW_CODE}\"
      }
    }
  }"

echo ""
echo "=== Test 4: image message with TW- code in caption + media URL ==="
echo "    (downloads ${MEDIA_URL} into Convex storage — order should flip to AWAITING_VERIFICATION)"
curl -s -w "\n%{http_code}\n" \
  -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d "{
    \"typeWebhook\": \"incomingMessageReceived\",
    \"idMessage\": \"${MSG_ID_IMAGE}\",
    \"timestamp\": $(date +%s),
    \"senderData\": {
      \"chatId\": \"${PHONE}@c.us\",
      \"sender\": \"${PHONE}@c.us\",
      \"senderName\": \"Stub Customer\"
    },
    \"messageData\": {
      \"typeMessage\": \"imageMessage\",
      \"imageMessageData\": {
        \"url\": \"${MEDIA_URL}\",
        \"caption\": \"${TW_CODE}\",
        \"mimeType\": \"image/jpeg\"
      }
    }
  }"

echo ""
echo "=== Test 5: duplicate — resend Test 4 payload, expect {status: 'duplicate'} ==="
curl -s -w "\n%{http_code}\n" \
  -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d "{
    \"typeWebhook\": \"incomingMessageReceived\",
    \"idMessage\": \"${MSG_ID_IMAGE}\",
    \"timestamp\": $(date +%s),
    \"senderData\": {
      \"chatId\": \"${PHONE}@c.us\",
      \"sender\": \"${PHONE}@c.us\",
      \"senderName\": \"Stub Customer\"
    },
    \"messageData\": {
      \"typeMessage\": \"imageMessage\",
      \"imageMessageData\": {
        \"url\": \"${MEDIA_URL}\",
        \"caption\": \"${TW_CODE}\",
        \"mimeType\": \"image/jpeg\"
      }
    }
  }"

echo ""
echo "=== Test 6: phone-only fallback (no TW- code in caption) ==="
echo "    (should match most recent PENDING_PAYMENT_INPUT order for ${PHONE})"
curl -s -w "\n%{http_code}\n" \
  -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d "{
    \"typeWebhook\": \"incomingMessageReceived\",
    \"idMessage\": \"stub-fallback-$(date +%s)\",
    \"timestamp\": $(date +%s),
    \"senderData\": {
      \"chatId\": \"${PHONE}@c.us\",
      \"sender\": \"${PHONE}@c.us\",
      \"senderName\": \"Stub Customer\"
    },
    \"messageData\": {
      \"typeMessage\": \"imageMessage\",
      \"imageMessageData\": {
        \"url\": \"${MEDIA_URL}\",
        \"caption\": \"إيصال الدفع\",
        \"mimeType\": \"image/jpeg\"
      }
    }
  }"

echo ""
echo "=== Test 7: unmatched — unknown short code ==="
curl -s -w "\n%{http_code}\n" \
  -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d "{
    \"typeWebhook\": \"incomingMessageReceived\",
    \"idMessage\": \"stub-unmatched-$(date +%s)\",
    \"timestamp\": $(date +%s),
    \"senderData\": {
      \"chatId\": \"9999999999@c.us\",
      \"sender\": \"9999999999@c.us\",
      \"senderName\": \"Unknown\"
    },
    \"messageData\": {
      \"typeMessage\": \"textMessage\",
      \"textMessageData\": {
        \"textMessage\": \"TW-ZZZZZZ\"
      }
    }
  }"

echo ""
echo "Done. Check the admin dashboard + webhook_receipts table in the Convex dashboard."
