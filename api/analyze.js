```javascript
import OpenAI from "openai";

const SYSTEM_PROMPT = `
Tu es ARC CONTROLATOR, une IA spécialisée en contrôle de dossiers de menuiserie extérieure.
Tu compares 4 documents : devis client, fiche métrage, commande fournisseur, ARC fournisseur.

Objectif :
Détecter les incohérences pouvant créer une erreur de commande, fabrication, pose ou litige.
`;

function makeFile(label, f){
  return {
    type:"input_file",
    filename:`${label}_${f.name}`,
    file_data:`data:${f.type || "application/octet-stream"};base64,${f.data}`
  };
}

export default async function handler(req, res) {

  if(req.method !== "POST"){
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  try{

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const { mode, files } = req.body;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role:"system",
          content:[
            {
              type:"input_text",
              text:SYSTEM_PROMPT
            }
          ]
        },
        {
          role:"user",
          content:[
            {
              type:"input_text",
              text:`Mode demandé : ${mode}`
            },

            makeFile("DEVIS", files.devis),
            makeFile("METRAGE", files.metrage),
            makeFile("COMMANDE", files.commande),
            makeFile("ARC", files.arc)
          ]
        }
      ],
      max_output_tokens: 3000
    });

    return res.status(200).json({
      report: response.output_text
    });

  } catch(error){

    return res.status(500).json({
      error: error.message
    });

  }
}
```
