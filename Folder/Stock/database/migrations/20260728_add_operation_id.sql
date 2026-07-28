-- Script pour ajouter la colonne OperationID à la table Consommation
-- Cette colonne permet de regrouper les historiques d'une même opération (même clic de confirmation)

ALTER TABLE Consommation
ADD OperationID NVARCHAR(50) NULL;
GO
