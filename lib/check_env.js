const check_env = () => {
    if(process.env.keycloakIssuer == "" || process.env.keycloakIssuer == undefined){ // Preverjamo, ali je uporabnik nastavil vrednosti v .ENV datoteki
        console.error(cas(),'Napaka: V .env datoteki ni natavljena vrednost za keycloakIssuer.'); // Sporočilo z napako
        process.exit(1); // Izhod z napako
    }
    if(process.env.client_id == "" || process.env.client_id == undefined){
        console.error(cas(),'Napaka: V .env datoteki ni natavljena vrednost za client_id.');
        process.exit(1); 
    }
    if(process.env.client_secret == "" || process.env.client_secret == undefined){
        console.error(cas(),'Napaka: V .env datoteki ni natavljena vrednost za client_secret.');
        process.exit(1); 
    }
    if(process.env.redirect_uris == "" || process.env.redirect_uris == undefined){
        console.error(cas(),'Napaka: V .env datoteki ni natavljena vrednost za redirect_uris.');
        process.exit(1); 
    }
    if(process.env.post_logout_redirect_uris == "" || process.env.post_logout_redirect_uris == undefined){
        console.error(cas(),'Napaka: V .env datoteki ni natavljena vrednost za post_logout_redirect_uris.');
        process.exit(1); 
    }
    
    
    if(process.env.cookie_secret == "" || process.env.cookie_secret == undefined){
        console.error(cas(),'Napaka: V .env datoteki ni natavljena vrednost za cookie_secret.');
        process.exit(1); 
    }
    if(process.env.domain == ""|| process.env.domain == undefined){
        console.error(cas(),'Napaka: V .env datoteki ni natavljena vrednost za domain.');
        process.exit(1); 
    }
    if(process.env.port == ""|| process.env.port == undefined){
        console.error(cas(),'Napaka: V .env datoteki ni natavljena vrednost za port.');
        process.exit(1); 
    }
    if(process.env.protocol == ""|| process.env.protocol == undefined){
        console.error(cas(),'Napaka: V .env datoteki ni natavljena vrednost za protocol.');
        process.exit(1); 
    }
    
    function cas() {
        const now = new Date();
        const date = now.toISOString().slice(0, 10);
        const time = now.toTimeString().slice(0, 8);
        return `${date} ${time}`;
    }

}

export { check_env };