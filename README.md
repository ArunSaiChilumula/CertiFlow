CertiFlow — Skilling Certificate Issuance Platform
CertiFlow is a training-batch approval and certificate-management prototype built for the AlgoHire hackathon. It is designed to help training centres submit candidate batches, let officers review them through a staged workflow, and provide a foundation for reliable certificate issuance and verification.
Project status: Hackathon prototype. The Training Centre batch workflow and District Officer review workflow are implemented. Features listed as incomplete below should not be considered finished.

Problem
Training centres often share candidate spreadsheets with approval authorities, while reviews and certificate processing can involve manual coordination. This makes it difficult to track decisions, understand batch status, and maintain a clear record of approvals.

CertiFlow aims to centralize batch submission and review, validate candidate data before saving it, and record approval decisions.
Implemented functionality
Training Centre
- Create a training batch.
- Upload candidates in bulk using a CSV file.
- Validate CSV content before inserting candidate records.
- Reject invalid uploads rather than partially importing valid rows.
- View batches, batch details, candidate lists, candidate counts, and workflow status.
- Submit a draft batch for district review.
District Officers
- View the district review queue.
- Inspect batch information and candidate details.
- Approve, reject, or return a batch with optional comments.
- Demonstrate two separate district officers using seeded demo users.
- Require approvals from two distinct district officers before advancing the batch.
- Transition to Quality Review when required, or State Review when quality review is not required.
Audit and workflow tracking
- Record approval decisions and workflow changes.
- Track batch status as it moves through the implemented stages.
Current limitations
This is a prototype and is not production-ready. The following items are incomplete or not yet fully integrated:
- Real login, authentication, and backend-enforced authorization. The current role switcher is for demonstration only.
- Complete Quality Officer and State Officer workflows.
- Certificate PDF generation and delivery.
- Public certificate verification.
- Notification provider integration and retry handling.
- Certificate revocation/cancellation workflow.
- Redis, background job/message queue, and event-driven processing.
- Docker Compose, deployment automation, and production observability.
Do not use the demo role switcher as a security boundary. Do not use this prototype to process real candidate personal data.
Technology stack
Layer	Technology
Frontend	React, TypeScript, Vite
Styling	CSS
Backend	Node.js, Express, TypeScript
Database	PostgreSQL
ORM and migrations	Prisma
Testing	Backend district-approval integration tests
Version control	Git and GitHub


Repository structure
The repository root contains both applications:
AlgoHire/
├── CertiFlow/       # React + Vite frontend
├── Server/          # Express + TypeScript backend
└── README.md        # Project documentation
Run frontend and backend commands from their respective directories.
Prerequisites
- Node.js and npm
- PostgreSQL
- A PostgreSQL database for the project
Local setup
1. Clone the repository
git clone https://github.com/ArunSaiChilumula/CertiFlow.git
cd CertiFlow
2. Configure and start the backend
cd Server
npm install
Create a local .env file in Server/ and configure the PostgreSQL connection string using the variable names expected by the backend's Prisma configuration and application. Never commit database credentials or other secrets.

Run the migration and seed scripts listed in Server/package.json to prepare the database and demo users. Use the exact script names defined in that file.

Start the backend:
npm run dev
The backend development server is configured to run at:
http://localhost:5000
Health checks:
- GET /api/health
- GET /api/db-health
3. Configure and start the frontend
Open a second terminal from the repository root:
cd CertiFlow
npm install
npm run dev
Open the local URL printed by Vite. If port 5173 is already in use, Vite may select another available port. The current demo frontend expects the backend at http://localhost:5000.
Demo walkthrough
1. Start PostgreSQL, the backend, and the frontend.
2. Use the demo role switcher to enter the Training Centre view.
3. Create a batch.
4. Upload a CSV containing candidate records.
5. Open the batch details and verify the candidate list.
6. Submit the batch for approval.
7. Switch to District Officer 1 and review the batch.
8. Approve it as District Officer 1.
9. Switch to District Officer 2 and approve the same batch.
10. Verify that the batch advances after two distinct district approvals, according to its quality-review setting.
Use demo/test candidate data only.
CSV format
The candidate upload endpoint expects a CSV file with these columns:
fullName,phone,email,candidateCode
Ravi Kumar,9876543210,ravi@example.com,C001
Priya Sharma,9876543211,priya@example.com,C002
Email and candidate code are optional where supported by backend validation. Use valid test mobile numbers and ensure records are unique within the batch.
API overview
The implemented frontend/backend workflow uses these endpoints:
Method	Endpoint	Purpose
GET	/api/health	API health check
GET	/api/db-health	Database connectivity check
GET	/api/batches?trainingCentreId=...	List batches for a training centre
GET	/api/batches/:batchId	Get batch details
POST	/api/batches	Create a batch
POST	/api/batches/:batchId/candidates/upload	Upload candidate CSV
POST	/api/batches/:batchId/submit	Submit a draft batch
POST	/api/batches/:batchId/approvals/district	Record a district officer decision


The district review queue routes and request payloads are implemented in the backend. Refer to Server/src/modules/batch/batch.routes.ts and the corresponding controller/service for the exact current route and payload contract.
Tests and verification
The backend includes district-approval integration tests covering key approval behavior, including the two-distinct-officer transition rule. Run the test scripts defined in Server/package.json.

Frontend and backend builds and the district approval tests were reported passing during development. Re-run the build and test commands locally after cloning to verify the current repository state.
Important implementation decisions
- Single backend application: A single Express application was used instead of microservices to keep the prototype straightforward and manageable within the hackathon time.
- Bulk CSV import: CSV upload supports training-centre batch workflows and avoids manual candidate entry.
- Atomic candidate import: Validation occurs before database insertion, and candidate insertion/count updates are grouped in a Prisma transaction.
- Business rules in the backend: The two-distinct-district-officer rule is enforced server-side rather than relying only on frontend behavior.
- Demo role switching: The role switcher helps reviewers explore role-specific screens quickly, but it is not authentication or authorization.
Security and privacy notes
- Never commit .env files, database passwords, API keys, or real candidate information.
- Use only sample data in the hackathon demo.
- The current demo role switcher must not be treated as identity verification or access control.
- A production version would require authenticated identities, server-side role/permission checks, secure certificate access, rate limiting, and appropriate personal-data protections.
Deployment plan
The current project is intended to run locally for the hackathon demo. A production deployment plan covering scaling, event processing, background workers, failure handling, monitoring, certificate storage, and cost estimates should be documented separately in DEPLOYMENT.md.
AI assistance
AI coding assistance was used during development for implementation support and debugging. Generated changes were reviewed and checked through builds, tests, and manual workflow testing. The submitting developer is responsible for understanding and explaining the submitted code.
