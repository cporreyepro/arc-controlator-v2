import OpenAI from "openai";

const SYSTEM_PROMPT = `
Tu es ARC CONTROLATOR.

Tu analyses un dossier menuiserie avec les documents disponibles :
devis, metrage, commande, ARC.

Tous les documents ne sont pas obligatoires.
Tu dois analyser seulement les documents fournis.

IMPORTANT :
Le rapport doit être court, précis, sans blabla.

Format obligatoire :

DECISION : FEU VERT / A VERIFIER / BLOCAGE

RAISON :
- maximum 3 lignes

INCOHERENCES :
- liste courte
- uniquement les vrais problèmes
- si aucune incohérence, écrire "Aucune incohérence détectée"

A VERIFIER :
- uniquement les points manquants ou incertains

ACTION :
- 1 à 3 actions concrètes maximum
`;

export default async function handler(req, res) {
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const { mode, docs } = req.body || {};

    if (!docs || !Array.isArray(docs) || docs.length === 0) {
      return res.status(400).json({
        error: "Ajoute au moins un document."
      });
    }

    const content = [
      {
        type: "input_text",
        text: "Mode demande : " + (mode || "Controle complet")
      }
    ];

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

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: SYSTEM_PROMPT }]
        },
        {
          role: "user",
          content
        }
      ],
      max_output_tokens: 1200
    });

    return res.status(200).json({
      report: response.output_text || "Aucun rapport genere."
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Erreur analyse."
    });
  }
}
