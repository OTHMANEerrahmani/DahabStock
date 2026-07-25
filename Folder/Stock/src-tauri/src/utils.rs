pub fn format_sql_error(err: &str) -> String {
    if err.contains("Cannot insert duplicate key row") {
        if let (Some(obj_start), Some(obj_end)) = (err.find("object 'dbo."), err.find("' with unique index")) {
            let table = &err[obj_start + 12..obj_end];
            if let (Some(val_start), Some(val_end)) = (err.find("The duplicate key value is ("), err.find(").'")) {
                let value = &err[val_start + 28..val_end];
                match table {
                    "Materiau" => return format!("Cet élément avec le code / référence '{}' existe déjà dans le catalogue.", value),
                    "Projet" => return format!("Le projet avec le code '{}' existe déjà.", value),
                    "Fournisseur" => return format!("Le fournisseur '{}' existe déjà.", value),
                    _ => return format!("La valeur '{}' existe déjà.", value),
                }
            }
        }
        return "Erreur de doublon : cet élément existe déjà.".to_string();
    }
    err.to_string()
}
