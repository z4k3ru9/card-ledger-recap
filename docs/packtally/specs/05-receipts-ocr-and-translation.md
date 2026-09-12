# Stage 5 Contract: Receipts, OCR, and Translation

## Objective and dependencies

Deliver receipt capture as a priority workflow without making external processing necessary to record an Expense. Requires Stage 2 Expenses/authorization, Stage 4 durable jobs/notifications, and server-controlled capabilities.

## Persistence and storage

- `receipts(id, expense_id, uploader_member_id, storage_key, mime_type, bytes, width, height, sha256, revision, created_at, deleted_at)`.
- `receipt_jobs(id, receipt_id, kind ocr|translate_en|translate_id, provider_code, state queued|processing|review_required|failed|complete, attempts, next_attempt_at, error_code, created_at, updated_at)`.
- `receipt_extractions(id, receipt_id, source_language, original_text, suggested_merchant, suggested_date, suggested_currency, suggested_amount_minor, provider_metadata_json, created_at)`.
- `receipt_translations(id, extraction_id, language en|id, translated_text, provider_code, created_at)`.

The stored Receipt is the cropped/redacted/metadata-stripped upload; pre-redaction device bytes never reach the server. Files use opaque random storage keys outside the public web root. Maximum five images per Expense and approximately 1 MB per processed image; allowed decoded inputs are JPEG, PNG, and WebP, then normalized to a safe configured image format.

## Modules and interfaces

- **Receipt preprocessing module:** browser `process(file, crop, redactions): ProcessedReceipt` strips metadata, resizes, compresses, and previews.
- **Receipt storage module:** `store`, `openAuthorized`, `softDelete`, `purge` owns type sniffing, decode/re-encode, limits, non-public storage, and authorization.
- **Receipt processing module:** `enqueue`, `runNext`, `retry` owns bounded job state and provider adapters.
- **OCR/translation adapters:** `extract(receipt): Extraction` and `translate(text, target): Translation`; adapters never mutate Expenses.

## Behavior

Uploader reviews original extracted text, English translation, optional Indonesian translation, and suggested merchant/date/currency/total before explicitly applying fields. OCR/translation failure leaves image/manual entry intact. External adapters default disabled and should be configured for no training/no retention where possible; unavoidable retention is documented. Provider input never includes unneeded account/trip metadata.

Receipt bytes are visible only to payer and Owner. Other members’ whole-trip PDFs omit links/actions and state only that a restricted receipt is attached. Receipts live as long as their Trip, including closure/archive, and purge with permanent Trip deletion.

## Endpoints

`POST /api/expenses/{id}/receipts`, `GET/DELETE /api/receipts/{id}`, `POST /api/receipts/{id}/process`, `GET /api/receipts/{id}/processing`, `POST /api/receipts/{id}/retry`, and `POST /api/receipts/{id}/apply-suggestions`.

## Mandatory simulations

MIME spoof, image bomb, corrupt file, sixth upload, and over-limit processed file fail safely. EXIF/GPS is absent after upload. Unauthorized member cannot infer/download storage paths. Provider outage reaches failed/manual retry after bounded backoff. OCR cannot alter Expense without confirm mutation. Deleting Trip purges bytes, derivatives, jobs, and generated report links after countdown.

## Acceptance

Capture-to-review is usable at 320/430 px and stays responsive within mobile memory limits. Original processed context and both translations are distinguishable. Every provider and disabled state has a usable manual fallback.
