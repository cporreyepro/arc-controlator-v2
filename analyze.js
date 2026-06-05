import OpenAI from "openai";

const SYSTEM_PROMPT = `Tu es ARC CONTROLATOR, une IA spécialisée en contrôle de dossiers de menuiserie extérieure.
Tu compares 4 documents : devis client, fiche métrage, commande fournisseur, ARC fournisseur.

Objectif : détecter les incohérences pouvant créer une erreur de commande, fabrication, pose ou litige.

Contrôles obligatoires :
- dimensions largeur / hauteur
- quantités
- type de produit : fenêtre, porte, coulissant, volet, portail, pergola, etc.
- matière : PVC, ALU, bois
- couleur intérieure / extérieure
- type de vitrage
- sens d’ouverture
- type de pose prévu
- dormant, tapées, élargisseurs, habillages
- options vendues
- accessoires
- motorisation / solaire / filaire
- délais annoncés si visibles
- cohérence entre devis, métrage, commande et ARC

Règles :
- Ne jamais inventer une information.
- Si une information est absente, écrire : information non trouvée.
- Distinguer : critique / moyen / mineur.
- Si l’ARC ne correspond pas à la commande ou au métrage, écrire : NE PAS VALIDER ARC.
- Si la pose est réalisée par une autre équipe, signaler les points de méthode de pose à faire valider.
- Si tout semble cohérent, écrire : Validation possible sous réserve de contrôle humain final.

Format obligatoire :
1. Résumé du dossier
2. Tableau des points contrôlés
3. Incohérences critiques
4. Incohérences moyennes
5. Points manquants ou à confirmer
6. Décision recommandée : FEU VERT / À VÉRIFIER / BLOCAGE
7. Actions à faire avant validation`;

function makeFile(label, f){
  return {type:"input_file", filename:`${label}_${f.name}`, file_data:`data:${f.type || "application/octet-stream"};base64,${f.data}`};
}

export default async function handler(req, res) {
  if(req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée." });
  try{
    if(!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY manquante dans Vercel." });
    const { mode, files } = req.body || {};
    if(!files?.devis || !files?.metrage || !files?.commande || !files?.arc) return res.status(400).json({ error: "Les 4 documents sont obligatoires." });
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role:"system", content:[{ type:"input_text", text:SYSTEM_PROMPT }] },
        { role:"user", content:[
          { type:"input_text", text:`Mode demandé : ${mode || "Contrôle complet"}. Analyse dans l'ordre : devis, métrage, commande, ARC.` },
          makeFile("DEVIS", files.devis), makeFile("METRAGE", files.metrage), makeFile("COMMANDE", files.commande), makeFile("ARC", files.arc)
        ]}
      ],
      max_output_tokens: 3500
    });
    return res.status(200).json({ report: response.output_text || "Aucun rapport généré." });
  }catch(error){
    return res.status(500).json({ error: error.message || "Erreur analyse." });
  }
}
