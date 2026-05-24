# EXECUTIA Production

## Production Authority

Supabase production project:

dnyaancdvdsibbkdjdor

## Production API

https://execution.executia.io

## Canonical Deploy Order

1. SQL authority
2. audit chain
3. canonical bridge
4. operator RPC
5. Vercel deploy
6. produc6. p ve6. produon

## Mandatory V## Mandatory V## Mandatooy## Mandatory V## Mandam test
- git diff --stat
- git status --short
- vercel --prod
- curl production endpoint
- inspect JSON response

## Never Do

Never:
- deploy untested code
- deploy to wrong Supabase project
- mutate canonical chain
- bypass replay verification

## Vercel Rules

Always verify:
- routes exist
- endpoints return JSON
- dynamic routes work in production

Use:
curl -i

before assuming routing works.

