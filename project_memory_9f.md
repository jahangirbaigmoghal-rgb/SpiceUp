# Project Memory

**Core Reference Document**: `FINAL_REVIEW_IMPLEMENTATION_PLAN.md`

Always refer to the Final Review Implementation Plan for alignment, feature requirements, and architecture constraints when working on this project.

## Troubleshooting

### POS "Validation failed" when submitting products with modifiers/labels
**Issue**: POS showed a red `Validation failed` message when submitting orders such as `MEAT BALTI` with strength/add-ons/labels (examples: `Mild`, `Potato`, `LESS Spinach`, `ON CHIPS Onion`, `ALL OVER Mushroom`). The basket looked correct, but submit failed.
**Root Cause**: Backend Zod order validation was narrower than the real shared order payload used by POS/PWA/voice. Validation ran before `orderController` could normalize aliases, so valid POS payloads using fields like `menuItem`, `modifiers`, `pricePence`, `optionName`, `labelName`, and labelled add-ons could be rejected too early. POS also dropped some modifier metadata (`optionName`, `labelId`, `labelName`, `groupName`) when building the submit payload, making labelled kitchen/receipt text fragile. In production, an old PWA/service-worker shell could keep stale JS after a Vercel deploy and make the bug appear again until refresh.
**Fix Applied**:
1. Expanded `server/src/schemas/orderSchema.js` to accept shared POS/PWA/voice/legacy order shapes before controller normalization.
2. Updated POS submit mapping in `apps/pos/src/App.tsx` to send full modifier metadata, including `optionName`, `groupName`, `labelId`, `labelName`, and `kitchenText`.
3. Added smoke regressions in `server/src/tests/smoke.test.js` for POS canonical payloads and exact curry labelled add-ons.
4. Fixed build blockers that surfaced while testing: missing `react-hot-toast` dependency/import, duplicate `reorderCategories`, route/model import mismatches.
5. Added service-worker auto-update handling in `apps/pos/src/main.tsx` so stale Vercel/PWA JS refreshes after deployments.
**Verification**:
- `npm test -w @takeaway-pos/server` passed with labelled curry regression.
- `npm run build -w @takeaway-pos/pos` passed.
- Production API accepted exact screenshot payload and returned order `ORD-20260618-0001` with modifiers preserved: `Mild`, `Potato`, `LESS Spinach`, `ON CHIPS Onion`.
**Next-Time Checklist**:
1. First test `/api/orders` directly with the same modifier payload. If API accepts it, suspect stale frontend/PWA cache.
2. If API rejects it, inspect `server/src/schemas/orderSchema.js` before changing controller logic.
3. Confirm POS submit payload still includes `optionName`, `labelName`, `labelId`, and `groupName`.
4. After Vercel deploy, hard refresh once (`Ctrl + Shift + R`) if Chrome is still showing old behavior.

### Vercel "Invalid PIN" Error after fresh deployments
**Issue**: The POS frontend on Vercel shows "Invalid PIN" on login attempts, caused by the backend Express server failing config validation or returning 500 error responses on authentication.
**Root Causes**:
1. **Missing `PIN_LOOKUP_SECRET`**: Vercel backend (`take-away-pos` project) was missing the required `PIN_LOOKUP_SECRET` environment variable, causing a validation crash on startup in `server/src/config/env.js`.
2. **Lookup Key Mismatch**: When the secret key used for HMAC-SHA256 changes or is configured differently, the stored `pinLookup` key in the MongoDB `users` collection no longer matches the expected HMAC lookup hash generated during login, making the API query return `null` user matches.
**Fixes Applied**:
1. **Synchronized Environment Variables**: Added `PIN_LOOKUP_SECRET` with the value `takeaway_pos_secure_pin_lookup_secret` to both Vercel projects (`take-away-pos` and `take-away-pos-pos`) and redeployed them.
2. **Self-Healing PIN Repair**: Updated `repairDefaultUserPins` in `server/src/seed.js` to check if `user.pinLookup` matches the expected HMAC hash under the current active secret. If there is a mismatch (due to a secret change or addition), it automatically verifies the PIN using bcrypt and updates the database's `pinLookup` hash, keeping the default logins (`1111`, `2222`, etc.) fully functional.
**Verification / Next-Time Checklist**:
1. Run a POST request directly to `https://take-away-pos.vercel.app/api/auth/login-pin` with `{"pin": "1111"}`. If it returns `200 OK` with the user object, the backend authentication is healthy.
2. If it returns 500 or configuration warnings, check if any environment secrets (`MONGODB_URI`, `JWT_SECRET`, `COOKIE_SECRET`, `PIN_LOOKUP_SECRET`, `VOICE_AGENT_API_KEY`) are missing on Vercel.
3. If it returns 401 "Invalid PIN", verify that the self-healing repair logic is active in `seed.js`.

### AI Voice Agent "unable to calculate total" / "Validation failed" (Zod 400 errors)
**Issue**: The voice agent failed to place orders or calculate prices, repeating "unable to calculate total" or "unable to calculate price" during calls.
**Root Cause**:
1. **Schema Mismatches**: The Vercel backend's Zod schema validation was very strict. The Gemini Live session tool declarations (`calculate_order_price` and `place_order` in `voice-agent/gemini_session.py`) sent parameters that did not align with the backend's expected schema (e.g., omitting `variation_id` or sending `null` fields that Zod didn't permit).
2. **Null Value Validation**: Python's `None` was converted to `null` in JSON. Zod optional fields (like `delivery_address: z.string().optional()`) throw validation errors when explicitly passed as `null` instead of being omitted entirely.
3. **Closed Operating Hours**: If a call occurred outside of the store's configured operating hours (as defined in the `settings` model), the backend would reject order placement with a closed store message, causing the agent to fail.
**Fix Applied**:
1. **Updated Tool Definitions**: Added `variation_id` and made `menu_item_id`/`quantity` required in the tool declarations inside `gemini_session.py` to ensure correct schemas are always populated by the model.
2. **Recursive Null Stripper**: Created a recursive `strip_none` function in `voice-agent/takeaway_tools.py` that strips all `None`/`null` values from request payloads before sending them to the Vercel API. This satisfies Zod `.optional()` checks.
3. **Closed-Hours Support**: Configured the voice agent prompts to handle closed operating hours gracefully by accepting pre-orders and adding `PRE-ORDER: [Time]` to the order notes.
**Verification**:
- Checked Render logs to verify `calculate_order_price` and `place_order` API requests complete with `201 Created` / `200 OK` responses.
**Next-Time Checklist**:
1. If the voice agent says "unable to calculate", check the Render application logs.
2. Look for `HTTPError calling backend POST ...: 400 - Validation failed` and check the validation details JSON.
3. Check if any payload fields are being sent as `null`. If so, ensure they are filtered by `strip_none`.
4. Ensure the Gemini Live session tool parameter definitions match the Zod validation schema exactly.

### AI Voice Agent "closed", unable to pick menus, or empty call recordings/SMS
**Issue**: The voice agent repeated that the restaurant was closed (or used fallback generic prompts instead of the customized restaurant prompt), placed voice orders did not show up in the POS/Admin dashboard, SMS receipts were simulated instead of real, and call recordings/transcripts were missing from the call logs.
**Root Cause**:
1. **Database Mismatch**: The Render voice agent's environment variable `MONGODB_URI` was incorrectly pointing to `/test` instead of `/takeawaypos`. Because of this, it connected to an empty/incorrect database where no tenant or publish settings existed, resulting in empty collections and no active profile (`activeProfile: null`).
2. **Missing Active Tenant Flag**: Even when pointing to `/takeawaypos`, the tenant document (`_id: 6a26d6d9f84b948cbb424885`) had its `isActive` field set to `None`/missing. The voice agent queries `db.tenants.find_one({"isActive": True})` to load the profile, which failed when the flag was missing.
3. **Missing Twilio credentials on Vercel**: The Vercel projects (`take-away-pos` and `take-away-pos-pos`) lacked Twilio credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER`). Because of this, the Node.js backend fell back to simulated SMS logging (`⚠️ SMS Bill (Simulated)...`) rather than sending real SMS messages, and call recordings could not be queried or displayed on the call logs dashboard.
4. **Local Network Port Block**: Attempts to update or inspect the MongoDB Atlas cluster from the developer's local machine resulted in `No replica set members found yet` (ReplicaSetNoPrimary) due to network-level blocking of outgoing port 27017.
**Fix Applied**:
1. **Updated Render DB Configuration**: Corrected `MONGODB_URI` environment variable for service `TakeAwayPOS` (`srv-d8q1p4j6sc1c73b09av0`) on Render to point to `/takeawaypos` and redeployed.
2. **Updated Vercel Twilio Configuration**: Added `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` env vars to Vercel projects and redeployed.
3. **Cloud-Based Database Activation Route**: Created a temporary `/api/activate-tenant-temp` GET route in the voice-agent FastAPI (`main.py`) which triggers `db.tenants.update_many({}, {"$set": {"isActive": True}})` directly in the cloud container (bypassing local port 27017 blocks), committed/pushed it to main branch, and triggered it.
4. **Clean-up**: Removed the temporary database activation route after confirming the database update succeeded.
**Verification**:
- Check that `https://takeawaypos.onrender.com/health` returns `"ok": true`, `"mongoConfigured": true`, `"database": "takeawaypos"`, and `"activeProfile"` successfully matches the business name (e.g. `Jahangir`).
- Verify that calling the Twilio number places the order, sends the real Twilio SMS, and saves call recordings under `takeawaypos` database GridFS.
**Next-Time Checklist**:
1. Run a health check query against `https://takeawaypos.onrender.com/health`. If `"activeProfile"` is `null`, the agent cannot load menus or custom settings.
2. If `"database"` is not `"takeawaypos"`, check Render's environment variable `MONGODB_URI`.
3. If `"database"` is correct but `"activeProfile"` is `null`, check if the tenant document has `isActive: true`. If local port 27017 is blocked, add a temporary update endpoint in the application code, deploy it, and trigger it via browser.
4. If SMS is not sent or call logs are missing, check if `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` are set in the Vercel project environment variables.

### AI Voice Agent Call Logs and Recordings Missing from POS Dashboard
**Issue**: Although orders placed via the AI Voice Agent were updated on the POS and SMS receipts were sent successfully, the "Recent Voice Calls" table in the AI Voice Agent Control dashboard showed "No summary captured" and did not display the recording audio player.
**Root Cause**:
1. **Schema Field Naming Mismatches**:
   - The Python voice agent writes audio file references to the `callRecordings` collection using fields `stereoAudioFileId` and `userAudioFileId`.
   - The Node.js backend (`server/src/controllers/reportController.js` and the `getVoiceCallRecording` controller) expected `stereoFileId` and `userFileId`. Because of this naming mismatch, `hasRecording` resolved to `false`, hiding the audio player in the dashboard UI.
2. **Missing Summaries in Call Logs**:
   - The Python voice agent writes the Gemini-extracted call summary to the `callRecordings` collection under the field `issueSummary`.
   - The Node.js backend queries the `VoiceCallLog` collection (`voicecalllogs`) for the dashboard table, but the document created there during order placement lacks the summary. The frontend expects `o.transcriptSummary || o.intent`, resulting in the fallback text `"No summary captured"`.
**Fix Applied**:
1. **Node.js Backend**: Updated `getVoiceCallLogs` in `server/src/controllers/reportController.js` to fetch `issueSummary`, `stereoAudioFileId`, and `userAudioFileId` from the `callRecordings` collection and merge them as `transcriptSummary` and `hasRecording` in the returned call logs array.
2. **Recording Retrieval**: Updated the projection and search criteria in `getVoiceCallRecording` in `reportController.js` to accept both naming conventions (`stereoFileId` / `userFileId` and `stereoAudioFileId` / `userAudioFileId`).
3. **Python Agent**: Updated `voice-agent/call_store.py` and `voice-agent/recordings_store.py` to write both naming conventions (`stereoFileId` / `userFileId` and `stereoAudioFileId` / `userAudioFileId`) to the `callRecordings` collection to ensure forward and backward schema compatibility.
**Verification**:
- Verify that both Vercel and Render deployments complete successfully. Recent voice calls in the AI Voice Agent dashboard should now display the transcript summaries instead of "No summary captured" and render the audio player.
**Next-Time Checklist**:
1. If recordings or summaries are missing on the dashboard, check the MongoDB `callRecordings` collection structure.
2. Ensure both Python and Node.js codebases are aligned on the field names for audio files (`stereoAudioFileId` vs `stereoFileId`) and call summary (`issueSummary` vs `transcriptSummary`).

### AI Voice Agent Call Recording overlapping or poor audio quality
**Issue**: The call recordings saved in the AI Voice Agent dashboard had overlapping/mixed voices (user and agent speaking at the same time in the audio file) and poor sound quality.
**Root Cause**:
1. **Asynchronous Audio Writing**: Twilio streams the user's inbound audio continuously (even during silence), while the Gemini model only streams outbound audio packets when actively speaking. Because the silent periods on the agent channel were not padded/written, the agent's voice blocks were compressed together at the start of `gemini_wav` rather than aligned temporally with the call timeline. This caused the voices to overlap when combined.
2. **Sample Rate Mismatches**: The user audio was recorded at 16kHz while the agent audio was recorded at 24kHz. This necessitated resampling during mixing, which degraded output quality.
**Fix Applied**:
1. **Direct 16kHz Recording**: Reconfigured the agent's WAV file to save at 16kHz in `gemini_session.py` and resampled Gemini's 24kHz output to 16kHz in real-time before writing.
2. **Real-time Silence Synchronization**: Added a sample tracker `total_user_samples` (using the continuous Twilio inbound stream as the master clock) and `total_agent_samples`. Whenever the agent outputs speech or the session closes, the agent's channel is padded with silence up to the master user clock before writing, maintaining perfect temporal synchronization.
**Verification**:
- Placed test calls, confirmed that the output stereo file (Left: caller, Right: AI) contains aligned voices and high-quality clear audio.
**Next-Time Checklist**:
1. Keep the WAV file sample rates identical (16kHz) for both channels to avoid mixing resampling artifacts.
2. Ensure any asynchronous audio channels track and sync silence padding dynamically to prevent time-shifting.

### Express Backend "cookieParser("secret") required for signed cookies" on Vercel
**Issue**: The Vercel app showed a red `cookieParser("secret") required for signed cookies` error on the login screen when trying to authenticate (using `loginPin` or `login` endpoints).
**Root Cause**: Vercel Serverless Functions have pre-parsed cookie headers and automatically set `req.cookies` or `req._cookies`. When `cookie-parser` runs in Express, it checks `if (req._cookies) { next(); return; }` and returns early, which bypasses setting `req.secret`. When the route handler calls `res.cookie(..., { signed: true })`, Express searches for the secret key on `req.secret`, finds it undefined, and throws the error.
**Fixes Applied**:
1. Added a global Express middleware in `server/src/app.js` *before* the `cookieParser` registration that explicitly assigns `req.secret` on every request:
   ```javascript
   app.use((req, res, next) => {
     req.secret = env.cookieSecret || 'dev_cookie_secret';
     next();
   });
   app.use(cookieParser(env.cookieSecret || 'dev_cookie_secret'));
   ```
2. Changed the fallback logic for `cookieSecret` in `server/src/config/env.js` from nullish coalescing (`??`) to logical OR (`||`) to correctly handle empty strings `""` defined in Vercel environment variables.
**Verification / Next-Time Checklist**:
1. Run a POST request directly to the live backend serverless function (e.g. `POST /api/auth/login-pin` with `{"pin": "1111", "terminalId": "MAIN"}`). If it succeeds with `200 OK` and returns the authenticated user object, the signed cookies are working.
2. If it throws `cookieParser("secret") required for signed cookies`, ensure the custom middleware that explicitly sets `req.secret` is registered globally in `server/src/app.js` before `cookieParser`.


