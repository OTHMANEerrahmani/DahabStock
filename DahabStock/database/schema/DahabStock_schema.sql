-- Script de création de la base de données DahabStock
-- Création des tables dans le bon ordre pour respecter les clés étrangères

-- 1. Materiau (Table parente)
CREATE TABLE Materiau (
    MateriauID INT IDENTITY(1,1) PRIMARY KEY,
    Categorie NVARCHAR(50) NOT NULL -- 'Standard' ou 'Aluminium'
);

-- 2. ArticleStandard
CREATE TABLE ArticleStandard (
    MateriauID INT PRIMARY KEY FOREIGN KEY REFERENCES Materiau(MateriauID),
    Reference NVARCHAR(100) NOT NULL,
    Designation NVARCHAR(255) NOT NULL,
    PrixUnitaire FLOAT NOT NULL DEFAULT 0.0
);

-- 3. BarreAluminium
CREATE TABLE BarreAluminium (
    MateriauID INT PRIMARY KEY FOREIGN KEY REFERENCES Materiau(MateriauID),
    Reference NVARCHAR(100) NOT NULL,
    Designation NVARCHAR(255) NOT NULL,
    LongueurInitiale FLOAT NOT NULL DEFAULT 6.0,
    PrixParMetre FLOAT NOT NULL DEFAULT 0.0
);

-- 4. Fournisseur
CREATE TABLE Fournisseur (
    FournisseurID INT IDENTITY(1,1) PRIMARY KEY,
    Nom NVARCHAR(200) NOT NULL,
    Contact NVARCHAR(100) NULL,
    Telephone NVARCHAR(50) NULL,
    Email NVARCHAR(100) NULL,
    Adresse NVARCHAR(MAX) NULL
);

-- 5. BonReception
CREATE TABLE BonReception (
    BonReceptionID INT IDENTITY(1,1) PRIMARY KEY,
    FournisseurID INT NOT NULL FOREIGN KEY REFERENCES Fournisseur(FournisseurID),
    NumeroBR NVARCHAR(100) NOT NULL,
    DateImportation DATETIME NOT NULL DEFAULT GETDATE()
);

-- 6. LigneBonReception
CREATE TABLE LigneBonReception (
    LigneBRID INT IDENTITY(1,1) PRIMARY KEY,
    BonReceptionID INT NOT NULL FOREIGN KEY REFERENCES BonReception(BonReceptionID),
    MateriauID INT NOT NULL FOREIGN KEY REFERENCES Materiau(MateriauID),
    QuantiteRecue FLOAT NOT NULL,
    PrixAchat FLOAT NOT NULL
);

-- 7. StockPrincipal
CREATE TABLE StockPrincipal (
    MateriauID INT PRIMARY KEY FOREIGN KEY REFERENCES Materiau(MateriauID),
    Quantite INT NOT NULL DEFAULT 0
);

-- 8. Projet
CREATE TABLE Projet (
    ProjetID INT IDENTITY(1,1) PRIMARY KEY,
    CodeProjet NVARCHAR(50) NOT NULL,
    Statut NVARCHAR(50) NOT NULL DEFAULT 'En cours'
);

-- 9. Consommation
CREATE TABLE Consommation (
    ConsommationID INT IDENTITY(1,1) PRIMARY KEY,
    ProjetID INT NOT NULL FOREIGN KEY REFERENCES Projet(ProjetID),
    MateriauID INT NOT NULL FOREIGN KEY REFERENCES Materiau(MateriauID),
    DateOperation DATETIME NOT NULL DEFAULT GETDATE(),
    QuantiteUtilisee FLOAT NOT NULL DEFAULT 0,
    LongueurUtilisee FLOAT NOT NULL DEFAULT 0,
    ChuteID INT NULL, -- S'il s'agit d'une consommation depuis une chute existante
    Preneur NVARCHAR(100) NULL,
    SourceConsommation NVARCHAR(50) NOT NULL DEFAULT 'Nouveau' -- 'Nouveau' ou 'Chute'
);

-- 10. Chute
CREATE TABLE Chute (
    ChuteID INT IDENTITY(1,1) PRIMARY KEY,
    MateriauID INT NOT NULL FOREIGN KEY REFERENCES Materiau(MateriauID),
    LongueurRestante FLOAT NOT NULL,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    ConsommationSourceID INT NULL FOREIGN KEY REFERENCES Consommation(ConsommationID)
);

-- Mettre à jour la clé étrangère circulaire si nécessaire (Optionnel)
-- ALTER TABLE Consommation ADD CONSTRAINT FK_Cons_Chute FOREIGN KEY (ChuteID) REFERENCES Chute(ChuteID);

-- 11. Perte
CREATE TABLE Perte (
    PerteID INT IDENTITY(1,1) PRIMARY KEY,
    MateriauID INT NOT NULL FOREIGN KEY REFERENCES Materiau(MateriauID),
    QuantitePerdue FLOAT NOT NULL DEFAULT 0,
    LongueurPerdue FLOAT NOT NULL DEFAULT 0,
    Motif NVARCHAR(255) NULL,
    DateDeclaration DATETIME NOT NULL DEFAULT GETDATE()
);

-- 12. Mouvement (Historique global)
CREATE TABLE Mouvement (
    MouvementID INT IDENTITY(1,1) PRIMARY KEY,
    MateriauID INT NOT NULL FOREIGN KEY REFERENCES Materiau(MateriauID),
    TypeMouvement NVARCHAR(50) NOT NULL, -- 'Entree_Fournisseur', 'Consommation_Projet', 'Perte'
    Quantite FLOAT NOT NULL DEFAULT 0,
    Longueur FLOAT NOT NULL DEFAULT 0,
    DateMouvement DATETIME NOT NULL DEFAULT GETDATE(),
    ReferenceDocument NVARCHAR(100) NULL, -- Numéro BR
    ProjetID INT NULL FOREIGN KEY REFERENCES Projet(ProjetID),
    BonReceptionID INT NULL FOREIGN KEY REFERENCES BonReception(BonReceptionID),
    PerteID INT NULL FOREIGN KEY REFERENCES Perte(PerteID)
);
