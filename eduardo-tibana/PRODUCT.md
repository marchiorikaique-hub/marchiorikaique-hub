# Eduardo Tibana · Site e Diagnóstico de Maturidade em IA

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary, inferred:** directors, C-level executives and board members of mid-size and large Brazilian companies. They are deciding whether and how to bring AI into management and projects. They arrive from Eduardo's LinkedIn or a shared diagnosis link, often on a phone.
- **Secondary, inferred:**
  - project managers and PMOs who want AI in planning, risk and status reporting;
  - telecom and infrastructure companies, Eduardo's home sector.
- **Eduardo:** reviews the diagnoses in a private panel, follows up on leads and edits his site.

Kaique answered "no preference" to the audience question (2026-10-24), so these audiences are inferred from the site copy and the diagnosis questions.

## Product Purpose

Eduardo is a consultant in governance, board work and AI applied to projects.

- **Site:** presents him and turns a visitor into a conversation.
- **Diagnosis:** 12 questions produce a 0–100 score, a reading by area (strategy and governance, processes and projects, data and technology, people and culture), priorities and a 90-day plan, at a shareable `/resultado/:id`. Each diagnosis is also a qualified lead for him.

Success means a serious executive trusts the site enough to take the diagnosis, and then reaches out.

## Positioning

He comes from telecom and infrastructure operations rather than the AI hype side. His pairing is board-level governance with the AI-Driven Project Manager (AIPM) method, keeping "the human in command". The diagnosis gives a concrete, scored reading instead of a sales pitch.

## Operating Context

- Node 22 + Express + SQLite (`node:sqlite`).
- Deployed as the Docker Swarm service `tibana-site` on Kaique's VPS. Data (database and uploaded photo) lives in the `tibana-data` volume at `/app/data`.
- Eduardo edits his name, title, tagline, company, bio, WhatsApp, LinkedIn, email and photo in `/painel`. Any of these may be empty, including the photo: as of 2026-10-28 there is no photo and no contact data.

## Capabilities and Constraints

Everything below must be preserved:

- **Routes:** `/`, `/diagnostico`, `/resultado/:id`, `/painel`.
- **Public API:** `/api/perfil`, `/api/perguntas`, `/api/diagnosticos`, `/api/diagnosticos/:id/publico`.
- **Auth:** SETUP_CODE first access, scrypt password, HMAC cookie, login rate limit, `reset-senha` CLI.
- **Submission limits:** 20 submissions per IP per hour.
- **Panel:** list, filter, status, notes, delete, CSV export, profile and photo editing, password change.
- **Server-side scoring:** the 12 questions, 4 dimensions and levels (Inicial, Em desenvolvimento, Estruturado, Avançado) are product truth.

## Brand Commitments

Brazilian Portuguese with a professional, sober tone. From the brief (Kaique, 2026-10-24): professional, modern, premium and credible, a B2B AI-maturity consultant, nothing childish, a sober and cohesive palette. He rejected the previous look as ugly ("ficou uma bosta").

## Evidence on Hand

- **Confirmed facts:**
  - a career in telecom and infrastructure operations (network projects, contracts with large carriers, field teams across the country);
  - training as a board member;
  - the AIPM certification.
- **Not available:** numbers, client names, logos, testimonials, photos. Kaique answered "no preference" when asked for more facts. Never fabricate any of them.

## Product Principles

- Credibility before decoration: every claim on the site must be true and modest.
- The diagnosis is the product demo. It must feel rigorous and pleasant, and its report must look worth sharing with a board.
- Make the site look complete and premium even with empty optional fields, such as no photo or no contacts.
- Never break data, routes or security.

## Accessibility & Inclusion

WCAG AA contrast, keyboard-complete diagnosis flow, reduced motion respected, mobile-first from 375px.
