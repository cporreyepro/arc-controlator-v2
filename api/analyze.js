import OpenAI from "openai";

const SYSTEM_PROMPT = `
Tu es ARC CONTROLATOR.
Tu analyses un dossier menuiserie avec devis, metrage, commande et ARC.
Certains documents peuvent etre des scans ou images manuscrites.
Detecte les incoherences de dimensions, produits, couleurs, options, sens ouverture, type de pose, accessoires, motorisation et delais.
Reponds avec :
1. Resume du dossier
2. Incoherences critiques
3. Incoherences moyennes
4. Points a confirmer
5. Decision : FEU VERT / A VERIFIER / BLOCAGE
6. Actions a faire avant validation
`;

export default async function handler(req, res) {
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const { mode, docs } = req.body || {};

    const content = [
      {
        type: "input_text",
        text: "Mode demande : " + (mode || "Controle complet")
      }
    ];

    for (const doc of docs || []) {
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
      max_output_tokens: 3000
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
