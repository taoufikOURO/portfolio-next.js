export interface Profile {
    nom: string;
    prenom: string;
    email: string;
    titreProfessionnel: string;
    bio: string;
    aPropos: string;
    cv: string;
    liens: {
        github: string;
        linkedin: string;
    };
    photo: string;
}

export interface Technology {
    name: string;
    icon: string;
}

export interface Project {
    id: number;
    titre: string;
    description: string;
    estPublie: boolean;
    lien?: string;
    image: string;
    stack: Technology[];
    slug?: string;
    github?: string;
}

export interface Formation {
    intitule: string;
    description: string;
    debut: string;
    fin?: string;
    etablissement: string;
    lieu: string;
    mention?: string;
    moyenne?: string;
    competences: string[];
}
