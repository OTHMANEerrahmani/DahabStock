DahabStock - ARCHITECTURE.md

Inventory Management and Traceability System for Dahab Travaux
Version: 1.0
Architecture: 3-Tier Monolithic Layered Architecture

⸻

1. Project Overview

DahabStock is a desktop inventory management system designed for Dahab Travaux, a company specialized in aluminum windows, doors, kitchens, and metal fabrication.

The primary objective is to provide complete traceability of materials from supplier reception to final consumption on customer projects while managing aluminum offcuts (chutes) efficiently.

The system must support:

* Supplier deliveries
* Material management
* Stock management
* Offcut (chute) management
* Consumption tracking
* Loss declaration
* Inventory movements
* Reporting and traceability
* PDF purchase order import

The architecture and workflows are based on the validated database model and business process diagrams.  

⸻

2. Architectural Style

3-Tier Monolithic Layered Architecture

DahabStock is implemented as a single desktop application while maintaining a strict separation of responsibilities.

┌──────────────────────────────┐
│      Presentation Layer      │
│                              │
│ React + TypeScript + Tauri   │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│     Business Logic Layer     │
│                              │
│ Python Services              │
│ Business Rules               │
│ Workflows                    │
│ PDF Import                   │
│ Reporting                    │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│       Data Access Layer      │
│                              │
│ Repositories                 │
│ pyodbc                       │
│ SQL Queries                  │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│ Microsoft SQL Server Express │
└──────────────────────────────┘

⸻

3. Technology Stack

Frontend

Tauri

Provides the desktop application shell.

React

Builds the user interface.

TypeScript

Provides strong typing and maintainability.

⸻

Backend

Python

Responsible for:

* Business logic
* PDF extraction
* Inventory workflows
* Report generation
* Cost calculations

Libraries:

pyodbc
PyMuPDF
pdfplumber
pandas
openpyxl
reportlab

⸻

Database

Microsoft SQL Server Express

Local database used as the single source of truth.

⸻

4. Project Structure

DahabStock/
│
├── frontend/
│   │
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── utils/
│
├── backend/
│   │
│   ├── services/
│   ├── repositories/
│   ├── models/
│   ├── reports/
│   ├── pdf/
│   └── database/
│
├── database/
│   │
│   ├── schema/
│   ├── scripts/
│   └── seed/
│
├── docs/
│
└── README.md

⸻

5. Presentation Layer

Responsibilities

The Presentation Layer handles:

* User interaction
* Navigation
* Data visualization
* Forms
* Validation messages
* User experience

⸻

Screens

Dashboard

Displays:

* Total materials
* Total stock
* Recent movements
* Inventory summary

⸻

Stock Entry

Handles supplier deliveries.

⸻

Stock Principal

Displays current stock.

⸻

Stock Chutes

Displays available offcuts.

⸻

Consumption

Handles project consumption.

⸻

Loss Management

Handles inventory losses.

⸻

Reports

Displays:

* Inventory reports
* Consumption reports
* Traceability reports

⸻

Configuration

Handles:

* Suppliers
* Projects
* Materials

⸻

Rule

The Presentation Layer must never communicate directly with SQL Server.

All requests pass through the Business Logic Layer.

⸻

6. Business Logic Layer

This layer contains all inventory rules.

⸻

Services

StockService

Responsible for:

StockPrincipal
StockChutes
Inventory updates

⸻

ConsumptionService

Responsible for:

Material consumption
Chute consumption
Bar cutting
Remaining length calculation

⸻

LossService

Responsible for:

Loss declaration
Inventory reduction

⸻

MovementService

Responsible for:

Inventory movement creation
Traceability

⸻

PdfImportService

Responsible for:

Supplier PDF extraction
Purchase order validation
Automatic stock entry

⸻

ReportService

Responsible for:

Excel reports
PDF reports
Cost reports

⸻

7. Core Business Workflows

Supplier Reception Workflow

Supplier Delivery
       ↓
Manual Entry or PDF Import
       ↓
Validate Data
       ↓
Create BonReception
       ↓
Create LigneBonReception
       ↓
Update StockPrincipal
       ↓
Create MouvementStock

This workflow follows the validated stock entry process.  

⸻

Consumption Workflow

Enter Project Code
       ↓
Select Material
       ↓
Material Type?

Article Standard

Consume Quantity
       ↓
Update StockPrincipal
       ↓
Create Consommation
       ↓
Create MouvementStock

⸻

Barre Aluminium

Check StockChutes
       ↓
Compatible Chute Exists?

Yes

Consume From Chute
       ↓
Update StockChutes
       ↓
Create Consommation
       ↓
Create MouvementStock

No

Take New Bar
       ↓
Cut Required Length
       ↓
Remove Bar From StockPrincipal
       ↓
Calculate Remaining Length
       ↓
Create New Chute
       ↓
Store In StockChutes
       ↓
Create Consommation
       ↓
Create MouvementStock

This workflow is derived directly from the validated business process.  

⸻

Loss Workflow

Declare Loss
       ↓
Select Source

Stock Principal

Reduce StockPrincipal

Stock Chutes

Reduce StockChutes

Then:

Create Perte
       ↓
Create MouvementStock

⸻

8. Inventory Model

Stock Principal

Contains:

* New aluminum bars
* Standard materials
* Supplier deliveries

Example:

ALU-BLANC-6M
Quantity = 30 bars

Stock is aggregated.

⸻

Stock Chutes

Contains:

* Individual offcuts

Example:

ChuteID = 1
Length = 2m
ChuteID = 2
Length = 1.5m

Each chute is tracked independently.

⸻

Critical Business Rule

For aluminum bars:
1. Check StockChutes first.
2. If a compatible chute exists:
       Consume from StockChutes.
3. Otherwise:
       Consume from StockPrincipal.
4. Create a new chute if remaining length > 0.

This rule minimizes material waste and reflects Dahab’s operational practice.  

⸻

9. Data Access Layer

Responsibilities

The Data Access Layer handles:

* Database connection
* SQL execution
* CRUD operations
* Data retrieval

⸻

Repositories

MaterialRepository

Materiau
BarreAluminium
ArticleStandard

SupplierRepository

Fournisseur

ProjectRepository

Projet

StockRepository

StockPrincipal
StockChutes

ReceptionRepository

BonReception
LigneBonReception

ConsumptionRepository

Consommation

LossRepository

Perte

MovementRepository

MouvementStock

⸻

Rule

Repositories contain:

SQL
CRUD
Database access

Repositories must never contain business rules.

⸻

10. Database Model

Master Data

Fournisseur
Projet
Materiau

⸻

Material Inheritance

Materiau
│
├── BarreAluminium
│
└── ArticleStandard

This model avoids duplication and supports future material types.

⸻

Inventory Tables

StockPrincipal
StockChutes

⸻

Operational Tables

BonReception
LigneBonReception
Consommation
Perte

⸻

Traceability Tables

MouvementStock

Every inventory action generates a movement.

⸻

11. Traceability Rules

Every operation must generate a movement record.

Examples:

Reception
Consumption
Loss
Chute Creation
Stock Adjustment

The movement table serves as the complete operational history of the system.

⸻

12. Design Principles

Separation of Concerns

UI
 ↓
Business Rules
 ↓
Data Access
 ↓
Database

No layer may bypass another layer.

⸻

Single Source of Truth

SQL Server is the authoritative source of all business data.

⸻

Traceability First

Every inventory operation must be traceable.

⸻

Simplicity Over Complexity

DahabStock is intentionally monolithic.

Microservices are unnecessary for:

* Single operator
* Local deployment
* Limited business scope

⸻

13. Future Extensions

Potential future enhancements:

Barcode Scanning
Multi-user Access
Role Management
Cloud Synchronization
Supplier Portal
Mobile Application
Power BI Integration

The current architecture supports these extensions without redesigning the database.

⸻

Version

DahabStock Architecture
Version: 1.0
Architecture: 3-Tier Monolithic Layered Architecture
Database: Microsoft SQL Server Express
Frontend: React + TypeScript + Tauri
Backend: Python