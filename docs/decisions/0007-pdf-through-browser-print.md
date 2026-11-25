# 7. PDF through the browser's print function

- Status: Proposed
- Date: 2026-11-25

## Context

On the PDF page you choose sections, columns and statuses and see a live A4 preview. The PDF should look exactly like that preview.

## Decision

The preview is rendered in the browser, and the PDF comes from the browser's print dialog ("Save as PDF"). A print stylesheet shows only the A4 sheet.

## Consequences

- The PDF matches the preview because it is the same markup.
- No PDF library or rendering service on the server.
- You go through the print dialog instead of getting a direct download.
- Page breaks have to be handled in the print stylesheet.
