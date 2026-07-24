-- Script de création de la base de données DahabStock
-- Création des tables dans le bon ordre pour respecter les clés étrangères

-- 1. Materiau
CREATE TABLE Materiau (
    MateriauID INT IDENTITY(1,1) PRIMARY KEY,
    Designation NVARCHAR(50) NOT NULL,
    Reference NVARCHAR(255) NOT NULL
);

-- 2. ArticleStandard
CREATE TABLE ArticleStandard (
    MateriauID INT PRIMARY KEY FOREIGN KEY REFERENCES Materiau(MateriauID),
    PrixUnitaire DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    Categorie NVARCHAR(100) NULL
);

-- 3. BarreAluminium
CREATE TABLE BarreAluminium (
    MateriauID INT PRIMARY KEY FOREIGN KEY REFERENCES Materiau(MateriauID),
    Longueur DECIMAL(18,2) NOT NULL DEFAULT 6.0,
    Couleur NVARCHAR(50) NOT NULL,
    PrixParMetre DECIMAL(18,2) NOT NULL DEFAULT 0.0
);

-- 4. Fournisseur
CREATE TABLE Fournisseur (
    FournisseurID INT IDENTITY(1,1) PRIMARY KEY,
    Nom NVARCHAR(50) NOT NULL
);

-- 5. BonReception
CREATE TABLE BonReception (
    BonReceptionID INT IDENTITY(1,1) PRIMARY KEY,
    FournisseurID INT NOT NULL FOREIGN KEY REFERENCES Fournisseur(FournisseurID),
    NumeroBR NVARCHAR(100) NULL,
    DateImportation DATETIME2 NOT NULL DEFAULT GETDATE(),
    Statut NVARCHAR(20) NOT NULL DEFAULT 'Validé'
);

-- 6. LigneBonReception
CREATE TABLE LigneBonReception (
    LigneBRID INT IDENTITY(1,1) PRIMARY KEY,
    BonReceptionID INT NOT NULL FOREIGN KEY REFERENCES BonReception(BonReceptionID),
    MateriauID INT NOT NULL FOREIGN KEY REFERENCES Materiau(MateriauID),
    QuantiteRecue DECIMAL(18,2) NOT NULL,
    PrixAchat DECIMAL(18,2) NOT NULL
);

-- 7. StockPrincipal
CREATE TABLE StockPrincipal (
    StockPrincipalID INT IDENTITY(1,1) PRIMARY KEY,
    MateriauID INT NOT NULL FOREIGN KEY REFERENCES Materiau(MateriauID),
    QuantiteDisponible INT NOT NULL DEFAULT 0,
    Statut NVARCHAR(20) NOT NULL DEFAULT 'Actif'
);

-- 8. Projet
CREATE TABLE Projet (
    ProjetID INT IDENTITY(1,1) PRIMARY KEY,
    CodeProjet INT NOT NULL,
    Statut NVARCHAR(50) NOT NULL DEFAULT 'En cours',
    CodeClient NVARCHAR(100) NULL
);

-- 9. Consommation
CREATE TABLE Consommation (
    ConsommationID INT IDENTITY(1,1) PRIMARY KEY,
    ProjetID INT NOT NULL FOREIGN KEY REFERENCES Projet(ProjetID),
    MateriauID INT NOT NULL FOREIGN KEY REFERENCES Materiau(MateriauID),
    SourceConsommation NVARCHAR(20) NOT NULL,
    DateOperation DATETIME2 NOT NULL DEFAULT GETDATE(),
    QuantiteUtilisee DECIMAL(18,2) NULL,
    LongueurUtilisee DECIMAL(18,2) NULL,
    ChuteID INT NULL,
    Preneur NVARCHAR(255) NULL
);

-- 10. StockChutes
CREATE TABLE StockChutes (
    ChuteID INT IDENTITY(1,1) PRIMARY KEY,
    MateriauID INT NOT NULL FOREIGN KEY REFERENCES Materiau(MateriauID),
    LongueurRestante DECIMAL(18,2) NOT NULL,
    DateCreation DATETIME2 NOT NULL DEFAULT GETDATE(),
    Statut NVARCHAR(20) NOT NULL DEFAULT 'Disponible'
);

-- 11. Perte
CREATE TABLE Perte (
    PerteID INT IDENTITY(1,1) PRIMARY KEY,
    MateriauID INT NOT NULL FOREIGN KEY REFERENCES Materiau(MateriauID),
    SourceStock NVARCHAR(20) NOT NULL,
    DateDeclaration DATETIME2 NOT NULL DEFAULT GETDATE(),
    Raison NVARCHAR(255) NOT NULL,
    QuantitePerdue INT NOT NULL DEFAULT 0
);

-- 12. MouvementStock
CREATE TABLE MouvementStock (
    MouvementID INT IDENTITY(1,1) PRIMARY KEY,
    MateriauID INT NOT NULL FOREIGN KEY REFERENCES Materiau(MateriauID),
    TypeMouvement NVARCHAR(30) NOT NULL,
    DateMouvement DATETIME2 NOT NULL DEFAULT GETDATE(),
    Quantite DECIMAL(18,2) NOT NULL,
    ReferenceOperation NVARCHAR(100) NULL,
    ConsommationID INT NULL FOREIGN KEY REFERENCES Consommation(ConsommationID),
    BonReceptionID INT NULL FOREIGN KEY REFERENCES BonReception(BonReceptionID),
    PerteID INT NULL FOREIGN KEY REFERENCES Perte(PerteID)
);
