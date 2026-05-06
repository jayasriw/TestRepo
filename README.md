# JobFinder (Indeed Clone)

A full-stack job board website clone with search, job listings, job detail pages, employer posting, user authentication, and application tracking.

## Features

- Job search by title, company, location, job type, and remote option
- Job detail pages with description, requirements, benefits, and apply action
- User registration and login for job seekers and employers
- Employers can post new jobs through a secure form
- Job seekers can submit applications
- Dashboard showing current user profile and applications

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the server:

   ```bash
   npm start
   ```

3. Open your browser at `http://localhost:4000`

## Project structure

- `server/` — backend Express API and JSON data store
- `public/` — frontend static site with HTML, CSS, and JavaScript
- `package.json` — Node dependencies and startup script

## Notes

- User sessions are stored in `localStorage` in the browser.
- Data is persisted in `server/db.json`.
- This is a starter implementation modelled after core Indeed features; it can be extended with email verification, search indexing, and production database storage.
