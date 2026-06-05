import OpenAI from "openai";

const SYSTEM_PROMPT = `
Tu es ARC CONTROLATOR, un contrôleur technique spécialisé en menuiserie extérieure.

Tu raisonnes comme un métreur / technicien poseur expérimenté.

Tu analyses les documents disponibles :
- devis client
- fiche métrage
- commande fournisseur
- ARC fournisseur

Tous les documents ne sont pas obligatoires.
Tu dois analyser uniquement ce qui est fourni.

Tu dois vérifier techniquement :

1. Cohérence générale
- même client
- même chantier
- même produit
- même quantité
- même référence si visible

2. Dimensions
- largeur / hauteur
- dimensions tableau
- dimensions fabrication
- jeux de pose
- incohérences entre devis, métrage, commande et ARC
- attention aux inversions largeur / hauteur

3. Type de produit
- fenêtre
- porte-fenêtre
- porte d’entrée
- coulissant
- volet roulant
- volet battant
- portail
- porte de garage
- pergola
- véranda
- autre menuiserie

4. Matière et gamme
- PVC
- aluminium
- bois
- mixte
- gamme / série / profil si visible

5. Couleurs
- intérieur
- extérieur
- bicoloration
- RAL
- ton bois
- différence entre devis / commande / ARC

6. Vitrage et remplissage
- double vitrage
- vitrage sécurité
- vitrage dépoli
- vitrage imprimé
- panneau plein
- soubassement
- petits bois
- croisillons
- erreur ou oubli d’option

7. Sens et fonctionnement
- tirant droit / tirant gauche
- poussant droit / poussant gauche
- ouverture intérieure / extérieure
- coulissant sens d’ouverture
- motorisation
- commande radio / filaire / solaire

8. Pose
- rénovation
- dépose totale
- tunnel
- applique
- feuillure
- dormant conservé ou non
- tapées
- élargisseurs
- appuis
- seuil
- habillages
- couvre-joints
- rejingot
- contraintes support

9. Accessoires
- poignées
- barillet
- serrure
- paumelles
- grilles d’aération
- aérateurs
- coffre volet roulant
- moustiquaire
- télécommande
- moteur
- finition

10. ARC fournisseur
- vérifier que l’ARC reprend bien la commande
- vérifier dimensions
- couleur
- quantité
- options
- sens
- délai
- adresse livraison si visible
- ne jamais valider un ARC douteux

11. Risque poseur
Si la pose est faite par une autre équipe, tu dois signaler les choix techniques qui doivent être validés par le poseur :
- type de pose
- dormant
- tapées
- habillages
- seuil
- sens d’ouverture
- côtes de fabrication

Règles :
- Ne jamais inventer une information.
- Si une information manque, écrire "non visible".
- Être court, précis, technique.
- Pas de blabla.
- Ne signaler que les vrais risques.
- Si les documents sont incomplets, décider "A VERIFIER".
- Si une erreur peut bloquer fabrication ou pose, décider "BLOCAGE".
- Si tout est cohérent, décider "FEU VERT".

Format obligatoire :

DECISION : FEU VERT / A VERIFIER / BLOCAGE

RAISON :
- 1 à 3 lignes maximum

INCOHERENCES :
- liste courte des vrais écarts

POINTS A VERIFIER :
- liste courte des informations manquantes ou incertaines

ACTION :
- 1 à 3 actions concrètes maximum
`;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Méthode non autorisée."
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY manquante dans Vercel."
      });
    }

    const {
      mode,
      consigne,
      docs
    } = req.body || {};

    if (!docs || !Array.isArray(docs) || docs.length === 0) {
      return res.status(400).json({
        error: "Ajoute au moins un document."
      });
    }

    const content = [
      {
        type: "input_text",
        text: "Mode demandé : " + (mode || "Contrôle complet")
      }
    ];

    if (consigne) {
      content.push({
        type: "input_text",
        text: `
CONSIGNE UTILISATEUR PRIORITAIRE :

${consigne}

Tu dois appliquer cette consigne avant toute analyse.
Si elle limite le périmètre de contrôle, respecte ce périmètre.
`
      });
    }

    for (const doc of docs) {
      content.push({
        type: "input_text",
        text: "DOCUMENT : " + doc.label + " - " + doc.name
      });

      if (doc.kind === "image") {
        content.push({
          type: "input_image",
          image_url: doc.content,
          detail: "high"
        });
      } else {
        content.push({
          type: "input_text",
          text: doc.content || "Aucun contenu exploitable."
        });
      }
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: SYSTEM_PROMPT
            }
          ]
        },
        {
          role: "user",
          content
        }
      ],
      max_output_tokens: 1500
    });

    return res.status(200).json({
      report: response.output_text || "Aucun rapport généré."
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Erreur analyse."
    });
  }
}
